"""Health engine.

Receives emitted signals via direct call in V1.
Interface designed for event bus transport swap in V2.
"""

from datetime import datetime, timezone, timezone, timezone
from uuid import uuid4
from sqlalchemy.orm import Session

from backend.models.health import HealthEvent
from backend.models.session import WorkSession


# ---------------------------------------------------------------------------
# Signal emission
# ---------------------------------------------------------------------------

def emit_signal(
    signal_name: str,
    value: float,
    db: Session,
    session_id: str | None = None,
    task_id: str | None = None,
    flags: dict | None = None,
    window_sum: float | None = None,
) -> HealthEvent:
    """Emit a health signal. V1: direct call. V2: event bus."""
    event = HealthEvent(
        id=str(uuid4()),
        session_id=session_id,
        event_type="SIGNAL",
        signal_name=signal_name,
        value=value,
        flags=flags or {},
        window_sum=window_sum,
        created_at=datetime.now(timezone.utc),
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def emit_user_report(signals: list[str], db: Session, session_id: str | None = None) -> list[HealthEvent]:
    """Record user-pull report signals."""
    events = []
    for sig in signals:
        event = HealthEvent(
            id=str(uuid4()),
            session_id=session_id,
            event_type="USER_REPORT",
            signal_name=sig,
            value=1.0,
            flags={},
            created_at=datetime.now(timezone.utc),
        )
        db.add(event)
        events.append(event)
    db.commit()
    return events


def emit_orphaned(session_id: str, db: Session) -> HealthEvent:
    event = HealthEvent(
        id=str(uuid4()),
        session_id=session_id,
        event_type="SESSION_ORPHANED",
        signal_name=None,
        value=None,
        flags={},
        created_at=datetime.now(timezone.utc),
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


# ---------------------------------------------------------------------------
# Performance score
# ---------------------------------------------------------------------------

WEIGHT_TASK = 3.0
WEIGHT_TIME = 0.1
WEIGHT_BREAK_PENALTY = 0.5
DREAD_COMPLETION_BONUS = 10.0


def compute_performance_score(
    tasks_completed: int,
    active_minutes: int,
    break_minutes: int,
    dread_completions: int,
    break_budget_minutes: int,
) -> float:
    break_overage = max(0, break_minutes - break_budget_minutes)
    task_points = tasks_completed * WEIGHT_TASK + dread_completions * DREAD_COMPLETION_BONUS
    score = task_points + active_minutes * WEIGHT_TIME - break_overage * WEIGHT_BREAK_PENALTY
    return max(0.0, min(100.0, score))
