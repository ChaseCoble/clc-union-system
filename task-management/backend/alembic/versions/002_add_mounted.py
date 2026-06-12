"""add mounted to tasks

Revision ID: 0002_add_mounted
Revises: 0001_initial
Create Date: 2026-06-09
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0002_add_mounted'
down_revision: Union[str, Sequence[str], None] = '0001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('tasks', sa.Column('mounted', sa.Boolean(), nullable=True, server_default='0'))


def downgrade() -> None:
    op.drop_column('tasks', 'mounted')
