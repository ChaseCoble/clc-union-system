import os
from pathlib import Path
from functools import lru_cache

class Config:
    def __init__(self):
        self.service_token: str = os.environ["SERVICE_TOKEN"]
        secure_loc = Path(os.environ["SECURE_LOC"])
        pvt_key_path = secure_loc / os.environ["PRIVATE_KEY_NAME"]
        pub_key_path = secure_loc / os.environ["PUBLIC_KEY_NAME"]
        # Hard fail if SECURE_LOC not mounted — correct behavior per spec
        if not secure_loc.exists():
            raise RuntimeError(
                f"Secure Location not found at {secure_loc}. "
                "Orchestrator cannot start without secure storage."             )
        if not pvt_key_path.exists():
            raise RuntimeError(
                f"RSA private key not found at {pvt_key_path}. "
                "Generate keypair before starting orchestrator."
            )
        if not pub_key_path.exists():
            raise RuntimeError(
                f"RSA public key not found at {pub_key_path}. "
                "Generate keypair before starting orchestrator."
            )

        self.database_url: str = os.environ.get("DATABASE_URI", f"sqlite:////{secure_loc}/orchestrator.db")
        self.jwt_algorithm: str = "RS256"
        self.jwt_expiry_hours: int = int(os.environ.get("JWT_EXPIRY_HOURS", "24"))
        self.host: str = "0.0.0.0"
        self.port: int = int(os.environ.get("SERVICE_PORT", 8000))

        with open(pvt_key_path) as f:
            self.jwt_private_key: str = f.read()
        with open(pub_key_path) as f:
            self.jwt_public_key: str = f.read()


@lru_cache(maxsize=1)
def get_config() -> Config:
    return Config()

