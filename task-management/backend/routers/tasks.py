from uuid import uuid4
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.task import Task
from backend.models.artifact import TaskArtifact
from backend.models.enums import TaskStatus, BlockType, compute_difficulty
from backend.schemas.task import (
    TaskCreate, TaskUpdate, TaskResponse, TaskIntakeRequest,
    BlockRequest, CompleteRequest, ArtifactResponse,
)
from backend.services.auth import get_current_user, verify_service_token
from backend.services.queue import resolve_task_blocks

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


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


# ---------------------------------------------------------------------------
# Artifacts
# ---------------------------------------------------------------------------

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
