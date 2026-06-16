from datetime import datetime, timezone, timezone, timezone
from pydantic import BaseModel
from typing import Optional


class SessionResponse(BaseModel):
    id: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    tasks_completed: int
    active_minutes: int
    break_minutes: int
    performance_score: Optional[float] = None
    orphaned: bool

    model_config = {"from_attributes": True}


class SessionEndRequest(BaseModel):
    active_minutes: int
    break_minutes: int
