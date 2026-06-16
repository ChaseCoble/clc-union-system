from datetime import datetime, timezone, timezone, timezone
from pydantic import BaseModel, field_validator
from typing import Optional
from backend.models.enums import WorkType, Enjoyability, TaskStatus, BlockType, QueueTier


class ArtifactResponse(BaseModel):
    id: str
    artifact_type: str
    label: str
    url: Optional[str] = None
    file_path: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TaskCreate(BaseModel):
    title: str
    platform_id: Optional[str] = None
    description: Optional[str] = None
    work_type: WorkType
    enjoyability: Enjoyability
    bucket: int = 1
    urgency: float = 5.0
    due_date: Optional[datetime] = None
    estimated_duration: Optional[int] = None

    @field_validator("bucket")
    @classmethod
    def bucket_range(cls, v: int) -> int:
        if v not in (0, 1, 2, 3):
            raise ValueError("bucket must be 0-3")
        return v

    @field_validator("urgency")
    @classmethod
    def urgency_range(cls, v: float) -> float:
        if not (1.0 <= v <= 10.0):
            raise ValueError("urgency must be between 1 and 10")
        return v


class TaskUpdate(BaseModel):
    """User-editable fields only. Scheduling internals (bucket, urgency, queue_tier)
    are not accepted here — they are owned by the rule engine and aging system."""
    title: Optional[str] = None
    description: Optional[str] = None
    work_type: Optional[WorkType] = None
    enjoyability: Optional[Enjoyability] = None
    due_date: Optional[datetime] = None
    estimated_duration: Optional[int] = None


class BlockRequest(BaseModel):
    block_type: BlockType
    block_until: Optional[datetime] = None              # DATE or TIMER
    block_task_id: Optional[str] = None                 # TASK
    block_task_status_required: Optional[TaskStatus] = None


class CompleteRequest(BaseModel):
    actual_duration: Optional[int] = None               # minutes


class TaskIntakeRequest(BaseModel):
    """Service-to-service intake — called by orchestrator event bus in V2."""
    title: str
    platform_id: Optional[str] = None
    description: Optional[str] = None
    work_type: WorkType
    enjoyability: Enjoyability
    bucket: int = 1
    urgency: float = 5.0
    due_date: Optional[datetime] = None
    estimated_duration: Optional[int] = None


class TaskResponse(BaseModel):
    id: str
    platform_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    work_type: WorkType
    enjoyability: Enjoyability
    status: TaskStatus
    bucket: int
    # urgency intentionally excluded — never leaves the backend
    block_type: Optional[BlockType] = None
    block_until: Optional[datetime] = None
    block_task_id: Optional[str] = None
    due_date: Optional[datetime] = None
    estimated_duration: Optional[int] = None
    actual_duration: Optional[int] = None
    queue_tier: Optional[QueueTier] = None
    mounted: bool = False
    created_at: datetime
    completed_at: Optional[datetime] = None
    artifacts: list[ArtifactResponse] = []
    # Computed fields — never stored
    difficulty_label: Optional[str] = None
    difficulty_ordinal: Optional[int] = None

    model_config = {"from_attributes": True}
