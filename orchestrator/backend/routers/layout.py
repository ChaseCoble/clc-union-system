from uuid import uuid4
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.layout import UserLayout
from backend.models.user import User
from backend.schemas.layout import LayoutSave, LayoutResponse
from backend.services.jwt import get_current_user

router = APIRouter(prefix="/layout", tags=["layout"])


@router.get("/{user_id}", response_model=LayoutResponse)
async def get_layout(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if current_user["sub"] != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    layout = db.query(UserLayout).filter(UserLayout.user_id == user_id).first()
    if not layout:
        # Return empty layout — not an error
        return LayoutResponse(user_id=user_id, layout={}, updated_at=None)

    return LayoutResponse(user_id=user_id, layout=layout.layout, updated_at=layout.updated_at)


@router.post("/{user_id}", response_model=LayoutResponse)
async def save_layout(
    user_id: str,
    payload: LayoutSave,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if current_user["sub"] != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    layout = db.query(UserLayout).filter(UserLayout.user_id == user_id).first()
    now = datetime.now(timezone.utc)

    if layout:
        layout.layout = payload.layout
        layout.updated_at = now
    else:
        layout = UserLayout(
            id=str(uuid4()),
            user_id=user_id,
            layout=payload.layout,
            updated_at=now,
        )
        db.add(layout)

    db.commit()
    db.refresh(layout)
    return LayoutResponse(user_id=user_id, layout=layout.layout, updated_at=layout.updated_at)
