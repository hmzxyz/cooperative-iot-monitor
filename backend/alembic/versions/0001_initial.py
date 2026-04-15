"""initial migration

Revision ID: 0001_initial
Revises: 
Create Date: 2026-04-15 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("email", sa.String(length=256), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(length=256), nullable=False),
        sa.Column("full_name", sa.String(length=256), nullable=True),
        sa.Column("role", sa.Enum("user", "admin", name="roleenum"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_table(
        "sensor_readings",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("temperature", sa.Float(), nullable=False),
        sa.Column("pressure", sa.Float(), nullable=False),
        sa.Column("milk_weight", sa.Float(), nullable=False),
        sa.Column("alert", sa.String(length=128), nullable=True),
        sa.Column("topic", sa.String(length=256), nullable=False),
        sa.Column("payload", sa.Text(), nullable=False),
        sa.Column("received_at", sa.DateTime(), nullable=True),
        sa.Column("owner_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("sensor_readings")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS roleenum")
