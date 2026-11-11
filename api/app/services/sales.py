"""Checkout and void services."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import ApiError
from app.models import Product, Sale, SaleItem, User
from app.schemas.sales import SaleCreate
from app.services.stock import add_stock_movement
from app.services.utils import add_activity, generate_reference


def _is_postgres(db: AsyncSession) -> bool:
    return db.get_bind().dialect.name == "postgresql"


async def load_sale(db: AsyncSession, sale_id: UUID) -> Sale:
    sale = await db.scalar(
        select(Sale)
        .where(Sale.id == sale_id)
        .options(selectinload(Sale.items), selectinload(Sale.sold_by))
    )
    if sale is None:
        raise ApiError(404, "Sale not found.", "sale_not_found")
    return sale


async def create_sale(
    db: AsyncSession,
    *,
    payload: SaleCreate,
    user: User,
    idempotency_key: str | None,
) -> Sale:
    if idempotency_key:
        existing = await db.scalar(
            select(Sale)
            .where(Sale.idempotency_key == idempotency_key[:120])
            .options(selectinload(Sale.items), selectinload(Sale.sold_by))
        )
        if existing is not None:
            return existing

    # Aggregate duplicate lines while preserving first-seen order.
    quantities: dict[UUID, int] = {}
    for item in payload.items:
        quantities[item.product_id] = quantities.get(item.product_id, 0) + item.quantity

    product_ids = list(quantities)
    stmt = select(Product).where(Product.id.in_(product_ids))
    if _is_postgres(db):
        stmt = stmt.with_for_update()
    products = {product.id: product for product in (await db.scalars(stmt)).all()}

    for product_id in product_ids:
        product = products.get(product_id)
        if product is None:
            raise ApiError(404, f"Product {product_id} not found.", "product_not_found")
        if not product.is_active:
            raise ApiError(
                400,
                f"Product {product.name} is inactive and cannot be sold.",
                "inactive_product",
            )
        requested = quantities[product_id]
        if requested > product.stock_qty:
            raise ApiError(
                409,
                f"Not enough stock for {product.name}. "
                f"Available: {product.stock_qty}, requested: {requested}.",
                "insufficient_stock",
            )

    now = datetime.now(UTC)
    reference = await generate_reference(db, Sale, Sale.created_at, "MS", now)

    subtotal = sum(
        products[product_id].selling_price * quantity
        for product_id, quantity in quantities.items()
    )
    if payload.discount > subtotal:
        raise ApiError(
            400,
            "Discount cannot be greater than the subtotal.",
            "invalid_discount",
        )
    total = subtotal - payload.discount

    sale = Sale(
        reference=reference,
        subtotal=subtotal,
        discount=payload.discount,
        total=total,
        status="completed",
        idempotency_key=idempotency_key[:120] if idempotency_key else None,
        sold_by_id=user.id,
        notes=payload.notes,
        created_at=now,
    )
    sale.items = []
    for product_id, quantity in quantities.items():
        product = products[product_id]
        line_total = product.selling_price * quantity
        line_profit = (product.selling_price - product.cost_price) * quantity
        sale.items.append(
            SaleItem(
                product_id=product.id,
                product_code=product.code,
                product_name=product.name,
                unit_price=product.selling_price,
                unit_cost=product.cost_price,
                quantity=quantity,
                line_total=line_total,
                line_profit=line_profit,
            )
        )
        product.stock_qty -= quantity
        add_stock_movement(
            db,
            product=product,
            movement_type="sale",
            quantity_delta=-quantity,
            unit_cost=product.cost_price,
            reference=reference,
            note=f"Sale {reference}",
            created_by=user,
            created_at=now,
        )

    db.add(sale)
    add_activity(
        db,
        activity_type="sale",
        message=f"Sale {reference} completed for {total:,} KHR.",
        actor=user,
        entity_type="sale",
        entity_id=str(sale.id),
        created_at=now,
    )
    await db.commit()
    return await load_sale(db, sale.id)


async def void_sale(db: AsyncSession, *, sale_id: UUID, user: User) -> Sale:
    sale = await load_sale(db, sale_id)
    if sale.status == "voided":
        raise ApiError(409, "This sale has already been voided.", "already_voided")

    product_ids = [item.product_id for item in sale.items]
    stmt = select(Product).where(Product.id.in_(product_ids))
    if _is_postgres(db):
        stmt = stmt.with_for_update()
    products = {product.id: product for product in (await db.scalars(stmt)).all()}

    now = datetime.now(UTC)
    for item in sale.items:
        product = products.get(item.product_id)
        if product is None:
            continue
        product.stock_qty += item.quantity
        add_stock_movement(
            db,
            product=product,
            movement_type="void",
            quantity_delta=item.quantity,
            unit_cost=item.unit_cost,
            reference=sale.reference,
            note=f"Void {sale.reference}",
            created_by=user,
            created_at=now,
        )

    sale.status = "voided"
    sale.voided_at = now
    sale.voided_by_id = user.id
    add_activity(
        db,
        activity_type="void",
        message=f"Sale {sale.reference} voided; stock restored.",
        actor=user,
        entity_type="sale",
        entity_id=str(sale.id),
        created_at=now,
    )
    await db.commit()
    return await load_sale(db, sale.id)
