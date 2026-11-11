"""Purchase creation service."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import ApiError
from app.models import Product, Purchase, PurchaseItem, Supplier, User
from app.schemas.purchases import PurchaseCreate
from app.services.stock import add_stock_movement
from app.services.utils import add_activity, generate_reference


async def load_purchase(db: AsyncSession, purchase_id: UUID) -> Purchase:
    purchase = await db.scalar(
        select(Purchase)
        .where(Purchase.id == purchase_id)
        .options(selectinload(Purchase.items), selectinload(Purchase.supplier))
    )
    if purchase is None:
        raise ApiError(404, "Purchase not found.", "purchase_not_found")
    return purchase


async def create_purchase(
    db: AsyncSession,
    *,
    payload: PurchaseCreate,
    user: User,
) -> Purchase:
    supplier = await db.get(Supplier, payload.supplier_id)
    if supplier is None:
        raise ApiError(404, "Supplier not found.", "supplier_not_found")
    if not supplier.is_active:
        raise ApiError(400, "Supplier is inactive.", "supplier_inactive")

    product_ids = list({item.product_id for item in payload.items})
    stmt = select(Product).where(Product.id.in_(product_ids))
    if db.get_bind().dialect.name == "postgresql":
        stmt = stmt.with_for_update()
    products = {product.id: product for product in (await db.scalars(stmt)).all()}

    for item in payload.items:
        if item.product_id not in products:
            raise ApiError(
                404,
                f"Product {item.product_id} not found.",
                "product_not_found",
            )

    purchased_at = payload.purchased_at or datetime.now(UTC)
    if purchased_at.tzinfo is None:
        purchased_at = purchased_at.replace(tzinfo=UTC)
    else:
        purchased_at = purchased_at.astimezone(UTC)

    reference = await generate_reference(
        db, Purchase, Purchase.purchased_at, "PO", purchased_at
    )

    total_quantity = sum(item.quantity for item in payload.items)
    total_cost = sum(item.quantity * item.unit_cost for item in payload.items)

    purchase = Purchase(
        reference=reference,
        supplier_id=supplier.id,
        purchased_at=purchased_at,
        total_quantity=total_quantity,
        total_cost=total_cost,
        notes=payload.notes,
        created_by_id=user.id,
        created_at=datetime.now(UTC),
    )
    purchase.items = []
    for item in payload.items:
        product = products[item.product_id]
        purchase.items.append(
            PurchaseItem(
                product_id=product.id,
                product_code=product.code,
                product_name=product.name,
                quantity=item.quantity,
                unit_cost=item.unit_cost,
                line_total=item.quantity * item.unit_cost,
            )
        )
        product.stock_qty += item.quantity
        add_stock_movement(
            db,
            product=product,
            movement_type="restock",
            quantity_delta=item.quantity,
            unit_cost=item.unit_cost,
            reference=reference,
            note=f"Purchase from {supplier.name}",
            created_by=user,
            created_at=purchased_at,
        )

    db.add(purchase)
    add_activity(
        db,
        activity_type="restock",
        message=(
            f"Restocked {total_quantity} units from {supplier.name} "
            f"({reference})."
        ),
        actor=user,
        entity_type="purchase",
        entity_id=str(purchase.id),
        created_at=purchased_at,
    )
    await db.commit()
    return await load_purchase(db, purchase.id)
