from datetime import datetime, timezone, timezone, timezone
from pydantic import BaseModel


class ServiceRegisterRequest(BaseModel):
    service_id: str
    service_url: str
    health_endpoint: str


class ServiceRegisterResponse(BaseModel):
    service_id: str
    service_token: str
    registered_at: datetime

    model_config = {"from_attributes": True}


class ServiceValidateResponse(BaseModel):
    authenticated: bool
    service_id: str | None = None
    registered_at: datetime | None = None
