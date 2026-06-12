from contextlib import asynccontextmanager
import httpx
from fastapi import FastAPI
import os
import hashlib
import asyncio

from backend.config import get_config
from backend.models import (  # noqa: F401 — registers all models with Base
    Task, Platform, TaskArtifact, WorkSession, HealthEvent, Rule, RuleLog, Hyperparameter
)
from backend.routers import (
    health_check, tasks, queue, session, health_signals, hyperparameters, frontend
)


FRONTEND_STATIC = "/app/frontend/static"


async def register_with_orchestrator(config) -> None:
    """Register panel with orchestrator on startup.
    Non-fatal if orchestrator is temporarily unreachable — will be retried
    next restart. Dashboard shows unverified until registration succeeds.
    """
    panel_path = os.path.join(FRONTEND_STATIC, "panel.js")
    if not os.path.exists(panel_path):
        print("[task-management] Panel frontend not found — skipping registration")
        return

    with open(panel_path, "rb") as f:
        content = f.read()
    checksum = "sha256:" + hashlib.sha256(content).hexdigest()
    service_token=config.service_token
    manifest = {
        "panel_id":          "task_management",
        "display_name":      "Task Management",
        "version":           config.panel_version,
        "service_url":       config.service_url,
        "health_endpoint":   "/health",
        "frontend_endpoint": "/",
        "frontend_checksum": checksum,
        "api_base":          "/api",
        "publishes":         [],
        "subscribes":        [],
        "focus_components":  [
            {
                "component_id": "task_focus",
                "priority":     1,
                "endpoint":     "/foc"
            }
        ],
    }
    print(f"[task-management] Manifest: {manifest}", flush=True)
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{config.orchestrator_url}/panels/register",
                json=manifest,
                headers={"Authorization": f"Bearer {config.service_token}"},
            )
            print(f"[task-management] Registration response: {resp.status_code} {resp.text}", flush=True)
    except Exception as e:
        import traceback
        print(f"[task-management] Registration exception: {e}", flush=True)
        traceback.print_exc()

async def _register_background(config):
    await asyncio.sleep(2)
    await register_with_orchestrator(config)

@asynccontextmanager
async def lifespan(app: FastAPI):
    config = get_config()
    asyncio.create_task(_register_background(config))
    yield


app = FastAPI(
    title="Union Task Management",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
    lifespan=lifespan,
)

app.include_router(health_check.router)
app.include_router(tasks.router)
app.include_router(queue.router)
app.include_router(session.router)
app.include_router(health_signals.router)
app.include_router(hyperparameters.router)
app.include_router(frontend.router)
