from contextlib import asynccontextmanager
import httpx
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
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

# In-memory service token singleton — persists for the lifetime of the process
_service_token: str | None = None


def get_service_token() -> str | None:
    return _service_token


async def register_with_orchestrator(config) -> None:
    """
    Two-step registration:
    1. Register service with orchestrator → receive service token
    2. Register panel with dashboard using service token

    Non-fatal — dashboard shows panel as unverified until registration succeeds.
    Retried on next restart.
    """
    global _service_token

    # Step 1 — Service registration with orchestrator
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{config.orchestrator_url}/services/register",
                json={
                    "service_id":      "task_management",
                    "service_url":     config.service_url,
                    "health_endpoint": "/health",
                },
                headers={"x-service-token": _service_token or ""},
            )
            if resp.status_code in (200, 201):
                data = resp.json()
                _service_token = data["service_token"]
                print(f"[task-management] Service registered with orchestrator", flush=True)
            else:
                print(f"[task-management] Service registration failed: {resp.status_code} {resp.text}", flush=True)
                return
    except Exception as e:
        print(f"[task-management] Orchestrator unreachable at startup: {e}", flush=True)
        return

    # Step 2 — Panel registration with dashboard
    panel_path = os.path.join(FRONTEND_STATIC, "panel.js")
    if not os.path.exists(panel_path):
        print("[task-management] Panel frontend not found — skipping panel registration", flush=True)
        return

    with open(panel_path, "rb") as f:
        content = f.read()
    checksum = "sha256:" + hashlib.sha256(content).hexdigest()

    manifest = {
        "panel_id":          "task_management",
        "display_name":      "Task Management",
        "version":           config.panel_version,
        "service_url":       config.service_url,
        "health_endpoint":   "/health",
        "frontend_endpoint": "/panel.js",
        "frontend_checksum": checksum,
        "api_base":          "/api",
        "publishes":         [],
        "subscribes":        [],
        "focus_components":  [
            {
                "component_id": "task_focus",
                "priority":     1,
                "endpoint":     "/focus/active_task.js",
            }
        ],
        "required_role":     "owner",
        "metadata":          {},
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{config.dashboard_url}/api/panels/register",
                json=manifest,
                headers={
                    "x-service-token": _service_token,
                    "x-service-id":    "task_management",
                },
            )
            print(f"[task-management] Panel registration: {resp.status_code} {resp.text}", flush=True)
    except Exception as e:
        print(f"[task-management] Dashboard unreachable at panel registration: {e}", flush=True)


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

# Serve panel Web Component and static assets
static_path = "/app/frontend/static"
if os.path.exists(static_path):
    app.mount("/static", StaticFiles(directory=static_path), name="static")

    @app.get("/panel.js")
    async def serve_panel():
        return FileResponse(f"{static_path}/panel.js", media_type="application/javascript")

    @app.get("/focus/active_task.js")
    async def serve_focus_active_task():
        path = f"{static_path}/focus/active_task.js"
        if not os.path.exists(path):
            from fastapi.responses import Response
            return Response(status_code=404)
        return FileResponse(path, media_type="application/javascript")
