from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.task import Task
from backend.models.enums import TaskStatus, WorkMode, compute_difficulty
from backend.schemas.task import TaskResponse
from backend.services.auth import get_current_user
from backend.services.queue import recompute as run_recompute

router = APIRouter(prefix="/api/queue", tags=["queue"])


def _enrich(task: Task) -> TaskResponse:
    label, ordinal = compute_difficulty(task.enjoyability, task.work_type)
    data = TaskResponse.model_validate(task)
    data.difficulty_label = label
    data.difficulty_ordinal = ordinal
    return data


@router.get("", response_model=list[TaskResponse])
async def get_queue(
    mode: str = Query(default=WorkMode.DEEP_WORK),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """Return the current ordered queue for the given mode."""
    candidate_tasks = (
        db.query(Task)
        .filter(Task.status != TaskStatus.COMPLETE)
        .order_by(Task.bucket, Task.urgency.desc())
        .all()
    )
    queued = run_recompute(candidate_tasks, mode, db)
    return [_enrich(t) for t in queued]


@router.post("/recompute", response_model=list[TaskResponse])
async def recompute_queue(
    mode: str = Query(default=WorkMode.DEEP_WORK),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """Force recompute and return the refreshed queue."""
    candidate_tasks = (
        db.query(Task)
        .filter(Task.status != TaskStatus.COMPLETE)
        .order_by(Task.bucket, Task.urgency.desc())
        .all()
    )
    queued = run_recompute(candidate_tasks, mode, db)
    return [_enrich(t) for t in queued]
