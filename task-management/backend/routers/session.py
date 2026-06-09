from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.schemas.session import SessionResponse, SessionEndRequest
from backend.schemas.task import TaskResponse
from backend.models.enums import compute_difficulty
from backend.models.task import Task
from backend.services.auth import get_current_user
from backend.services.session_manager import SessionManager

router = APIRouter(prefix="/api/session", tags=["session"])


def _enrich_task(task: Task) -> TaskResponse:
    label, ordinal = compute_difficulty(task.enjoyability, task.work_type)
    data = TaskResponse.model_validate(task)
    data.difficulty_label = label
    data.difficulty_ordinal = ordinal
    return data


@router.get("/current", response_model=SessionResponse | None)
async def get_current_session(
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    sm = SessionManager(db)
    return sm.get_current()


@router.post("/start", response_model=SessionResponse)
async def start_session(
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    sm = SessionManager(db)
    return sm.start()


@router.post("/end", response_model=SessionResponse)
async def end_session(
    payload: SessionEndRequest,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    sm = SessionManager(db)
    current = sm.get_current()
    if not current:
        raise HTTPException(status_code=404, detail="No active session")
    return sm.end(current.id, payload.active_minutes, payload.break_minutes)


@router.get("/timers/pending", response_model=list[TaskResponse])
async def get_pending_timers(
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    sm = SessionManager(db)
    tasks = sm.get_pending_timers()
    return [_enrich_task(t) for t in tasks]
