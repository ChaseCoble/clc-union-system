from datetime import datetime, timezone, timezone, timezone
from sqlalchemy import Column, String, Integer, Float, DateTime, Enum, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from backend.database import Base
from backend.models.enums import WorkType, Enjoyability, TaskStatus, BlockType, QueueTier


class Task(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True)
    platform_id = Column(String, ForeignKey("platforms.id"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)

    work_type = Column(Enum(WorkType), nullable=False)
    enjoyability = Column(Enum(Enjoyability), nullable=False)
    status = Column(Enum(TaskStatus), default=TaskStatus.QUEUED, nullable=False)

    # MLFQ bucket (0-3)
    bucket = Column(Integer, default=1, nullable=False)

    # Urgency — internal only, never serialized to API responses
    urgency = Column(Float, default=5.0, nullable=False)
    urgency_base = Column(Float, default=5.0, nullable=False)  # preserves original user intent

    # Aging tracking
    top_n_cycles = Column(Integer, default=0, nullable=False)

    # Block fields
    block_type = Column(Enum(BlockType), nullable=True)
    block_until = Column(DateTime, nullable=True)
    block_task_id = Column(String, ForeignKey("tasks.id"), nullable=True)
    block_task_status_required = Column(Enum(TaskStatus), nullable=True)

    due_date = Column(DateTime, nullable=True)
    estimated_duration = Column(Integer, nullable=True)   # minutes
    actual_duration = Column(Integer, nullable=True)      # minutes

    # V2 data dependency — present before first migration
    queue_tier = Column(Enum(QueueTier), nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    platform = relationship("Platform", back_populates="tasks")
    artifacts = relationship("TaskArtifact", back_populates="task", cascade="all, delete-orphan")
    blocking_task = relationship("Task", remote_side="Task.id", foreign_keys=[block_task_id])
