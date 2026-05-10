"""add sensor_readings bundle columns

Revision ID: 004
Revises: 003
Create Date: 2026-05-10

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "sensor_readings" not in set(inspector.get_table_names()):
        return

    existing_columns = {column["name"] for column in inspector.get_columns("sensor_readings")}

    if "tick" not in existing_columns:
        op.add_column("sensor_readings", sa.Column("tick", sa.Integer(), nullable=True))
        op.create_index("ix_sensor_readings_tick", "sensor_readings", ["tick"])

    if "status" not in existing_columns:
        op.add_column("sensor_readings", sa.Column("status", sa.String(), nullable=True))
        op.create_index("ix_sensor_readings_status", "sensor_readings", ["status"])

    if "anomaly_score" not in existing_columns:
        op.add_column("sensor_readings", sa.Column("anomaly_score", sa.Float(), nullable=True))

    if "decision_reason" not in existing_columns:
        op.add_column(
            "sensor_readings",
            sa.Column("decision_reason", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        )

    if "sensors" not in existing_columns:
        op.add_column(
            "sensor_readings",
            sa.Column("sensors", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "sensor_readings" not in set(inspector.get_table_names()):
        return

    existing_columns = {column["name"] for column in inspector.get_columns("sensor_readings")}
    existing_indexes = {idx["name"] for idx in inspector.get_indexes("sensor_readings")}

    if "sensors" in existing_columns:
        op.drop_column("sensor_readings", "sensors")
    if "decision_reason" in existing_columns:
        op.drop_column("sensor_readings", "decision_reason")
    if "anomaly_score" in existing_columns:
        op.drop_column("sensor_readings", "anomaly_score")
    if "ix_sensor_readings_status" in existing_indexes:
        op.drop_index("ix_sensor_readings_status", table_name="sensor_readings")
    if "status" in existing_columns:
        op.drop_column("sensor_readings", "status")
    if "ix_sensor_readings_tick" in existing_indexes:
        op.drop_index("ix_sensor_readings_tick", table_name="sensor_readings")
    if "tick" in existing_columns:
        op.drop_column("sensor_readings", "tick")

