from datetime import datetime, timezone, timezone, timezone
from pydantic import BaseModel, field_validator, model_validator
import re


class FocusComponent(BaseModel):
    component_id: str
    priority: int
    endpoint: str


class PanelRegisterRequest(BaseModel):
    panel_id: str
    display_name: str
    version: str
    service_url: str
    frontend_endpoint: str
    frontend_checksum: str
    api_base: str
    publishes: list[str] = []
    subscribes: list[str] = []
    focus_components: list[FocusComponent] = []
    required_role: str = "owner"
    metadata: dict = {}

    @field_validator("panel_id")
    @classmethod
    def panel_id_format(cls, v: str) -> str:
        if not re.match(r"^[a-z][a-z0-9_]*$", v):
            raise ValueError("panel_id must be lowercase alphanumeric with underscores")
        return v

    @field_validator("frontend_checksum")
    @classmethod
    def checksum_format(cls, v: str) -> str:
        if not v.startswith("sha256:"):
            raise ValueError("frontend_checksum must be prefixed with 'sha256:'")
        return v


class PanelResponse(BaseModel):
    panel_id: str
    service_id: str
    display_name: str
    version: str
    service_url: str
    frontend_endpoint: str
    frontend_checksum: str
    api_base: str
    publishes: list[str]
    subscribes: list[str]
    focus_components: list[FocusComponent]
    required_role: str
    metadata: dict
    verified: bool
    registered_at: datetime
    last_verified_at: datetime | None

    model_config = {"from_attributes": True}
    @model_validator(mode='before')
    @classmethod
    def extract_metadata(cls, values):
        if hasattr(values, 'metadata_'):
            values = dict(values.__dict__)
            values['metadata'] = values.pop('metadata_', {}) or {}
        return values
    model_config = {"from_attributes": True}
