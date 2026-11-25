"""add charges table

Revision ID: 5a08821b9d37
Revises: 80307ead863c
Create Date: 2026-11-25 15:46:01.596440

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op
from app.models.models import UTCDateTime

revision: str = "5a08821b9d37"
down_revision: str | None = "80307ead863c"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "charges",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("reference", sa.String(length=40), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Uuid(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("created_by_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", UTCDateTime(timezone=True), nullable=False),
        sa.CheckConstraint("amount > 0", name="ck_charges_amount_positive"),
        sa.CheckConstraint(
            "status IN ('pending', 'paid')", name="ck_charges_status"
        ),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"]),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("reference"),
    )
    with op.batch_alter_table("charges", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_charges_product_id"), ["product_id"], unique=False)
        batch_op.create_index(batch_op.f("ix_charges_status"), ["status"], unique=False)
        batch_op.create_index(batch_op.f("ix_charges_created_by_id"), ["created_by_id"], unique=False)
        batch_op.create_index(batch_op.f("ix_charges_created_at"), ["created_at"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("charges", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_charges_created_at"))
        batch_op.drop_index(batch_op.f("ix_charges_created_by_id"))
        batch_op.drop_index(batch_op.f("ix_charges_status"))
        batch_op.drop_index(batch_op.f("ix_charges_product_id"))
    op.drop_table("charges")
