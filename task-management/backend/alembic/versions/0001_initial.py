"""initial

Revision ID: 0001_initial
Revises:
Create Date: 2026-06-08

"""
from typing import Sequence, Union
from uuid import uuid4
from datetime import datetime, timezone, timezone, timezone

from alembic import op
import sqlalchemy as sa


revision: str = '0001_initial'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'platforms',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('registered_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
    )

    op.create_table(
        'tasks',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('platform_id', sa.String(), nullable=True),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('work_type', sa.String(), nullable=False),
        sa.Column('enjoyability', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('bucket', sa.Integer(), nullable=False),
        sa.Column('urgency', sa.Float(), nullable=False),
        sa.Column('urgency_base', sa.Float(), nullable=False),
        sa.Column('top_n_cycles', sa.Integer(), nullable=False),
        sa.Column('block_type', sa.String(), nullable=True),
        sa.Column('block_until', sa.DateTime(), nullable=True),
        sa.Column('block_task_id', sa.String(), nullable=True),
        sa.Column('block_task_status_required', sa.String(), nullable=True),
        sa.Column('due_date', sa.DateTime(), nullable=True),
        sa.Column('estimated_duration', sa.Integer(), nullable=True),
        sa.Column('actual_duration', sa.Integer(), nullable=True),
        sa.Column('queue_tier', sa.String(), nullable=True),   # V2 data dependency
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['platform_id'], ['platforms.id']),
        sa.ForeignKeyConstraint(['block_task_id'], ['tasks.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'task_artifacts',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('task_id', sa.String(), nullable=False),
        sa.Column('artifact_type', sa.String(), nullable=False),
        sa.Column('label', sa.String(), nullable=False),
        sa.Column('url', sa.String(), nullable=True),
        sa.Column('file_path', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'sessions',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('ended_at', sa.DateTime(), nullable=True),
        sa.Column('tasks_completed', sa.Integer(), nullable=True),
        sa.Column('active_minutes', sa.Integer(), nullable=True),
        sa.Column('break_minutes', sa.Integer(), nullable=True),
        sa.Column('performance_score', sa.Float(), nullable=True),
        sa.Column('orphaned', sa.Boolean(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'health_events',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('session_id', sa.String(), nullable=True),
        sa.Column('event_type', sa.String(), nullable=False),
        sa.Column('signal_name', sa.String(), nullable=True),
        sa.Column('value', sa.Float(), nullable=True),
        sa.Column('flags', sa.JSON(), nullable=True),
        sa.Column('window_sum', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['session_id'], ['sessions.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'rules',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('rule_class', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('signal_name', sa.String(), nullable=True),
        sa.Column('condition_operator', sa.String(), nullable=True),
        sa.Column('condition_value', sa.Float(), nullable=True),
        sa.Column('window_days', sa.Integer(), nullable=True),
        sa.Column('actions', sa.JSON(), nullable=True),
        sa.Column('message', sa.String(), nullable=True),
        sa.Column('enabled', sa.Boolean(), nullable=True),
        sa.Column('order', sa.Integer(), nullable=False),
        sa.Column('is_system', sa.Boolean(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'rule_log',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('rule_id', sa.String(), nullable=False),
        sa.Column('fired_at', sa.DateTime(), nullable=True),
        sa.Column('signal_value', sa.Float(), nullable=True),
        sa.Column('task_id', sa.String(), nullable=True),
        sa.Column('actions_taken', sa.JSON(), nullable=True),
        sa.Column('acknowledged', sa.Boolean(), nullable=True),
        sa.Column('acknowledged_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['rule_id'], ['rules.id']),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'hyperparameters',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('key', sa.String(), nullable=False),
        sa.Column('value', sa.String(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('key'),
    )

    # Seed platforms
    platforms_table = sa.table('platforms',
        sa.column('id', sa.String),
        sa.column('name', sa.String),
        sa.column('registered_at', sa.DateTime),
    )
    now = datetime.now(timezone.utc)
    op.bulk_insert(platforms_table, [
        {"id": str(uuid4()), "name": "HackerOne",  "registered_at": now},
        {"id": str(uuid4()), "name": "Bugcrowd",   "registered_at": now},
        {"id": str(uuid4()), "name": "BTLO",       "registered_at": now},
        {"id": str(uuid4()), "name": "HTB",        "registered_at": now},
        {"id": str(uuid4()), "name": "FHSU",       "registered_at": now},
        {"id": str(uuid4()), "name": "Manual",     "registered_at": now},
    ])

    # Seed hyperparameter defaults
    from backend.models.hyperparameter import HYPERPARAMETER_DEFAULTS
    hp_table = sa.table('hyperparameters',
        sa.column('id', sa.String),
        sa.column('key', sa.String),
        sa.column('value', sa.String),
        sa.column('updated_at', sa.DateTime),
    )
    op.bulk_insert(hp_table, [
        {"id": str(uuid4()), "key": k, "value": v, "updated_at": now}
        for k, v in HYPERPARAMETER_DEFAULTS.items()
    ])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('rule_log')
    op.drop_table('rules')
    op.drop_table('health_events')
    op.drop_table('sessions')
    op.drop_table('task_artifacts')
    op.drop_table('tasks')
    op.drop_table('platforms')
    op.drop_table('hyperparameters')
