"""SessionManager — class with defined interface for V2 compatibility.

V2 change: transport for health signals swaps from direct call to event bus.
The interface here does not change.
"""

from datetime import datetime, timezone, timezone, timezone
from uuid import uuid4
from sqlalchemy.orm import Session

from backend.models.session import WorkSession
from backend.models.enums import TaskStatus, Enjoyability
from backend.models.task import Task
from backend.services.health import emit_orphaned, compute_performance_score
from backend.services.aging import run_aging_sweep
from backend.services.queue import resolve_date_blocks
from backend.services.hyperparameters import get_hp


class SessionManager:
    def __init__(self, db: Session):
        self.db = db

    def get_current(self) -> WorkSession | None:
        return (
            self.db.query(WorkSession)
            .filter(WorkSession.ended_at.is_(None))
            .order_by(WorkSession.started_at.desc())
            .first()
        )

    def start(self) -> WorkSession:
        """Start a new session. Auto-close any orphaned open sessions."""
        existing = self.get_current()
        if existing:
            self._close_orphaned(existing)

        # Eager DATE/TIMER unblock
        resolve_date_blocks(self.db)

        # Run aging sweep on session activation
        run_aging_sweep(self.db)

        session = WorkSession(
            id=str(uuid4()),
            started_at=datetime.now(timezone.utc),
        )
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    def end(self, session_id: str, active_minutes: int, break_minutes: int) -> WorkSession:
        session = self.db.query(WorkSession).filter(WorkSession.id == session_id).first()
        if not session or session.ended_at:
            raise ValueError("Session not found or already ended")

        session.ended_at = datetime.now(timezone.utc)
        session.active_minutes = active_minutes
        session.break_minutes = break_minutes

        # Count dread completions in this session
        dread_completions = self._count_dread_completions(session)

        # Break budget
        break_budget_ratio = get_hp(self.db, "break_budget_ratio", 0.2)
        break_budget_minutes = int(active_minutes * break_budget_ratio)

        session.performance_score = compute_performance_score(
            tasks_completed=session.tasks_completed,
            active_minutes=active_minutes,
            break_minutes=break_minutes,
            dread_completions=dread_completions,
            break_budget_minutes=break_budget_minutes,
        )
        self.db.commit()
        self.db.refresh(session)
        return session

    def _close_orphaned(self, session: WorkSession) -> None:
        session.ended_at = datetime.now(timezone.utc)
        session.orphaned = True
        self.db.commit()
        emit_orphaned(session.id, self.db)

    def _count_dread_completions(self, session: WorkSession) -> int:
        # Dread completions within this session window
        tasks = (
            self.db.query(Task)
            .filter(
                Task.status == TaskStatus.COMPLETE,
                Task.enjoyability == Enjoyability.DREAD,
                Task.completed_at >= session.started_at,
            )
            .all()
        )
        return len(tasks)

    def get_pending_timers(self) -> list[Task]:
        from datetime import timezone as tz
        from backend.models.enums import BlockType
        now = datetime.now(timezone.utc)
        return (
            self.db.query(Task)
            .filter(
                Task.status == TaskStatus.BLOCKED,
                Task.block_type == BlockType.TIMER,
                Task.block_until <= now,
            )
            .all()
        )
