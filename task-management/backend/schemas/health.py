from datetime import datetime
from pydantic import BaseModel
from typing import ClassVar, Optional


class HealthSignalResponse(BaseModel):
    id: str
    session_id: Optional[str] = None
    event_type: str
    signal_name: Optional[str] = None
    value: Optional[float] = None
    flags: dict = {}
    window_sum: Optional[float] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserReportRequest(BaseModel):
    """Pull mechanism — multi-select user report signals."""
    signals: list[str]   # e.g. ["queue_too_heavy", "avoidance"]

    VALID_SIGNALS: ClassVar[set[str]] = {
        "queue_too_heavy",
        "avoidance",
        "priority_disconnect",
        "early_exhaustion",
    }
