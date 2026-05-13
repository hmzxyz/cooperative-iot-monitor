"""add users.is_blocked column

Revision ID: 006
Revises: 005
Create Date: 2026-05-13

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "users" not in set(inspector.get_table_names()):
        return
    existing_columns = {col["name"] for col in inspector.get_columns("users")}
    if "is_blocked" not in existing_columns:
        op.add_column(
            "users",
            sa.Column("is_blocked", sa.Boolean(), nullable=False, server_default="false"),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "users" not in set(inspector.get_table_names()):
        return
    existing_columns = {col["name"] for col in inspector.get_columns("users")}
    if "is_blocked" in existing_columns:
        op.drop_column("users", "is_blocked")
