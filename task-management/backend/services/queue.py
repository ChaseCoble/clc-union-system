"""Queue service.

recompute() is the single entry point for producing the queue.
It never queries DB directly for its sorting logic — takes task list as input.
"""

from datetime import datetime, timezone
from sqlalchemy.orm import Session

from backend.models.task import Task
from backend.models.enums import TaskStatus, BlockType
from backend.services.queue_rules import run_pipeline
from backend.services.hyperparameters import get_all as get_all_hp
from backend.services.health import emit_signal


def resolve_date_blocks(db: Session) -> int:
    """Eager resolution on session activation: unblock DATE-blocked tasks past due."""
    now = datetime.now(timezone.utc)
    tasks = db.query(Task).filter(
        Task.status == TaskStatus.BLOCKED,
        Task.block_type == BlockType.DATE,
        Task.block_until <= now,
    ).all()
    for task in tasks:
        task.status = TaskStatus.QUEUED
        task.block_type = None
        task.block_until = None
    if tasks:
        db.commit()
    return len(tasks)


def resolve_timer_blocks(db: Session) -> int:
    """Polling resolution during session: unblock TIMER-blocked tasks past due."""
    return resolve_date_blocks(db)   # same logic, different trigger


def resolve_task_blocks(completed_task_id: str, db: Session) -> int:
    """Synchronous resolution on task completion: unblock waiting tasks."""
    completed = db.query(Task).filter(Task.id == completed_task_id).first()
    if not completed:
        return 0

    waiting = db.query(Task).filter(
        Task.status == TaskStatus.BLOCKED,
        Task.block_type == BlockType.TASK,
        Task.block_task_id == completed_task_id,
    ).all()

    unblocked = 0
    for task in waiting:
        required = task.block_task_status_required
        if required is None or completed.status == required:
            task.status = TaskStatus.QUEUED
            task.block_type = None
            task.block_task_id = None
            task.block_task_status_required = None
            unblocked += 1

    if unblocked:
        db.commit()
    return unblocked


def recompute(tasks: list[Task], mode: str, db: Session) -> list[Task]:
    """Produce the current queue.

    Args:
        tasks: All candidate tasks — caller fetches them, we filter.
        mode:  Current WorkMode string.
        db:    Session — used for hyperparameter reads only.

    Returns:
        Ordered list of tasks with urgency stripped.
    """
    hp = get_all_hp(db)

    def health_fn(signal_name: str, value: float, task_id: str | None = None) -> None:
        emit_signal(signal_name, value, db, task_id=task_id)

    context = {
        "mode":      mode,
        "db":        db,
        "hp":        hp,
        "health_fn": health_fn,
    }
    return run_pipeline(tasks, context)
