from datetime import datetime, timezone, timezone, timezone
from sqlalchemy import Column, String, Float, DateTime, Boolean, Integer, JSON, Enum, ForeignKey
from backend.database import Base
from backend.models.enums import RuleClass


class Rule(Base):
    __tablename__ = "rules"

    id = Column(String, primary_key=True)
    rule_class = Column(Enum(RuleClass), nullable=False)
    name = Column(String, nullable=False)
    signal_name = Column(String, nullable=True)
    condition_operator = Column(String, nullable=True)   # gt, lt, gte, lte, eq
    condition_value = Column(Float, nullable=True)
    window_days = Column(Integer, nullable=True)
    actions = Column(JSON, default=list)                 # list of action strings
    message = Column(String, nullable=True)
    enabled = Column(Boolean, default=True)
    order = Column(Integer, nullable=False)
    is_system = Column(Boolean, default=False)           # system rules cannot be deleted


class RuleLog(Base):
    __tablename__ = "rule_log"

    id = Column(String, primary_key=True)
    rule_id = Column(String, ForeignKey("rules.id"), nullable=False)
    fired_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    signal_value = Column(Float, nullable=True)
    task_id = Column(String, ForeignKey("tasks.id"), nullable=True)
    actions_taken = Column(JSON, default=list)
    acknowledged = Column(Boolean, default=False)
    acknowledged_at = Column(DateTime, nullable=True)
