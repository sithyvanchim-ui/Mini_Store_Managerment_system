"""drop cash payment columns for aba only

Revision ID: 9d2999814d4c
Revises: 6b16b506fc7d
Create Date: 2026-11-11 14:11:50.806376

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = '9d2999814d4c'
down_revision: str | None = '6b16b506fc7d'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table('sales', schema=None) as batch_op:
        batch_op.drop_constraint('ck_sales_payment_method', type_='check')
        batch_op.drop_column('payment_method')
        batch_op.drop_column('cash_received')
        batch_op.drop_column('change_due')

    with op.batch_alter_table('daily_closes', schema=None) as batch_op:
        batch_op.drop_constraint(
            'ck_daily_closes_opening_nonnegative', type_='check'
        )
        batch_op.drop_column('opening_cash')
        batch_op.drop_column('cash_sales')
        batch_op.drop_column('expected_cash')
        batch_op.drop_column('counted_cash')


def downgrade() -> None:
    with op.batch_alter_table('daily_closes', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('opening_cash', sa.INTEGER(), nullable=False, server_default='0')
        )
        batch_op.add_column(
            sa.Column('cash_sales', sa.INTEGER(), nullable=False, server_default='0')
        )
        batch_op.add_column(sa.Column('expected_cash', sa.INTEGER(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('counted_cash', sa.INTEGER(), nullable=True))
        batch_op.create_check_constraint(
            'ck_daily_closes_opening_nonnegative', 'opening_cash >= 0'
        )

    with op.batch_alter_table('sales', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                'payment_method',
                sa.VARCHAR(length=16),
                nullable=False,
                server_default='cash',
            )
        )
        batch_op.add_column(sa.Column('cash_received', sa.INTEGER(), nullable=True))
        batch_op.add_column(sa.Column('change_due', sa.INTEGER(), nullable=True))
        batch_op.create_check_constraint(
            'ck_sales_payment_method', "payment_method IN ('cash', 'aba')"
        )

    # ### end Alembic commands ###
