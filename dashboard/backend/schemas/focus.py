from datetime import datetime
from pydantic import BaseModel


class FocusComponent(BaseModel):
    component_id: str
    priority: int
    endpoint: str
    panel_id: str
    service_url: str


class FocusCacheResponse(BaseModel):
    composition: list[FocusComponent]
    built_at: datetime | None
