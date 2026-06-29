from datetime import datetime, timezone, timezone, timedelta, timezone
from jose import jwt, JWTError
from fastapi import HTTPException, Request, status
from backend.config import get_config


def issue_token(user_id: str, username: str, role:str, timediff: int = 0) -> str:
    config = get_config()
    now = datetime.now(timezone.utc)
    if timediff == 0:
        timediff = config.jwt_expiry_hours
    expire = now + timedelta(hours=config.jwt_expiry_hours)
    payload = {
        "sub": user_id,
        "username": username,
        "role": role,
        "exp": expire,
        "iat": now,
    }
    return jwt.encode(payload, config.jwt_private_key, algorithm=config.jwt_algorithm)


def decode_token(token: str) -> dict:
    config = get_config()
    try:
        return jwt.decode(token, config.jwt_public_key, algorithms=[config.jwt_algorithm])
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from e


def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    return decode_token(token)
def verify_service_token(request: Request) -> None:
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
