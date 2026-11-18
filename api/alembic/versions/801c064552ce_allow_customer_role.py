"""allow customer role

Revision ID: 801c064552ce
Revises: e65e1d9947f1
Create Date: 2026-11-18 12:30:00.000000

"""

from collections.abc import Sequence

from alembic import op

revision: str = "801c064552ce"
down_revision: str | None = "e65e1d9947f1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_constraint("ck_users_role", type_="check")
        batch_op.create_check_constraint(
            "ck_users_role",
            "role IN ('admin', 'staff', 'customer')",
        )


def downgrade() -> None:
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_constraint("ck_users_role", type_="check")
        batch_op.create_check_constraint(
            "ck_users_role",
            "role IN ('admin', 'staff')",
        )
