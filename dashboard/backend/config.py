import os
from functools import lru_cache


class Config:
    def __init__(self):
        self.database_url: str = os.environ.get("DATABASE_URI", "sqlite:////data/dashboard.db")
        self.orchestrator_url: str = os.environ["ORCHESTRATOR_URL"]
        self.host: str = "0.0.0.0"
        self.port: int = int(os.environ.get("SERVICE_PORT", "8000"))


@lru_cache(maxsize=1)
def get_config() -> Config:
    return Config()
