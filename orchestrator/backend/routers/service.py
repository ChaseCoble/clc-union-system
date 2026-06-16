from uuid import uuid4
from datetime import datetime, timezone, timezone, timezone
from fastapi import APIRouter, Header, HTTPException, status
from sqlalchemy.orm import Session
from fastapi import Depends
from backend.database import get_db
from backend.models.service import Service
from backend.schemas.service import ServiceRegisterRequest, ServiceRegisterResponse, ServiceValidateResponse
from backend.services.jwt import get_current_user
router = APIRouter(prefix="/services", tags=["services"])

# Debug route, disable on full deployment
@router.get("", response_model=list[ServiceRegisterResponse])
async def get_services(
   db: Session = Depends(get_db),
   _: dict = Depends(get_current_user),
):
   return db.query(Service).all()




@router.post("/register", response_model=ServiceRegisterResponse, status_code=status.HTTP_201_CREATED)
async def register_service(
    payload: ServiceRegisterRequest,
    db: Session = Depends(get_db),
    x_service_token: str | None = Header(default=None),
):
    existing = db.query(Service).filter(Service.service_id == payload.service_id).first()

    if existing:
        # Re-registration — validate token if provided
        if x_service_token and x_service_token == existing.service_token:
            existing.service_url = payload.service_url
            existing.health_endpoint = payload.health_endpoint
            existing.last_seen_at = datetime.now(timezone.utc)
            db.commit()
            return ServiceRegisterResponse(
                service_id=existing.service_id,
                service_token=existing.service_token,
                registered_at=existing.registered_at,
            )
        else:
            # Bad token on re-registration — warn, still return existing token
            # Log warning but do not block
            import logging
            logging.warning(f"Bad service token on re-registration for {payload.service_id}")
            existing.last_seen_at = datetime.now(timezone.utc)
            db.commit()
            return ServiceRegisterResponse(
                service_id=existing.service_id,
                service_token=existing.service_token,
                registered_at=existing.registered_at,
            )

    # First registration — generate token
    token = str(uuid4())
    service = Service(
        id=str(uuid4()),
        service_id=payload.service_id,
        service_token=token,
        service_url=payload.service_url,
        health_endpoint=payload.health_endpoint,
        registered_at=datetime.now(timezone.utc),
        last_seen_at=datetime.now(timezone.utc),
    )
    db.add(service)
    db.commit()
    return ServiceRegisterResponse(
        service_id=service.service_id,
        service_token=service.service_token,
        registered_at=service.registered_at,
    )


@router.get("/validate/{service_id}", response_model=ServiceValidateResponse)
async def validate_service(
    service_id: str,
    db: Session = Depends(get_db),
    x_service_token: str | None = Header(default=None),
):
    service = db.query(Service).filter(Service.service_id == service_id).first()

    if not service:
        return ServiceValidateResponse(authenticated=False)

    if x_service_token != service.service_token:
        return ServiceValidateResponse(authenticated=False)

    return ServiceValidateResponse(
        authenticated=True,
        service_id=service.service_id,
        registered_at=service.registered_at,
    )
