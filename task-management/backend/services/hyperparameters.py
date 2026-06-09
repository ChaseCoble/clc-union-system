from sqlalchemy.orm import Session
from backend.models.hyperparameter import Hyperparameter, HYPERPARAMETER_DEFAULTS


def get_hp(db: Session, key: str, fallback=None):
    """Fetch a hyperparameter value, cast to float if numeric."""
    row = db.query(Hyperparameter).filter(Hyperparameter.key == key).first()
    if row is None:
        default = HYPERPARAMETER_DEFAULTS.get(key)
        raw = default if default is not None else str(fallback)
    else:
        raw = row.value
    try:
        return float(raw)
    except (TypeError, ValueError):
        return raw


def get_all(db: Session) -> dict[str, str]:
    rows = db.query(Hyperparameter).all()
    result = dict(HYPERPARAMETER_DEFAULTS)
    for row in rows:
        result[row.key] = row.value
    return result
