from fastapi import HTTPException, Request, status
from jose import jwt, JWTError
from backend.config import get_config


def get_current_user(request: Request) -> dict:
    """Validate JWT independently using orchestrator public key.
    Service stays functional through orchestrator downtime.
    """
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    config = get_config()
    try:
        return jwt.decode(token, config.jwt_public_key, algorithms=[config.jwt_algorithm])
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from e


def verify_service_token(request: Request) -> None:
    """Validate static bearer token for service-to-service intake endpoint."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Service token required",
        )
    token = auth_header.removeprefix("Bearer ").strip()
    config = get_config()
    if token != config.service_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid service token",
        )
