from contextlib import asynccontextmanager
import httpx
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import hashlib

from backend.config import get_config
from backend.models import (  # noqa: F401 — registers all models with Base
    Task, Platform, TaskArtifact, WorkSession, HealthEvent, Rule, RuleLog, Hyperparameter
)
from backend.routers import (
    health_check, tasks, queue, session, health_signals, hyperparameters
)


async def register_with_orchestrator(config) -> None:
    """Register panel with orchestrator on startup.
    Non-fatal if orchestrator is temporarily unreachable — will be retried
    next restart. Dashboard shows unverified until registration succeeds.
    """
    frontend_path = "/app/static/panel.js"
    if not os.path.exists(frontend_path):
        print("[task-management] Panel frontend not found — skipping registration")
        return

    with open(frontend_path, "rb") as f:
        content = f.read()
    checksum = "sha256:" + hashlib.sha256(content).hexdigest()

    manifest = {
        "panel_id":           "task_management",
        "display_name":       "Task Management",
        "version":            config.panel_version,
        "service_url":        config.service_url,
        "health_endpoint":    "/health",
        "frontend_endpoint":  "/panel.js",
        "frontend_checksum":  checksum,
        "api_base":           "/api",
        "publishes":          [],
        "subscribes":         [],
        "focus_components":   [],
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{config.orchestrator_url}/panels/register",
                json=manifest,
            )
            if resp.status_code in (200, 201):
                print(f"[task-management] Panel registered: {resp.json()}")
            else:
                print(f"[task-management] Registration failed: {resp.status_code} {resp.text}")
    except httpx.RequestError as e:
        print(f"[task-management] Orchestrator unreachable at startup: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    config = get_config()
    await register_with_orchestrator(config)
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

# Serve panel Web Component and static assets
static_path = "/app/static"
if os.path.exists(static_path):
    app.mount("/static", StaticFiles(directory=static_path), name="static")

    @app.get("/panel.js")
    async def serve_panel():
        return FileResponse(f"{static_path}/panel.js", media_type="application/javascript")
