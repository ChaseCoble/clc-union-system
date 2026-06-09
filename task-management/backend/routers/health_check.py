from fastapi import APIRouter
from datetime import datetime, timezone

router = APIRouter(tags=["health"])


@router.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "task-management",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
