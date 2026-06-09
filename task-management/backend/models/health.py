from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, Enum, JSON, ForeignKey
from backend.database import Base


class HealthEvent(Base):
    __tablename__ = "health_events"

    id = Column(String, primary_key=True)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=True)
    event_type = Column(String, nullable=False)    # USER_REPORT | SIGNAL | SESSION_ORPHANED
    signal_name = Column(String, nullable=True)
    value = Column(Float, nullable=True)
    flags = Column(JSON, default=dict)
    window_sum = Column(Float, nullable=True)      # for second-derivative rule (V2)
    created_at = Column(DateTime, default=datetime.utcnow)
