from datetime import datetime
from pydantic import BaseModel


class TabCreate(BaseModel):
    name: str
    order: int


class TabUpdate(BaseModel):
    name: str | None = None
    order: int | None = None
    layout: dict | None = None


class TabResponse(BaseModel):
    id: str
    user_id: str
    name: str
    order: int
    layout: dict
    created_at: datetime
    updated_at: datetime | None

    model_config = {"from_attributes": True}
