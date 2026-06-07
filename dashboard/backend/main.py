from contextlib import asynccontextmanager
from fastapi import FastAPI
from backend.config import get_config
from backend.models import tab, focus_cache, ui_state  # noqa: F401
from backend.routers import health, tabs, focus, ui, auth
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import os

@asynccontextmanager
async def lifespan(app: FastAPI):
    get_config()
    yield


app = FastAPI(
    title="Union Dashboard",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
    lifespan=lifespan,
)

app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(tabs.router)
app.include_router(focus.router)
app.include_router(ui.router)

static_path = "/app/static"
if os.path.exists(static_path):
    app.mount("/assets", StaticFiles(directory=f"{static_path}/assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
         return FileResponse(f"{static_path}/index.html")
