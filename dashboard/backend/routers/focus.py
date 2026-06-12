from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.schemas.focus import FocusCacheResponse
from backend.services.focus import rebuild_focus_cache, get_focus_cache

router = APIRouter(prefix="/focus", tags=["focus"])


@router.get("", response_model=FocusCacheResponse)
async def get_focus(db: Session = Depends(get_db)):
    cache = get_focus_cache(db)
    if not cache:
        return FocusCacheResponse(composition=[], built_at=None)
    return FocusCacheResponse(composition=cache.composition, built_at=cache.built_at)


@router.post("/rebuild", status_code=200)
async def rebuild_focus(request: Request, db: Session = Depends(get_db)):
    cookie = request.cookies.get("access_token", "")
    await rebuild_focus_cache(db, cookie=cookie)
    return {"status": "rebuilt"}
