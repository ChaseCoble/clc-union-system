from datetime import datetime, timezone, timezone, timezone
from sqlalchemy import Column, String, Integer, DateTime, JSON
from backend.database import Base


class Tab(Base):
    __tablename__ = "tabs"

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False)
    name = Column(String, nullable=False)
    order = Column(Integer, nullable=False)
    layout = Column(JSON, default=dict)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
