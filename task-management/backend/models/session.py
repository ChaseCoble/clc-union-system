from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean
from backend.database import Base


class WorkSession(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    tasks_completed = Column(Integer, default=0)
    active_minutes = Column(Integer, default=0)
    break_minutes = Column(Integer, default=0)
    performance_score = Column(Float, nullable=True)
    orphaned = Column(Boolean, default=False)
