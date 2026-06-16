from datetime import datetime, timezone, timezone, timezone
from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import relationship
from backend.database import Base


class Platform(Base):
    __tablename__ = "platforms"

    id = Column(String, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    registered_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    tasks = relationship("Task", back_populates="platform")
