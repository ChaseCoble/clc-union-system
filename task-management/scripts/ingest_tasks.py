#!/usr/bin/env python3
"""
ingest_tasks.py — Bulk task ingestion for Union Task Management.
Reads JSON task files from ./tasks/, inserts via SQLite, marks processed files.

Usage:
    python3 ingest_tasks.py

File format (tasks/*.json):
    [
        {
            "title": "Task title",
            "work_type": "DEEP_WORK",       # DEEP_WORK | LIGHT_WORK | PHONE_WORK
            "enjoyability": "NEUTRAL",       # ENJOYABLE | PLEASANT | NEUTRAL | DIFFICULT | DREAD
            "bucket": 1,                     # 0-3
            "urgency": 5.0,                  # 1.0-10.0
            "description": null,             # optional
            "platform_id": null,             # optional
            "due_date": null,                # optional ISO datetime string
            "estimated_duration": null       # optional, minutes
        }
    ]

Skips files with COMPLETED in the name.
Renames processed files to <name>.COMPLETED.json.
"""

import json
import os
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

SCRIPT_DIR  = Path(__file__).parent
TASKS_DIR   = SCRIPT_DIR / "tasks"
DB_PATH     = Path("/data/task_management.db")

VALID_WORK_TYPES   = {"DEEP_WORK", "LIGHT_WORK", "PHONE_WORK"}
VALID_ENJOYABILITY = {"ENJOYABLE", "PLEASANT", "NEUTRAL", "DIFFICULT", "DREAD"}


def validate(task: dict, idx: int, filename: str) -> list[str]:
    errors = []
    if not task.get("title", "").strip():
        errors.append(f"[{filename}][{idx}] title is required")
    if task.get("work_type") not in VALID_WORK_TYPES:
        errors.append(f"[{filename}][{idx}] invalid work_type: {task.get('work_type')}")
    if task.get("enjoyability") not in VALID_ENJOYABILITY:
        errors.append(f"[{filename}][{idx}] invalid enjoyability: {task.get('enjoyability')}")
    bucket = task.get("bucket", 1)
    if bucket not in (0, 1, 2, 3):
        errors.append(f"[{filename}][{idx}] bucket must be 0-3, got {bucket}")
    urgency = task.get("urgency", 5.0)
    if not (1.0 <= float(urgency) <= 10.0):
        errors.append(f"[{filename}][{idx}] urgency must be 1.0-10.0, got {urgency}")
    return errors


def insert_tasks(db: sqlite3.Connection, tasks: list[dict], filename: str) -> int:
    now = datetime.now(timezone.utc).isoformat()
    inserted = 0
    for i, task in enumerate(tasks):
        errors = validate(task, i, filename)
        if errors:
            for e in errors:
                print(f"  SKIP {e}")
            continue
        task_id = str(uuid4())
        db.execute("""
            INSERT INTO tasks (
            id, title, platform_id, description, work_type, enjoyability,
            status, bucket, urgency, urgency_base, top_n_cycles,
            due_date, estimated_duration, mounted, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'QUEUED', ?, ?, ?, 0, ?, ?, 0, ?)
            """, (
            task_id,
            task["title"].strip(),
            task.get("platform_id"),
            task.get("description"),
            task["work_type"],
            task["enjoyability"],
            int(task.get("bucket", 1)),
            float(task.get("urgency", 5.0)),
            float(task.get("urgency", 5.0)),
            task.get("due_date"),
            task.get("estimated_duration"),
            now,
        ))
        inserted += 1
    return inserted


def main():
    if not DB_PATH.exists():
        print(f"ERROR: DB not found at {DB_PATH}")
        print("Is the LUKS volume mounted?")
        sys.exit(1)

    if not TASKS_DIR.exists():
        print(f"ERROR: tasks directory not found at {TASKS_DIR}")
        sys.exit(1)

    files = sorted([
        f for f in TASKS_DIR.glob("*.json")
        if "COMPLETED" not in f.name
    ])

    if not files:
        print("No task files to process.")
        sys.exit(0)

    print(f"Found {len(files)} file(s) to process.")

    db = sqlite3.connect(DB_PATH)
    total = 0

    try:
        for f in files:
            print(f"\nProcessing: {f.name}")
            try:
                with open(f) as fh:
                    tasks = json.load(fh)
                if not isinstance(tasks, list):
                    print(f"  SKIP: expected JSON array, got {type(tasks).__name__}")
                    continue
                inserted = insert_tasks(db, tasks, f.name)
                db.commit()
                print(f"  Inserted {inserted}/{len(tasks)} tasks")
                total += inserted
                # Rename to COMPLETED
                completed_name = f.stem + ".COMPLETED.json"
                f.rename(f.parent / completed_name)
                print(f"  Renamed to {completed_name}")
            except json.JSONDecodeError as e:
                print(f"  SKIP: invalid JSON — {e}")
            except Exception as e:
                db.rollback()
                print(f"  ERROR: {e}")
    finally:
        db.close()

    print(f"\nDone. {total} task(s) inserted total.")


if __name__ == "__main__":
    main()
