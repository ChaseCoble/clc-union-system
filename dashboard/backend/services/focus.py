from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy.orm import Session

from backend.models.focus_cache import FocusCache
from backend.services.orchestrator import get_verified_panels


async def rebuild_focus_cache(db: Session) -> None:
    panels = await get_verified_panels()

    composition = []
    for panel in panels:
        for component in panel.get("focus_components", []):
            composition.append({
                "component_id": component["component_id"],
                "priority":     component["priority"],
                "endpoint":     component["endpoint"],
                "panel_id":     panel["panel_id"],
                "service_url":  panel["service_url"],
            })

    composition.sort(key=lambda x: x["priority"])

    existing = db.query(FocusCache).first()
    now = datetime.now(timezone.utc)

    if existing:
        existing.composition = composition
        existing.built_at = now
    else:
        db.add(FocusCache(
            id=str(uuid4()),
            composition=composition,
            built_at=now,
        ))

    db.commit()


def get_focus_cache(db: Session) -> FocusCache | None:
    return db.query(FocusCache).first()
