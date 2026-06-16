from datetime import datetime, timezone, timezone, timezone
from pydantic import BaseModel
from typing import Optional


class HyperparameterResponse(BaseModel):
    key: str
    value: str
    updated_at: datetime

    model_config = {"from_attributes": True}


class HyperparameterUpdate(BaseModel):
    value: str
