from uuid import uuid4
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.tab import Tab
from backend.schemas.tab import TabCreate, TabUpdate, TabResponse

router = APIRouter(prefix="/tabs", tags=["tabs"])


@router.get("", response_model=list[TabResponse])
async def get_tabs(user_id: str, db: Session = Depends(get_db)):
    return db.query(Tab).filter(Tab.user_id == user_id).order_by(Tab.order).all()


@router.post("", response_model=TabResponse, status_code=status.HTTP_201_CREATED)
async def create_tab(user_id: str, payload: TabCreate, db: Session = Depends(get_db)):
    tab = Tab(
        id=str(uuid4()),
        user_id=user_id,
        name=payload.name,
        order=payload.order,
        layout={},
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(tab)
    db.commit()
    db.refresh(tab)
    return tab


@router.patch("/{tab_id}", response_model=TabResponse)
async def update_tab(tab_id: str, payload: TabUpdate, db: Session = Depends(get_db)):
    tab = db.query(Tab).filter(Tab.id == tab_id).first()
    if not tab:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tab not found")
    if payload.name is not None:
        tab.name = payload.name
    if payload.order is not None:
        tab.order = payload.order
    if payload.layout is not None:
        tab.layout = payload.layout
    tab.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(tab)
    return tab


@router.delete("/{tab_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tab(tab_id: str, db: Session = Depends(get_db)):
    tab = db.query(Tab).filter(Tab.id == tab_id).first()
    if not tab:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tab not found")
    db.delete(tab)
    db.commit()
