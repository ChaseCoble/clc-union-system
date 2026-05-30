from datetime import datetime
from pydantic import BaseModel, field_validator
import re


class PanelManifest(BaseModel):
    panel_id: str
    display_name: str
    version: str
    service_url: str
    health_endpoint: str
    frontend_endpoint: str
    frontend_checksum: str
    api_base: str
    publishes: list[str] = []
    subscribes: list[str] = []
    focus_components: list[dict] = []
    role: str = "owner"
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

    @field_validator("service_url")
    @classmethod
    def service_url_internal(cls, v: str) -> str:
        if not (v.startswith("http://10.") or v.startswith("http://172.") or v.startswith("http://192.168.")):
            raise ValueError("service_url must be an internal network address")
        return v


class PanelResponse(BaseModel):
    panel_id: str
    display_name: str
    version: str
    service_url: str
    health_endpoint: str
    frontend_endpoint: str
    frontend_checksum: str
    api_base: str
    publishes: list[str]
    subscribes: list[str]
    verified: bool
    registered_at: datetime
    last_verified_at: datetime | None
    focus_components: list[dict] = []

    model_config = {"from_attributes": True}
