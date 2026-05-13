"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-04-28

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "sensor_readings" not in existing_tables:
        op.create_table(
            "sensor_readings",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("device_id", sa.String(), nullable=False),
            sa.Column("sensor_id", sa.String(), nullable=False),
            sa.Column("payload", sa.JSON(), nullable=False),
            sa.Column("timestamp", sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
        existing_tables.add("sensor_readings")

    if "sensor_readings" in existing_tables:
        existing_indexes = {idx["name"] for idx in inspector.get_indexes("sensor_readings")}
        if "ix_sensor_readings_device_id" not in existing_indexes:
            op.create_index("ix_sensor_readings_device_id", "sensor_readings", ["device_id"])
        if "ix_sensor_readings_sensor_id" not in existing_indexes:
            op.create_index("ix_sensor_readings_sensor_id", "sensor_readings", ["sensor_id"])

    if "users" not in existing_tables:
        op.create_table(
            "users",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("username", sa.String(), nullable=False),
            sa.Column("hashed_password", sa.String(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
        existing_tables.add("users")

    if "users" in existing_tables:
        existing_indexes = {idx["name"] for idx in inspector.get_indexes("users")}
        if "ix_users_username" not in existing_indexes:
            op.create_index("ix_users_username", "users", ["username"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_username", table_name="users")
    op.drop_table("users")
    op.drop_index("ix_sensor_readings_sensor_id", table_name="sensor_readings")
    op.drop_index("ix_sensor_readings_device_id", table_name="sensor_readings")
    op.drop_table("sensor_readings")
