from fastapi import APIRouter
from datetime import datetime, timezone
from backend.services.orchestrator import orchestrator_reachable

router = APIRouter(tags=["health"])


@router.get("/health")
async def health():
    orchestrator_up = await orchestrator_reachable()
    return {
        "status": "ok",
        "service": "dashboard",
        "orchestrator_reachable": orchestrator_up,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
