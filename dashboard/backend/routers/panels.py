from uuid import uuid4
from datetime import datetime, timezone, timezone, timezone
from fastapi import APIRouter, Header, HTTPException, status, Depends, Response, Request
from sqlalchemy.orm import Session
import httpx
from backend.database import get_db
from backend.models.panel import Panel
from backend.schemas.panel import PanelRegisterRequest, PanelResponse
from backend.services.orchestrator import validate_service

router = APIRouter(prefix="/panels", tags=["panels"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_panel(
    payload: PanelRegisterRequest,
    db: Session = Depends(get_db),
    x_service_token: str | None = Header(default=None),
    x_service_id: str | None = Header(default=None),
):
    if not x_service_token or not x_service_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Service token and service ID required"
        )

    # Validate service with orchestrator
    validation = await validate_service(x_service_id, x_service_token)
    verified = validation.get("authenticated", False)

    existing = db.query(Panel).filter(Panel.panel_id == payload.panel_id).first()
    now = datetime.now(timezone.utc)

    if existing:
        existing.display_name = payload.display_name
        existing.version = payload.version
        existing.service_url = payload.service_url
        existing.frontend_endpoint = payload.frontend_endpoint
        existing.frontend_checksum = payload.frontend_checksum
        existing.api_base = payload.api_base
        existing.publishes = payload.publishes
        existing.subscribes = payload.subscribes
        existing.focus_components = [c.model_dump() for c in payload.focus_components]
        existing.required_role = payload.required_role
        existing.metadata_ = payload.metadata
        existing.verified = verified
        existing.last_verified_at = now
        db.commit()
        return {"status": "updated", "panel_id": payload.panel_id, "verified": verified}

    panel = Panel(
        id=str(uuid4()),
        service_id=x_service_id,
        panel_id=payload.panel_id,
        display_name=payload.display_name,
        version=payload.version,
        service_url=payload.service_url,
        frontend_endpoint=payload.frontend_endpoint,
        frontend_checksum=payload.frontend_checksum,
        api_base=payload.api_base,
        publishes=payload.publishes,
        subscribes=payload.subscribes,
        focus_components=[c.model_dump() for c in payload.focus_components],
        required_role=payload.required_role,
        metadata_=payload.metadata,
        verified=verified,
        registered_at=now,
        last_verified_at=now,
    )
    db.add(panel)
    db.commit()
    return {"status": "registered", "panel_id": payload.panel_id, "verified": verified}

 
@router.get("", response_model=list[PanelResponse])
async def get_panels(db: Session = Depends(get_db)):
    return db.query(Panel).all()


@router.delete("/{panel_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deregister_panel(panel_id: str, db: Session = Depends(get_db)):
    panel = db.query(Panel).filter(Panel.panel_id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Panel not found")
    db.delete(panel)
    db.commit()

@router.get("/{panel_id}/proxy/{path:path}")
async def proxy_panel_asset(
    panel_id: str,
    path: str,
    db: Session = Depends(get_db)
):
    panel = db.query(Panel).filter(Panel.panel_id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    url = f"{panel.service_url.rstrip('/')}/{path.lstrip('/')}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, headers={"Accept-Encoding": "identity"})
        return Response(
            content=resp.content,
            status_code=resp.status_code,
            media_type=resp.headers.get("content-type", "application/javascript"),
        )
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Panel service unreachable")

@router.api_route("/{panel_id}/api/{path:path}", methods=["GET", "POST", "PATCH", "PUT", "DELETE"])
async def proxy_panel_api(
    panel_id: str,
    path: str,
    request: Request,
    db: Session = Depends(get_db),
):
    panel = db.query(Panel).filter(Panel.panel_id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")

    url = f"{panel.service_url.rstrip('/')}/{panel.api_base.strip('/')}/{path}"
    
    body = await request.body()
    headers = {
        k: v for k, v in request.headers.items()
        if k.lower() not in ("host", "content-length")
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.request(
                method=request.method,
                url=url,
                content=body,
                headers=headers,
                params=dict(request.query_params),
            )
        return Response(
            content=resp.content,
            status_code=resp.status_code,
            media_type=resp.headers.get("content-type", "application/json"),
        )
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Panel service unreachable")
