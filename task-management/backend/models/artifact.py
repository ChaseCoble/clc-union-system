from datetime import datetime
from sqlalchemy import Column, String, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from backend.database import Base
from backend.models.enums import ArtifactType


class TaskArtifact(Base):
    __tablename__ = "task_artifacts"

    id = Column(String, primary_key=True)
    task_id = Column(String, ForeignKey("tasks.id"), nullable=False)
    artifact_type = Column(Enum(ArtifactType), nullable=False)
    label = Column(String, nullable=False)
    url = Column(String, nullable=True)
    file_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    task = relationship("Task", back_populates="artifacts")
