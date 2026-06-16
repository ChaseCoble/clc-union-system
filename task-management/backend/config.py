import os
from pathlib import Path
from functools import lru_cache


class Config:
    def __init__(self):
        # Public key for independent JWT validation — fetched from orchestrator at deploy time
        pub_key_path = Path(os.environ["PUBLIC_KEY_PATH"])
        if not pub_key_path.exists():
            raise RuntimeError(
                f"RSA public key not found at {pub_key_path}. "
                "Copy orchestrator public key before starting task-management."
            )

        with open(pub_key_path) as f:
            self.jwt_public_key: str = f.read()

        self.jwt_algorithm: str = "RS256"
        self.database_url: str = os.environ.get(
            "DATABASE_URI", "sqlite:////data/task_management.db"
        )
        self.orchestrator_url: str = os.environ["ORCHESTRATOR_URL"]
        self.service_token: str = os.environ["SERVICE_TOKEN"]
        self.host: str = "0.0.0.0"
        self.port: int = int(os.environ.get("SERVICE_PORT", "8000"))
        self.dashboard_url = os.environ.get("DASHBOARD_URL")
        # Panel registration fields — resolved at startup
        self.service_url: str = os.environ["SERVICE_URL"]
        self.panel_version: str = os.environ.get("PANEL_VERSION", "1.0.0")


@lru_cache(maxsize=1)
def get_config() -> Config:
    return Config()
