from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, JSON
from backend.database import Base


class PanelRegistration(Base):
    __tablename__ = "panel_registrations"

    id = Column(String, primary_key=True)
    panel_id = Column(String, unique=True, nullable=False)
    display_name = Column(String, nullable=False)
    version = Column(String, nullable=False)
    service_url = Column(String, nullable=False)
    health_endpoint = Column(String, nullable=False)
    frontend_endpoint = Column(String, nullable=False)
    frontend_checksum = Column(String, nullable=False)
    api_base = Column(String, nullable=False)
    publishes = Column(JSON, default=list)
    subscribes = Column(JSON, default=list)
    verified = Column(Boolean, default=False)
    registered_at = Column(DateTime, default=datetime.utcnow)
    last_verified_at = Column(DateTime, nullable=True)
    focus_components = Column(JSON, default=list)
    required_role = Column(String, default="owner")
