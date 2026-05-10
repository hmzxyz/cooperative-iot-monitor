"""add user email column

Revision ID: 003
Revises: 002
Create Date: 2026-05-10

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "users" not in set(inspector.get_table_names()):
        return

    existing_columns = {column["name"] for column in inspector.get_columns("users")}
    if "email" not in existing_columns:
        op.add_column("users", sa.Column("email", sa.String(), nullable=True))

    # Backfill email for any existing rows so we can enforce NOT NULL.
    op.execute(
        """
        UPDATE users
        SET email = CASE
          WHEN username ILIKE '%@%' THEN username
          ELSE username || '@local.invalid'
        END
        WHERE email IS NULL
        """
    )

    # Make sure it's non-null going forward (matches ORM model).
    op.alter_column("users", "email", existing_type=sa.String(), nullable=False)

    existing_indexes = {idx["name"] for idx in inspector.get_indexes("users")}
    if "ix_users_email" not in existing_indexes:
        op.create_index("ix_users_email", "users", ["email"], unique=True)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "users" not in set(inspector.get_table_names()):
        return

    existing_columns = {column["name"] for column in inspector.get_columns("users")}
    if "email" in existing_columns:
        existing_indexes = {idx["name"] for idx in inspector.get_indexes("users")}
        if "ix_users_email" in existing_indexes:
            op.drop_index("ix_users_email", table_name="users")
        op.drop_column("users", "email")

