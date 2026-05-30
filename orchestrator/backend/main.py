from contextlib import asynccontextmanager
from fastapi import FastAPI
from backend.config import get_config
from backend.database import get_engine, Base

# Import models so Base knows about them before create_all
from backend.models import user, panel, layout  # noqa: F401

from backend.routers import auth, panels, layout as layout_router, health


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Validate config on startup — fails hard if S-tier not mounted
    config = get_config()

    yield
    # Shutdown — nothing to clean up in V1


app = FastAPI(
    title="Union Orchestrator",
    version="1.0.0",
    docs_url=None,   # No external docs exposure
    redoc_url=None,
    lifespan=lifespan,
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(panels.router)
app.include_router(layout_router.router)
