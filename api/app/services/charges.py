"""Services for ABA charges against the shop's wallet."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import ApiError
from app.models import Charge, Product, User
from app.schemas.charges import ChargeCreate, ChargeRead
from app.services.utils import add_activity, generate_reference
from app.services.wallets import build_wallet_position


async def create_charge(
    db: AsyncSession,
    *,
    payload: ChargeCreate,
    user: User,
) -> Charge:
    """Create a pending ABA charge for a product using its selling price."""

    product = await db.scalar(select(Product).where(Product.id == payload.product_id))
    if product is None:
        raise ApiError(404, "Product not found.", "product_not_found")

    amount = product.selling_price * payload.quantity
    now = datetime.now(UTC)
    reference = await generate_reference(db, Charge, Charge.created_at, "CHARGE", now)
    charge = Charge(
        reference=reference,
        amount=amount,
        quantity=payload.quantity,
        product_id=product.id,
        note=payload.note,
        status="pending",
        created_by_id=user.id,
        created_at=now,
    )
    db.add(charge)
    await db.flush()
    add_activity(
        db,
        activity_type="charge",
        message=(
            f"Charged {charge.product_name} ({charge.reference}) — "
            f"{charge.amount} KHR."
        ),
        actor=user,
        entity_type="charge",
        entity_id=str(charge.id),
        created_at=now,
    )
    return charge


async def charge_read_model(
    db: AsyncSession,
    charge: Charge,
) -> ChargeRead:
    """Serialize a charge with its product, author, and wallet position."""

    wallet_position = await build_wallet_position(db)
    refreshed = await db.scalar(
        select(Charge).where(Charge.id == charge.id).options(
            selectinload(Charge.product),
            selectinload(Charge.created_by),
        )
    )
    if refreshed is None:
        raise ApiError(404, "Charge not found.", "charge_not_found")
    return ChargeRead.model_validate(refreshed).model_copy(
        update={"wallet_position": wallet_position}
    )


async def charge_list(
    db: AsyncSession,
    *,
    page: int,
    page_size: int,
) -> tuple[list[Charge], int]:
    total = await db.scalar(select(func.count(Charge.id)))
    charges = (
        await db.scalars(
            select(Charge)
            .order_by(Charge.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()
    return list(charges), int(total or 0)
