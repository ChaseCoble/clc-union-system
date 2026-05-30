from pydantic import BaseModel


class UIStateUpdate(BaseModel):
    active_tab_id: str


class UIStateResponse(BaseModel):
    user_id: str
    active_tab_id: str | None

    model_config = {"from_attributes": True}
