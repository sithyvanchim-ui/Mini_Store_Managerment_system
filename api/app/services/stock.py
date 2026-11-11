"""Stock ledger helpers."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Product, StockMovement, User


def add_stock_movement(
    db: AsyncSession,
    *,
    product: Product,
    movement_type: str,
    quantity_delta: int,
    unit_cost: int | None = None,
    reference: str | None = None,
    note: str | None = None,
    created_by: User | None = None,
    created_at: datetime | None = None,
) -> StockMovement:
    """Append a stock movement without committing.

    The caller is responsible for changing ``product.stock_qty`` and committing
    the surrounding transaction.
    """

    movement = StockMovement(
        product_id=product.id,
        type=movement_type,
        quantity_delta=quantity_delta,
        unit_cost=unit_cost,
        reference=reference,
        note=note,
        created_by_id=created_by.id if created_by else None,
    )
    if created_at is not None:
        movement.created_at = created_at
    db.add(movement)
    return movement
