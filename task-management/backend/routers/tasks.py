from uuid import uuid4
from datetime import datetime, timezone, timedelta, timezone, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status, Query, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pathlib import Path
from backend.database import get_db
from backend.models.task import Task
from backend.models.artifact import TaskArtifact
from backend.models.enums import TaskStatus, BlockType, ArtifactType, compute_difficulty
from backend.schemas.task import (
    TaskCreate, TaskUpdate, TaskResponse, TaskIntakeRequest,
    BlockRequest, CompleteRequest, ArtifactResponse,
)
from backend.services.auth import get_current_user, verify_service_token
from backend.services.queue import resolve_task_blocks
from backend.models.session import WorkSession
router = APIRouter(prefix="/api/tasks", tags=["tasks"])

# File artifact storage — mounted volume, see docker-compose.yml
ARTIFACT_STORAGE_ROOT = Path("/files")

ALLOWED_EXTENSIONS = {
    # Documents
    "pdf", "docx", "md", "txt", "xlsx", "pptx", "csv",
    # Images
    "png", "jpg", "jpeg", "gif", "svg",
    # Archives
    "zip", "tar.gz",
    # Code / config
    "py", "sh", "js", "json", "yaml", "yml", "toml",
}

MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50MB per file, V1 ceiling


def _validate_extension(filename: str) -> str:
    """Returns the extension (lowercase, no dot) if allowed, raises 400 otherwise."""
    name = filename.lower()
    # Handle .tar.gz as a compound extension
    if name.endswith(".tar.gz"):
        ext = "tar.gz"
    else:
        ext = name.rsplit(".", 1)[-1] if "." in name else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '.{ext}' not allowed. Allowed: {sorted(ALLOWED_EXTENSIONS)}",
        )
    return ext


def _enrich(task: Task) -> TaskResponse:
    """Attach computed difficulty fields before returning."""
    label, ordinal = compute_difficulty(task.enjoyability, task.work_type)
    data = TaskResponse.model_validate(task)
    data.difficulty_label = label
    data.difficulty_ordinal = ordinal
    return data


