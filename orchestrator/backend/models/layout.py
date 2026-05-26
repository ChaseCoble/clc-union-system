from datetime import datetime
from sqlalchemy import Column, String, DateTime, JSON, ForeignKey
from backend.database import Base


class UserLayout(Base):
    __tablename__ = "user_layouts"

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    layout = Column(JSON, default=dict)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
