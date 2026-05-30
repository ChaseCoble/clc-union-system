from datetime import datetime
from sqlalchemy import Column, String, DateTime, JSON
from backend.database import Base


class FocusCache(Base):
    __tablename__ = "focus_cache"

    id = Column(String, primary_key=True)
    composition = Column(JSON, default=list)
    built_at = Column(DateTime, default=datetime.utcnow)
