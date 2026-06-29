from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.task import Task
from backend.models.enums import TaskStatus, WorkMode, compute_difficulty
from backend.schemas.task import TaskResponse, ForbiddenTaskResponse
from backend.services.auth import get_current_user
from backend.services.queue import recompute as run_recompute
from backend.services.queue_rules import run_pipeline_with_drops
from backend.services.hyperparameters import get_all as get_all_hp
from backend.services.health import emit_signal

router = APIRouter(prefix="/api/queue", tags=["queue"])

HIGH_URGENCY_THRESHOLD = 7.0  # Earmarked: move to hyperparameters


def _enrich(task: Task) -> TaskResponse:
    label, ordinal = compute_difficulty(task.enjoyability, task.work_type)
    data = TaskResponse.model_validate(task)
    data.difficulty_label = label
    data.difficulty_ordinal = ordinal
    return data


def _build_context(mode: str, db: Session) -> dict:
    hp = get_all_hp(db)
    def health_fn(signal_name, value, task_id=None):
        emit_signal(signal_name, value, db, task_id=task_id)
    return {"mode": mode, "db": db, "hp": hp, "health_fn": health_fn}


def _get_forbidden_with_log(
    db: Session,
    mode: str,
    min_urgency: float | None = None,
    due_within_days: int | None = None,
) -> tuple[list[Task], dict[str, str]]:
    """Run pipeline, return (forbidden_tasks, drop_log).
    Excludes mounted tasks — they are manual overrides, not gated.
    """
    candidate_tasks = (
        db.query(Task)
        .filter(Task.status == TaskStatus.QUEUED)
        .order_by(Task.bucket, Task.urgency.desc())
        .all()
    )
    context = _build_context(mode, db)
    queued, drop_log = run_pipeline_with_drops(candidate_tasks, context)
    queued_ids = {t.id for t in queued}

    forbidden = []
    for t in candidate_tasks:
        if t.id in queued_ids:
            continue
        if t.mounted:
            continue  # mounted tasks are overrides — don't show as gated
        if min_urgency is not None or due_within_days is not None:
            urgency_ok = (t.urgency_base or 0) >= (min_urgency or 999)
            due_ok = False
            if due_within_days is not None and t.due_date:
                cutoff = datetime.now(timezone.utc) + timedelta(days=due_within_days)
                due_ok = t.due_date <= cutoff
            if not (urgency_ok or due_ok):
                continue
        forbidden.append(t)

    return forbidden, drop_log


def _to_forbidden_response(t: Task, drop_log: dict) -> ForbiddenTaskResponse:
    label, ordinal = compute_difficulty(t.enjoyability, t.work_type)
    return ForbiddenTaskResponse(
        id=t.id,
        platform_id=t.platform_id,
        title=t.title,
        description=t.description,
        work_type=t.work_type,
        enjoyability=t.enjoyability,
        status=t.status,
        bucket=t.bucket,
        block_type=t.block_type,
        block_until=t.block_until,
        block_task_id=t.block_task_id,
        due_date=t.due_date,
        estimated_duration=t.estimated_duration,
        actual_duration=t.actual_duration,
        queue_tier=t.queue_tier,
        mounted=t.mounted,
        created_at=t.created_at,
        completed_at=t.completed_at,
        artifacts=t.artifacts,
        difficulty_label=label,
        difficulty_ordinal=ordinal,
        drop_reason=drop_log.get(t.id, "Unknown rule"),
    )


def _run_queue(candidate_tasks: list[Task], mode: str, db: Session) -> list[Task]:
    """Run pipeline and always include mounted tasks in the result."""
    queued = run_recompute(candidate_tasks, mode, db)
    queued_ids = {t.id for t in queued}
    # Mounted tasks bypass the pipeline — always surface them
    mounted = [t for t in candidate_tasks if t.mounted and t.id not in queued_ids]
    return queued + mounted


@router.get("", response_model=list[TaskResponse])
async def get_queue(
    mode: str = Query(default=WorkMode.DEEP_WORK),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """Return the current ordered queue for the given mode.
    Always includes mounted tasks regardless of pipeline output.
    """
    candidate_tasks = (
        db.query(Task)
        .filter(Task.status != TaskStatus.COMPLETE)
        .order_by(Task.bucket, Task.urgency.desc())
        .all()
    )
    result = _run_queue(candidate_tasks, mode, db)
    return [_enrich(t) for t in result]


@router.post("/recompute", response_model=list[TaskResponse])
async def recompute_queue(
    mode: str = Query(default=WorkMode.DEEP_WORK),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """Force recompute and return the refreshed queue.
    Always includes mounted tasks regardless of pipeline output.
    """
    candidate_tasks = (
        db.query(Task)
        .filter(Task.status != TaskStatus.COMPLETE)
        .order_by(Task.bucket, Task.urgency.desc())
        .all()
    )
    result = _run_queue(candidate_tasks, mode, db)
    return [_enrich(t) for t in result]


@router.get("/forbidden", response_model=list[ForbiddenTaskResponse])
async def get_forbidden_tasks(
    mode: str = Query(default=WorkMode.DEEP_WORK),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """All QUEUED tasks dropped by the rule pipeline, paginated.
    Excludes mounted tasks.
    """
    forbidden, drop_log = _get_forbidden_with_log(db, mode)
    start = (page - 1) * limit
    return [_to_forbidden_response(t, drop_log) for t in forbidden[start:start + limit]]


@router.get("/forbidden/urgent", response_model=list[ForbiddenTaskResponse])
async def get_urgent_forbidden_tasks(
    mode: str = Query(default=WorkMode.DEEP_WORK),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """Forbidden tasks with urgency >= 7.0 or due within 30 days.
    Earmarked: move threshold to hyperparameters.
    """
    forbidden, drop_log = _get_forbidden_with_log(
        db, mode, min_urgency=HIGH_URGENCY_THRESHOLD, due_within_days=30
    )
    start = (page - 1) * limit
    return [_to_forbidden_response(t, drop_log) for t in forbidden[start:start + limit]]


@router.get("/count/forbidden", response_model=dict)
async def count_forbidden(
    mode: str = Query(default=WorkMode.DEEP_WORK),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """Returns counts for tray badge: total forbidden and urgent forbidden."""
    all_forbidden, _ = _get_forbidden_with_log(db, mode)
    urgent_forbidden, _ = _get_forbidden_with_log(
        db, mode, min_urgency=HIGH_URGENCY_THRESHOLD, due_within_days=30
    )
    return {"total": len(all_forbidden), "urgent": len(urgent_forbidden)}
