from uuid import uuid4
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.panel import PanelRegistration
from backend.schemas.panel import PanelManifest, PanelResponse
from backend.services.verification import verify_panel, mark_verified, VerificationError
from backend.services.jwt import get_current_user, verify_service_token

router = APIRouter(prefix="/panels", tags=["panels"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_panel(
    manifest: PanelManifest,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_service_token)
):
    existing = db.query(PanelRegistration).filter(
        PanelRegistration.panel_id == manifest.panel_id
    ).first()

    try:
        await verify_panel(manifest)
    except VerificationError as e:
        print(f"Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Panel verification failed: {e}",
        )

    if existing:
        existing.display_name = manifest.display_name
        existing.version = manifest.version
        existing.service_url = manifest.service_url
        existing.health_endpoint = manifest.health_endpoint
        existing.frontend_endpoint = manifest.frontend_endpoint
        existing.frontend_checksum = manifest.frontend_checksum
        existing.api_base = manifest.api_base
        existing.publishes = manifest.publishes
        existing.subscribes = manifest.subscribes
        existing.registered_at = datetime.now(timezone.utc)
        existing.focus_components = manifest.focus_components
        mark_verified(existing)
        db.commit()
        return {"status": "updated", "panel_id": manifest.panel_id}

    panel = PanelRegistration(
        id=str(uuid4()),
        panel_id=manifest.panel_id,
        display_name=manifest.display_name,
        version=manifest.version,
        service_url=manifest.service_url,
        health_endpoint=manifest.health_endpoint,
        frontend_endpoint=manifest.frontend_endpoint,
        frontend_checksum=manifest.frontend_checksum,
        api_base=manifest.api_base,
        publishes=manifest.publishes,
        subscribes=manifest.subscribes,
        registered_at=datetime.now(timezone.utc),
        focus_components=manifest.focus_components
    )
    mark_verified(panel)
    db.add(panel)
    db.commit()
    return {"status": "registered", "panel_id": manifest.panel_id}


@router.get("/verified", response_model=list[PanelResponse])
async def get_verified_panels(
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    return db.query(PanelRegistration).filter(PanelRegistration.verified == True).all()


@router.delete("/{panel_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deregister_panel(
    panel_id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    panel = db.query(PanelRegistration).filter(
        PanelRegistration.panel_id == panel_id
    ).first()
    if not panel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Panel not found")
    db.delete(panel)
    db.commit()
