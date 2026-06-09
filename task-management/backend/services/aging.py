from datetime import datetime, timezone
from sqlalchemy.orm import Session
from backend.models.task import Task
from backend.models.enums import TaskStatus
from backend.services.hyperparameters import get_hp


def due_date_weight(days_remaining: float) -> float:
    """Step function: urgency contribution from due date proximity."""
    if days_remaining <= 0:
        return 3.0
    elif days_remaining <= 1:
        return 2.5
    elif days_remaining <= 3:
        return 2.0
    elif days_remaining <= 7:
        return 1.0
    elif days_remaining <= 14:
        return 0.5
    return 0.0


def time_in_system_weight(days_since_created: float) -> float:
    """Linear contribution from time in system."""
    return min(days_since_created / 30.0, 2.0)


def top_n_weight(ratio: float) -> float:
    """Contribution from how often a task has appeared in top-N."""
    return min(ratio, 1.5)


def compute_urgency_increment(task: Task, db: Session) -> float:
    aging_rate = get_hp(db, "aging_rate", 1.2)
    top_n_threshold = get_hp(db, "top_n_threshold", 20)
    now = datetime.now(timezone.utc)

    days_remaining = 0.0
    if task.due_date:
        delta = task.due_date.replace(tzinfo=timezone.utc) - now
        days_remaining = delta.total_seconds() / 86400

    created = task.created_at.replace(tzinfo=timezone.utc) if task.created_at else now
    days_since_created = (now - created).total_seconds() / 86400

    ratio = task.top_n_cycles / max(top_n_threshold, 1)

    increment = aging_rate * (
        due_date_weight(days_remaining)
        + time_in_system_weight(days_since_created)
        + top_n_weight(ratio)
    )
    return increment


def age_task(task: Task, db: Session) -> None:
    """Increment urgency in place. Caps at 10. Never reduces."""
    increment = compute_urgency_increment(task, db)
    task.urgency = min(task.urgency + increment, 10.0)


def run_aging_sweep(db: Session) -> None:
    """Age all QUEUED tasks. Called on session activation and on interval."""
    tasks = db.query(Task).filter(Task.status == TaskStatus.QUEUED).all()
    for task in tasks:
        age_task(task, db)
    db.commit()
