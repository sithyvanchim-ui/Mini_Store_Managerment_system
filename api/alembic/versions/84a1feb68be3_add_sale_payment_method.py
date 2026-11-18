"""add sale payment method

Revision ID: 84a1feb68be3
Revises: 1314f0413a4f
Create Date: 2026-11-18 11:22:00.295667

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "84a1feb68be3"
down_revision: str | None = "1314f0413a4f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("sales", schema=None) as batch_op:
        # server_default backfills the 743 existing sales as ABA KHQR (the
        # only channel used before this change); it stays on the column,
        # which is harmless and keeps the batch copy-in one pass.
        batch_op.add_column(
            sa.Column(
                "payment_method",
                sa.String(length=16),
                nullable=False,
                server_default="aba_khqr",
            )
        )
        batch_op.create_check_constraint(
            "ck_sales_payment_method",
            "payment_method IN ('aba_khqr', 'alipay', 'card', 'pi_pay', 'acleda')",
        )


def downgrade() -> None:
    with op.batch_alter_table("sales", schema=None) as batch_op:
        batch_op.drop_constraint("ck_sales_payment_method", type_="check")
        batch_op.drop_column("payment_method")
