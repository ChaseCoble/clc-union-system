from datetime import datetime, timezone, timezone, timezone
from sqlalchemy import Column, String, Boolean, DateTime, JSON
from backend.database import Base


class Panel(Base):
    __tablename__ = "panels"

    id = Column(String, primary_key=True)
    service_id = Column(String, nullable=False)
    panel_id = Column(String, unique=True, nullable=False)
    display_name = Column(String, nullable=False)
    version = Column(String, nullable=False)
    service_url = Column(String, nullable=False)
    frontend_endpoint = Column(String, nullable=False)
    frontend_checksum = Column(String, nullable=False)
    api_base = Column(String, nullable=False)
    publishes = Column(JSON, default=list)
    subscribes = Column(JSON, default=list)
    focus_components = Column(JSON, default=list)
    required_role = Column(String, default="owner")
    metadata_ = Column("metadata", JSON, default=dict)
    verified = Column(Boolean, default=False)
    registered_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_verified_at = Column(DateTime, nullable=True)
