from datetime import datetime, timezone, timezone, timezone
from pydantic import BaseModel


class LayoutSave(BaseModel):
    layout: dict


class LayoutResponse(BaseModel):
    user_id: str
    layout: dict
    updated_at: datetime | None

    model_config = {"from_attributes": True}
