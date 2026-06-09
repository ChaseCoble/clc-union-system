from datetime import datetime
from sqlalchemy import Column, String, DateTime
from backend.database import Base


class Hyperparameter(Base):
    __tablename__ = "hyperparameters"

    id = Column(String, primary_key=True)
    key = Column(String, unique=True, nullable=False)
    value = Column(String, nullable=False)   # stored as string, cast on read
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# Default hyperparameter values — written on first migration
HYPERPARAMETER_DEFAULTS = {
    "aging_rate":              "1.2",
    "top_n_threshold":         "20",
    "bucket_0_slots":          "8",
    "bucket_1_slots":          "5",
    "bucket_2_slots":          "2",
    "bucket_3_slots":          "1",
    "cycle_length":            "11",
    "step_threshold":          "2",
    "difficulty_ceiling":      "12",
    "difficulty_target":       "9",
    "max_mounted_cards":       "3",
    "break_budget_ratio":      "0.2",
    "aging_sweep_interval":    "30",
}
