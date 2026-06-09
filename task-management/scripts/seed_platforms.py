#!/usr/bin/env python3
"""
Seed platforms into task-management database.
Idempotent — safe to run multiple times.
Run after first Alembic migration if platforms are missing.

Usage:
    docker compose exec task-management python scripts/seed_platforms.py
"""
import sys
import os
from uuid import uuid4
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.config import get_config
from backend.models.platform import Platform

DEFAULT_PLATFORMS = ["HackerOne", "Bugcrowd", "BTLO", "HTB", "FHSU", "Manual"]


def seed_platforms():
    config = get_config()
    engine = create_engine(config.database_url, connect_args={"check_same_thread": False})
    Session = sessionmaker(bind=engine)
    db = Session()

    added = 0
    for name in DEFAULT_PLATFORMS:
        existing = db.query(Platform).filter(Platform.name == name).first()
        if not existing:
            db.add(Platform(id=str(uuid4()), name=name, registered_at=datetime.now(timezone.utc)))
            added += 1

    db.commit()
    print(f"Seeded {added} platforms. ({len(DEFAULT_PLATFORMS) - added} already existed.)")
    db.close()


if __name__ == "__main__":
    seed_platforms()
