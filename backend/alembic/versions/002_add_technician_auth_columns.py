"""add technician auth columns

Revision ID: 002
Revises: 001
Create Date: 2026-05-03

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())
    if "users" not in existing_tables:
        return

    existing_columns = {column["name"] for column in inspector.get_columns("users")}

    if "role" not in existing_columns:
        op.add_column("users", sa.Column("role", sa.String(), nullable=True))
    if "security_question" not in existing_columns:
        op.add_column("users", sa.Column("security_question", sa.String(), nullable=True))
    if "security_answer_hash" not in existing_columns:
        op.add_column("users", sa.Column("security_answer_hash", sa.String(), nullable=True))
    if "phone" not in existing_columns:
        op.add_column("users", sa.Column("phone", sa.String(), nullable=True))
    if "last_login" not in existing_columns:
        op.add_column("users", sa.Column("last_login", sa.DateTime(), nullable=True))

    op.execute("UPDATE users SET role = 'technician' WHERE role IS NULL")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())
    if "users" not in existing_tables:
        return

    existing_columns = {column["name"] for column in inspector.get_columns("users")}

    if "last_login" in existing_columns:
        op.drop_column("users", "last_login")
    if "phone" in existing_columns:
        op.drop_column("users", "phone")
    if "security_answer_hash" in existing_columns:
        op.drop_column("users", "security_answer_hash")
    if "security_question" in existing_columns:
        op.drop_column("users", "security_question")
    if "role" in existing_columns:
        op.drop_column("users", "role")
