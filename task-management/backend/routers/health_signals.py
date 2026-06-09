from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.health import HealthEvent
from backend.models.session import WorkSession
from backend.schemas.health import HealthSignalResponse, UserReportRequest
from backend.services.auth import get_current_user
from backend.services.health import emit_user_report
from fastapi import HTTPException

router = APIRouter(prefix="/api/health", tags=["health"])


@router.get("/signals", response_model=list[HealthSignalResponse])
async def get_signals(
    limit: int = Query(default=50, le=200),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    return (
        db.query(HealthEvent)
        .order_by(HealthEvent.created_at.desc())
        .limit(limit)
        .all()
    )


@router.get("/log", response_model=list[HealthSignalResponse])
async def get_health_log(
    unacknowledged_only: bool = Query(default=False),
    limit: int = Query(default=100, le=500),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    q = db.query(HealthEvent).order_by(HealthEvent.created_at.desc())
    if unacknowledged_only:
        q = q.filter(HealthEvent.flags["acknowledged"].as_boolean() == False)  # noqa: E712
    return q.limit(limit).all()


@router.post("/report", response_model=list[HealthSignalResponse])
async def user_report(
    payload: UserReportRequest,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    invalid = set(payload.signals) - UserReportRequest.VALID_SIGNALS
    if invalid:
        raise HTTPException(status_code=400, detail=f"Invalid signals: {invalid}")

    # Attach to current session if one is active
    active = db.query(WorkSession).filter(WorkSession.ended_at.is_(None)).first()
    session_id = active.id if active else None

    return emit_user_report(payload.signals, db, session_id=session_id)
