"""Queue rule engine.

Each rule is a callable with signature:
    rule(tasks: list[Task], context: dict) -> list[Task]

Rules are registered in order. The pipeline iterates the list — each rule
receives the output of the prior rule. Rules may DROP tasks by omitting them
from the returned list.

context contains:
    mode        WorkMode string
    db          SQLAlchemy Session
    hp          dict of hyperparameter values (float-cast where applicable)
    health_fn   callable(signal_name, value, task_id=None) — emits health signals
"""

from __future__ import annotations
from typing import Callable
from backend.models.task import Task
from backend.models.enums import (
    TaskStatus, WorkType, WorkMode, Enjoyability,
)
from backend.models.enums import compute_difficulty


# ---------------------------------------------------------------------------
# Rule type
# ---------------------------------------------------------------------------

RuleFn = Callable[[list[Task], dict], list[Task]]
_REGISTERED_RULES: list[RuleFn] = []


def register(fn: RuleFn) -> RuleFn:
    _REGISTERED_RULES.append(fn)
    return fn


# ---------------------------------------------------------------------------
# Rule 1: BlockFilterRule
# ---------------------------------------------------------------------------

@register
def block_filter_rule(tasks: list[Task], context: dict) -> list[Task]:
    """DROP all BLOCKED tasks."""
    drop_log = context.get("drop_log", {})
    result = []
    for t in tasks:
        if t.status == TaskStatus.BLOCKED:
            drop_log[t.id] = "BlockFilterRule — task is BLOCKED"
        else:
            result.append(t)
    return result


# ---------------------------------------------------------------------------
# Rule 2: ModeFilterRule
# ---------------------------------------------------------------------------

_MODE_ALLOWED: dict[str, set[str]] = {
    WorkMode.DEEP_WORK:  {WorkType.DEEP_WORK, WorkType.LIGHT_WORK, WorkType.PHONE_WORK},
    WorkMode.LIGHT_WORK: {WorkType.LIGHT_WORK, WorkType.PHONE_WORK},
    WorkMode.PHONE_WORK: {WorkType.PHONE_WORK},
}


@register
def mode_filter_rule(tasks: list[Task], context: dict) -> list[Task]:
    """DROP tasks whose work_type is not allowed in current mode."""
    allowed = _MODE_ALLOWED.get(context["mode"], set())
    drop_log = context.get("drop_log", {})
    result = []
    for t in tasks:
        if t.work_type in allowed:
            result.append(t)
        else:
            drop_log[t.id] = f"ModeFilterRule — {t.work_type} not allowed in {context['mode']}"
    return result


# ---------------------------------------------------------------------------
# Rule 3: AgingRule  (inline urgency bump — full sweep handled by aging.py)
# ---------------------------------------------------------------------------

@register
def aging_rule(tasks: list[Task], context: dict) -> list[Task]:
    """Increment top_n_cycles for all tasks that survived to this point.
    Aging sweep (urgency) is handled separately by aging.py on session
    activation and timer. Here we only track top-N exposure.
    """
    for task in tasks:
        task.top_n_cycles += 1
    return tasks


# ---------------------------------------------------------------------------
# Rule 4: BucketSlotRule
# ---------------------------------------------------------------------------

@register
def bucket_slot_rule(tasks: list[Task], context: dict) -> list[Task]:
    """Enforce MLFQ slot counts per cycle.
    Bucket 3 always gets its slot — nothing starves.
    """
    hp = context["hp"]
    slots = {
        0: int(float(hp.get("bucket_0_slots", 8))),
        1: int(float(hp.get("bucket_1_slots", 5))),
        2: int(float(hp.get("bucket_2_slots", 2))),
        3: int(float(hp.get("bucket_3_slots", 1))),
    }
    counts = {0: 0, 1: 0, 2: 0, 3: 0}
    drop_log = context.get("drop_log", {})
    result = []
    for task in tasks:
        b = task.bucket
        if counts[b] < slots[b]:
            result.append(task)
            counts[b] += 1
        else:
            drop_log[task.id] = f"BucketSlotRule — bucket {b} full ({slots[b]} slots used)"
    return result


