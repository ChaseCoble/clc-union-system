import enum


class WorkType(str, enum.Enum):
    DEEP_WORK = "DEEP_WORK"
    LIGHT_WORK = "LIGHT_WORK"
    PHONE_WORK = "PHONE_WORK"


class Enjoyability(str, enum.Enum):
    ENJOYABLE = "ENJOYABLE"
    PLEASANT = "PLEASANT"
    NEUTRAL = "NEUTRAL"
    DIFFICULT = "DIFFICULT"
    DREAD = "DREAD"


class TaskStatus(str, enum.Enum):
    QUEUED = "QUEUED"
    BLOCKED = "BLOCKED"
    COMPLETE = "COMPLETE"


class BlockType(str, enum.Enum):
    MANUAL = "MANUAL"
    DATE = "DATE"
    TIMER = "TIMER"
    TASK = "TASK"


class QueueTier(str, enum.Enum):
    HOT = "HOT"
    COLD = "COLD"


class ArtifactType(str, enum.Enum):
    LINK = "LINK"
    FILE = "FILE"


class RuleClass(str, enum.Enum):
    QUEUE = "QUEUE"
    HEALTH = "HEALTH"


class WorkMode(str, enum.Enum):
    DEEP_WORK = "DEEP_WORK"
    LIGHT_WORK = "LIGHT_WORK"
    PHONE_WORK = "PHONE_WORK"


# Difficulty ordinal lookup table: (enjoyability, work_type) -> (label, ordinal)
# Sliding window: each enjoyability row maps work_type to a difficulty band
DIFFICULTY_TABLE: dict[tuple[str, str], tuple[str, int]] = {
    (Enjoyability.ENJOYABLE, WorkType.DEEP_WORK):   ("Ephemeral",  1),
    (Enjoyability.ENJOYABLE, WorkType.LIGHT_WORK):  ("Trivial",    2),
    (Enjoyability.ENJOYABLE, WorkType.PHONE_WORK):  ("Light",      3),
    (Enjoyability.PLEASANT,  WorkType.DEEP_WORK):   ("Trivial",    2),
    (Enjoyability.PLEASANT,  WorkType.LIGHT_WORK):  ("Light",      3),
    (Enjoyability.PLEASANT,  WorkType.PHONE_WORK):  ("Moderate",   5),
    (Enjoyability.NEUTRAL,   WorkType.DEEP_WORK):   ("Light",      3),
    (Enjoyability.NEUTRAL,   WorkType.LIGHT_WORK):  ("Moderate",   5),
    (Enjoyability.NEUTRAL,   WorkType.PHONE_WORK):  ("Hard",       7),
    (Enjoyability.DIFFICULT, WorkType.DEEP_WORK):   ("Moderate",   5),
    (Enjoyability.DIFFICULT, WorkType.LIGHT_WORK):  ("Hard",       7),
    (Enjoyability.DIFFICULT, WorkType.PHONE_WORK):  ("Severe",     9),
    (Enjoyability.DREAD,     WorkType.DEEP_WORK):   ("Hard",       7),
    (Enjoyability.DREAD,     WorkType.LIGHT_WORK):  ("Severe",     9),
    (Enjoyability.DREAD,     WorkType.PHONE_WORK):  ("Extreme",   10),
}


def compute_difficulty(enjoyability: str, work_type: str) -> tuple[str, int]:
    """Return (difficulty_label, difficulty_ordinal) for a task. Never stored."""
    return DIFFICULTY_TABLE.get(
        (enjoyability, work_type),
        ("Unknown", 0),
    )
