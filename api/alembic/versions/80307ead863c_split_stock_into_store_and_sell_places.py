"""split stock into store and sell places

Revision ID: 80307ead863c
Revises: 801c064552ce
Create Date: 2026-11-24 00:00:00.000000

Each product now tracks two stock places: ``store_qty`` units are placed in
the customer-facing store and the remaining ``stock_qty - store_qty`` are held
for counter sales. Existing stock is treated as already on display so both
the storefront and the POS keep working after the upgrade.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "80307ead863c"
down_revision: str | None = "801c064552ce"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("products", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "store_qty",
                sa.Integer(),
                nullable=False,
                server_default="0",
            )
        )
        batch_op.create_check_constraint(
            "ck_products_store_nonnegative", "store_qty >= 0"
        )
        batch_op.create_check_constraint(
            "ck_products_store_within_stock", "store_qty <= stock_qty"
        )

    # Everything currently on hand is treated as being in the store.
    op.execute("UPDATE products SET store_qty = stock_qty")

    with op.batch_alter_table("sales", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "channel",
                sa.String(length=16),
                nullable=False,
                server_default="counter",
            )
        )
        batch_op.create_check_constraint(
            "ck_sales_channel", "channel IN ('counter', 'store')"
        )

    with op.batch_alter_table("stock_movements", schema=None) as batch_op:
        batch_op.drop_constraint("ck_stock_movements_type", type_="check")
        batch_op.create_check_constraint(
            "ck_stock_movements_type",
            "type IN ('restock', 'sale', 'adjustment', 'waste', 'void', 'transfer')",
        )


def downgrade() -> None:
    with op.batch_alter_table("stock_movements", schema=None) as batch_op:
        batch_op.drop_constraint("ck_stock_movements_type", type_="check")
        batch_op.create_check_constraint(
            "ck_stock_movements_type",
            "type IN ('restock', 'sale', 'adjustment', 'waste', 'void')",
        )

    with op.batch_alter_table("sales", schema=None) as batch_op:
        batch_op.drop_constraint("ck_sales_channel", type_="check")
        batch_op.drop_column("channel")

    with op.batch_alter_table("products", schema=None) as batch_op:
        batch_op.drop_constraint("ck_products_store_within_stock", type_="check")
        batch_op.drop_constraint("ck_products_store_nonnegative", type_="check")
        batch_op.drop_column("store_qty")
