from uuid import uuid4
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.ui_state import UIState
from backend.schemas.ui_state import UIStateUpdate, UIStateResponse
from backend.services.orchestrator import get_verified_panels

router = APIRouter(prefix="/ui", tags=["ui"])


@router.get("/panels")
async def get_panels(request: Request):
    cookie = request.cookies.get("access_token", "")
    panels = await get_verified_panels(cookie=cookie)
    return {
        "panels": panels,
        "orchestrator_reachable": len(panels) > 0,
    }

@router.get("/state/{user_id}", response_model=UIStateResponse)
async def get_ui_state(user_id: str, db: Session = Depends(get_db)):
    state = db.query(UIState).filter(UIState.user_id == user_id).first()
    if not state:
        return UIStateResponse(user_id=user_id, active_tab_id=None)
    return UIStateResponse(user_id=user_id, active_tab_id=state.active_tab_id)


@router.post("/state/{user_id}", response_model=UIStateResponse)
async def save_ui_state(
    user_id: str,
    payload: UIStateUpdate,
    db: Session = Depends(get_db),
):
    state = db.query(UIState).filter(UIState.user_id == user_id).first()
    now = datetime.now(timezone.utc)
    if state:
        state.active_tab_id = payload.active_tab_id
        state.updated_at = now
    else:
        state = UIState(
            id=str(uuid4()),
            user_id=user_id,
            active_tab_id=payload.active_tab_id,
            updated_at=now,
        )
        db.add(state)
    db.commit()
    return UIStateResponse(user_id=user_id, active_tab_id=state.active_tab_id)


@router.post("/command")
async def command_relay():
    return {"status": "stub"}
