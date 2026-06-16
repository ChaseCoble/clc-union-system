from datetime import datetime, timezone, timezone, timezone
from sqlalchemy import Column, String, DateTime
from backend.database import Base


class Service(Base):
    __tablename__ = "services"

    id = Column(String, primary_key=True)
    service_id = Column(String, unique=True, nullable=False)
    service_token = Column(String, unique=True, nullable=False)
    service_url = Column(String, nullable=False)
    health_endpoint = Column(String, nullable=False)
    registered_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_seen_at = Column(DateTime, nullable=True)