# ---------------------------------------------------------------------------
# Rule 5: DifficultyAlternationRule
# ---------------------------------------------------------------------------

@register
def difficulty_alternation_rule(tasks: list[Task], context: dict) -> list[Task]:
    """Sliding-window difficulty ceiling and step constraint.
    Window sum of difficulty ordinals must not exceed ceiling.
    Adjacent task difficulty must not jump more than step_threshold.
    """
    hp = context["hp"]
    ceiling = float(hp.get("difficulty_ceiling", 12))
    target = float(hp.get("difficulty_target", 9))
    step = float(hp.get("step_threshold", 2))

    if not tasks:
        return tasks

    result: list[Task] = []
    window: list[float] = []
    prev_ordinal: float | None = None

    for task in tasks:
        _, ordinal = compute_difficulty(task.enjoyability, task.work_type)

        drop_log = context.get("drop_log", {})

        # Step constraint
        if prev_ordinal is not None and abs(ordinal - prev_ordinal) > step:
            drop_log[task.id] = f"DifficultyAlternationRule — step {abs(ordinal - prev_ordinal):.0f} exceeds threshold {step:.0f}"
            continue

        # Window ceiling
        window_sum = sum(window[-2:]) + ordinal  # 3-task window
        if window_sum > ceiling:
            drop_log[task.id] = f"DifficultyAlternationRule — window sum {window_sum:.0f} exceeds ceiling {ceiling:.0f}"
            continue

        result.append(task)
        window.append(float(ordinal))
        prev_ordinal = float(ordinal)

    return result


# ---------------------------------------------------------------------------
# Rule 6: EnjoyabilityRule
# ---------------------------------------------------------------------------

@register
def enjoyability_rule(tasks: list[Task], context: dict) -> list[Task]:
    """Hard rule: DREAD task must be followed by ENJOYABLE.
    Overrides step constraint from Rule 5.
    """
    if len(tasks) < 2:
        return tasks

    result: list[Task] = [tasks[0]]
    for i in range(1, len(tasks)):
        prev = result[-1]
        curr = tasks[i]
        if prev.enjoyability == Enjoyability.DREAD:
            if curr.enjoyability != Enjoyability.ENJOYABLE:
                # Scan forward for an ENJOYABLE task to insert
                for j in range(i, len(tasks)):
                    if tasks[j].enjoyability == Enjoyability.ENJOYABLE:
                        result.append(tasks[j])
                        # Continue the rest of the list without the swapped task
                        remaining = [t for t in tasks[i:] if t.id != tasks[j].id]
                        result.extend(remaining)
                        return result
                # No enjoyable task found — keep current anyway (best effort)
        result.append(curr)
    return result


# ---------------------------------------------------------------------------
# Rule 7: UrgencyStripRule — always last
# ---------------------------------------------------------------------------

@register
def urgency_strip_rule(tasks: list[Task], context: dict) -> list[Task]:
    """Strip urgency from task objects before returning.
    Urgency never leaves the backend. This rule is always last.
    """
    for task in tasks:
        task.urgency = None   # type: ignore[assignment]  # stripped for output only
    return tasks


# ---------------------------------------------------------------------------
# Pipeline runner
# ---------------------------------------------------------------------------

def run_pipeline(tasks: list[Task], context: dict) -> list[Task]:
    """Execute all registered rules in order.
    Takes the task list as input — never queries DB directly.
    Populates context["drop_log"] with {task_id: reason} if present.
    """
    result = list(tasks)
    for rule in _REGISTERED_RULES:
        result = rule(result, context)
    return result


def run_pipeline_with_drops(tasks: list[Task], context: dict) -> tuple[list[Task], dict]:
    """Execute pipeline and return (queued, drop_log).
    drop_log maps task_id -> reason string for every dropped task.
    """
    drop_log: dict[str, str] = {}
    context = {**context, "drop_log": drop_log}
    queued = run_pipeline(tasks, context)
    return queued, drop_log
