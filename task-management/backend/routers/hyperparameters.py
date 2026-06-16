from uuid import uuid4
from datetime import datetime, timezone, timezone, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.hyperparameter import Hyperparameter, HYPERPARAMETER_DEFAULTS
from backend.schemas.hyperparameter import HyperparameterResponse, HyperparameterUpdate
from backend.services.auth import get_current_user

router = APIRouter(prefix="/api/hyperparameters", tags=["hyperparameters"])


@router.get("", response_model=list[HyperparameterResponse])
async def get_hyperparameters(
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """Return all hyperparameters, falling back to defaults for any not yet persisted."""
    rows = {r.key: r for r in db.query(Hyperparameter).all()}
    result = []
    for key, default_value in HYPERPARAMETER_DEFAULTS.items():
        if key in rows:
            result.append(rows[key])
        else:
            # Return synthetic default — not yet written to DB
            result.append(HyperparameterResponse(
                key=key,
                value=default_value,
                updated_at=datetime.now(timezone.utc),
            ))
    return result


@router.patch("/{key}", response_model=HyperparameterResponse)
async def update_hyperparameter(
    key: str,
    payload: HyperparameterUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    if key not in HYPERPARAMETER_DEFAULTS:
        raise HTTPException(status_code=400, detail=f"Unknown hyperparameter: {key}")

    row = db.query(Hyperparameter).filter(Hyperparameter.key == key).first()
    if row:
        row.value = payload.value
        row.updated_at = datetime.now(timezone.utc)
    else:
        row = Hyperparameter(
            id=str(uuid4()),
            key=key,
            value=payload.value,
            updated_at=datetime.now(timezone.utc),
        )
        db.add(row)
    db.commit()
    db.refresh(row)
    return row
