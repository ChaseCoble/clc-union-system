from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from sqlalchemy.orm import Session
import bcrypt

from backend.database import get_db
from backend.models.user import User
from backend.schemas.auth import LoginRequest
from backend.services.jwt import issue_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
async def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not bcrypt.checkpw(payload.password.encode(), user.hashed_password.encode()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = issue_token(user.id, user.username)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=86400,
    )
    return {"status": "ok"}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    return {"status": "ok"}


@router.get("/verify")
async def verify(current_user: dict = Depends(get_current_user)):
    return {"user_id": current_user["sub"], "username": current_user["username"]}


@router.get("/public-key")
async def public_key():
    """
    JWKS-style endpoint — serves RSA public key in PEM format.
    Services fetch this at startup to validate JWTs without orchestrator online.
    Internal network only — never forwarded externally per FLEET-only principle.
    """
    from backend.config import get_config
    config = get_config()
    return {"public_key": config.jwt_public_key, "algorithm": config.jwt_algorithm}