@router.get("", response_model=list[TaskResponse])
async def list_tasks(
    status_filter: str | None = None,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    q = db.query(Task)
    if status_filter:
        try:
            q = q.filter(Task.status == TaskStatus(status_filter))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status_filter}")
    tasks = q.order_by(Task.bucket, Task.urgency.desc()).all()
    return [_enrich(t) for t in tasks]


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    payload: TaskCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    task = Task(
        id=str(uuid4()),
        title=payload.title,
        platform_id=payload.platform_id,
        description=payload.description,
        work_type=payload.work_type,
        enjoyability=payload.enjoyability,
        status=TaskStatus.QUEUED,
        bucket=payload.bucket,
        urgency=payload.urgency,
        urgency_base=payload.urgency,
        due_date=payload.due_date,
        estimated_duration=payload.estimated_duration,
        created_at=datetime.now(timezone.utc),
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return _enrich(task)


@router.post("/intake", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def intake_task(
    request: Request,
    payload: TaskIntakeRequest,
    db: Session = Depends(get_db),
):
    """Service-to-service intake endpoint. Uses static bearer token, not JWT."""
    verify_service_token(request)
    task = Task(
        id=str(uuid4()),
        title=payload.title,
        platform_id=payload.platform_id,
        description=payload.description,
        work_type=payload.work_type,
        enjoyability=payload.enjoyability,
        status=TaskStatus.QUEUED,
        bucket=payload.bucket,
        urgency=payload.urgency,
        urgency_base=payload.urgency,
        due_date=payload.due_date,
        estimated_duration=payload.estimated_duration,
        created_at=datetime.now(timezone.utc),
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return _enrich(task)


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return _enrich(task)


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(task, field, value)
    db.commit()
    db.refresh(task)
    return _enrich(task)


@router.patch("/{task_id}/complete", response_model=TaskResponse)
async def complete_task(
    task_id: str,
    payload: CompleteRequest,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if task.status == TaskStatus.COMPLETE:
        raise HTTPException(status_code=400, detail="Task already complete")

    task.status = TaskStatus.COMPLETE
    task.completed_at = datetime.now(timezone.utc)
    if payload.actual_duration is not None:
        task.actual_duration = payload.actual_duration

    db.commit()
    active_session = db.query(WorkSession).filter(WorkSession.ended_at.is_(None)).first()
    if active_session:
        active_session.tasks_completed = (active_session.tasks_completed or 0) + 1
        db.commit()
    # Synchronous TASK-block resolution
    resolve_task_blocks(task_id, db)

    db.refresh(task)
    return _enrich(task)


@router.patch("/{task_id}/block", response_model=TaskResponse)
async def block_task(
    task_id: str,
    payload: BlockRequest,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    task.status = TaskStatus.BLOCKED
    task.block_type = payload.block_type
    task.block_until = payload.block_until
    task.block_task_id = payload.block_task_id
    task.block_task_status_required = payload.block_task_status_required
    db.commit()
    db.refresh(task)
    return _enrich(task)


@router.patch("/{task_id}/unblock", response_model=TaskResponse)
async def unblock_task(
    task_id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    task.status = TaskStatus.QUEUED
    task.block_type = None
    task.block_until = None
    task.block_task_id = None
    task.block_task_status_required = None
    db.commit()
    db.refresh(task)
    return _enrich(task)

@router.patch("/{task_id}/mount", response_model=TaskResponse)
async def mount_task(
    task_id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if task.status != TaskStatus.QUEUED:
        raise HTTPException(status_code=400, detail="Only queued tasks can be mounted")
    task.mounted = True
    db.commit()
    db.refresh(task)
    return _enrich(task)


@router.patch("/{task_id}/unmount", response_model=TaskResponse)
async def unmount_task(
    task_id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    task.mounted = False
    db.commit()
    db.refresh(task)
    return _enrich(task)


# ---------------------------------------------------------------------------
# Artifacts
# ---------------------------------------------------------------------------

@router.post("/{task_id}/artifacts/upload", response_model=ArtifactResponse, status_code=201)
async def upload_artifact(
    task_id: str,
    label: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """Upload a file artifact. Validated against extension allowlist,
    written to the mounted task-files volume, capped at MAX_UPLOAD_BYTES."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    ext = _validate_extension(file.filename)

    artifact_id = str(uuid4())
    task_dir = ARTIFACT_STORAGE_ROOT / task_id
    task_dir.mkdir(parents=True, exist_ok=True)

    safe_filename = f"{artifact_id}_{file.filename}"
    dest_path = task_dir / safe_filename

    size = 0
    with open(dest_path, "wb") as out:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_UPLOAD_BYTES:
                out.close()
                dest_path.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=413,
                    detail=f"File exceeds {MAX_UPLOAD_BYTES // (1024*1024)}MB limit",
                )
            out.write(chunk)

    artifact = TaskArtifact(
        id=artifact_id,
        task_id=task_id,
        artifact_type=ArtifactType.FILE,
        label=label,
        url=None,
        file_path=str(dest_path),
        created_at=datetime.now(timezone.utc),
    )
    db.add(artifact)
    db.commit()
    db.refresh(artifact)
    return artifact


@router.post("/{task_id}/artifacts", response_model=ArtifactResponse, status_code=201)
async def add_artifact(
    task_id: str,
    artifact_type: str,
    label: str,
    url: str | None = None,
    file_path: str | None = None,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    artifact = TaskArtifact(
        id=str(uuid4()),
        task_id=task_id,
        artifact_type=artifact_type,
        label=label,
        url=url,
        file_path=file_path,
        created_at=datetime.now(timezone.utc),
    )
    db.add(artifact)
    db.commit()
    db.refresh(artifact)
    return artifact


@router.delete("/{task_id}/artifacts/{artifact_id}", status_code=204)
async def delete_artifact(
    task_id: str,
    artifact_id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    artifact = db.query(TaskArtifact).filter(
        TaskArtifact.id == artifact_id,
        TaskArtifact.task_id == task_id,
    ).first()
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")
    if artifact.artifact_type == ArtifactType.FILE and artifact.file_path:
        Path(artifact.file_path).unlink(missing_ok=True)
    db.delete(artifact)
    db.commit()


@router.get("/{task_id}/artifacts/{artifact_id}/download")
async def download_artifact(
    task_id: str,
    artifact_id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    artifact = db.query(TaskArtifact).filter(
        TaskArtifact.id == artifact_id,
        TaskArtifact.task_id == task_id,
    ).first()
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")
    if not artifact.file_path:
        raise HTTPException(status_code=400, detail="Artifact has no file path")
    return FileResponse(artifact.file_path, filename=artifact.label)


@router.get("/blocked", response_model=list[TaskResponse])
async def get_blocked_tasks(
    min_urgency: float = Query(default=0.0, ge=0.0, le=10.0),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """Blocked tasks, optionally filtered by minimum urgency. Paginated."""
    q = (
        db.query(Task)
        .filter(
            Task.status == TaskStatus.BLOCKED,
            Task.urgency_base >= min_urgency,
        )
        .order_by(Task.urgency.desc())
    )
    total = q.count()
    tasks = q.offset((page - 1) * limit).limit(limit).all()
    return [_enrich(t) for t in tasks]


# ---------------------------------------------------------------------------
# Blocked task endpoints
# ---------------------------------------------------------------------------

HIGH_URGENCY_THRESHOLD = 7.0  # Earmarked: move to hyperparameters


@router.get("/blocked", response_model=list[TaskResponse])
async def get_blocked_tasks(
    min_urgency: float = Query(default=0.0, ge=0.0, le=10.0),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """Blocked tasks optionally filtered by minimum urgency. Paginated."""
    q = (
        db.query(Task)
        .filter(
            Task.status == TaskStatus.BLOCKED,
            Task.urgency_base >= min_urgency,
        )
        .order_by(Task.urgency.desc())
    )
    tasks = q.offset((page - 1) * limit).limit(limit).all()
    return [_enrich(t) for t in tasks]


@router.get("/blocked/urgent", response_model=list[TaskResponse])
async def get_urgent_blocked_tasks(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """Blocked tasks with urgency >= 7.0 or due within 30 days.
    Earmarked: move threshold to hyperparameters.
    """
    now = datetime.now(timezone.utc)
    due_cutoff = now + timedelta(days=30)
    q = (
        db.query(Task)
        .filter(
            Task.status == TaskStatus.BLOCKED,
            (Task.urgency_base >= HIGH_URGENCY_THRESHOLD) |
            ((Task.due_date.isnot(None)) & (Task.due_date <= due_cutoff))
        )
        .order_by(Task.urgency.desc())
    )
    tasks = q.offset((page - 1) * limit).limit(limit).all()
    return [_enrich(t) for t in tasks]


@router.get("/blocked/count", response_model=dict)
async def count_blocked_tasks(
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """Returns counts for tray badge: total blocked and urgent blocked."""
    now = datetime.now(timezone.utc)
    due_cutoff = now + timedelta(days=30)
    total = db.query(Task).filter(Task.status == TaskStatus.BLOCKED).count()
    urgent = db.query(Task).filter(
        Task.status == TaskStatus.BLOCKED,
        (Task.urgency_base >= HIGH_URGENCY_THRESHOLD) |
        ((Task.due_date.isnot(None)) & (Task.due_date <= due_cutoff))
    ).count()
    return {"total": total, "urgent": urgent}
