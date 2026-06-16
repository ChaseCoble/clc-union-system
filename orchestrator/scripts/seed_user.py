#!/usr/bin/env python3
"""
Seed the initial user into the orchestrator database.
Run after first Alembic migration.

Usage:
    python scripts/seed_user.py --username admin --password <your-password>
"""
import argparse
import sys
import os
from uuid import uuid4
from datetime import datetime, timezone, timezone, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import bcrypt
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.config import get_config
from backend.models.user import User


def seed_user(username: str, password: str):
    config = get_config()
    engine = create_engine(config.database_url, connect_args={"check_same_thread": False})
    Session = sessionmaker(bind=engine)
    db = Session()

    existing = db.query(User).filter(User.username == username).first()
    if existing:
        print(f"User '{username}' already exists. Aborting.")
        db.close()
        sys.exit(1)

    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    user = User(
        id=str(uuid4()),
        username=username,
        hashed_password=hashed,
        created_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.commit()
    print(f"User '{username}' seeded successfully. ID: {user.id}")
    db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed initial orchestrator user")
    parser.add_argument("--username", required=True)
    parser.add_argument("--password", required=True)
    args = parser.parse_args()
    seed_user(args.username, args.password)
