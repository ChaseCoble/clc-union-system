from datetime import datetime
from sqlalchemy import Column, String, DateTime
from backend.database import Base


class UIState(Base):
    __tablename__ = "ui_state"

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False, unique=True)
    active_tab_id = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
