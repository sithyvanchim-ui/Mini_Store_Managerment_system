"""Purchase endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.errors import ApiError
from app.models import Purchase, User
from app.schemas.common import Page
from app.schemas.purchases import PurchaseCreate, PurchaseRead
from app.services.purchases import create_purchase as _create_purchase
from app.services.purchases import load_purchase as _load_purchase
from app.services.utils import parse_range

router = APIRouter(prefix="/purchases", tags=["purchases"])


@router.get("", response_model=Page[PurchaseRead])
async def list_purchases(
    supplier_id: UUID | None = Query(default=None),
    from_value: str | None = Query(default=None, alias="from"),
    to_value: str | None = Query(default=None, alias="to"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=500),
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Page[PurchaseRead]:
    conditions = []
    if supplier_id:
        conditions.append(Purchase.supplier_id == supplier_id)
    start, end = parse_range(from_value, to_value)
    if start:
        conditions.append(Purchase.purchased_at >= start)
    if end:
        conditions.append(Purchase.purchased_at < end)

    total = await db.scalar(select(func.count(Purchase.id)).where(*conditions))
    purchases = (
        await db.scalars(
            select(Purchase)
            .where(*conditions)
            .order_by(Purchase.purchased_at.desc(), Purchase.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()
    return Page(
        items=[PurchaseRead.model_validate(purchase) for purchase in purchases],
        total=int(total or 0),
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=PurchaseRead, status_code=201)
async def create_purchase(
    payload: PurchaseCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PurchaseRead:
    purchase = await _create_purchase(db, payload=payload, user=user)
    return PurchaseRead.model_validate(purchase)


@router.get("/{purchase_id}", response_model=PurchaseRead)
async def get_purchase(
    purchase_id: UUID,
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PurchaseRead:
    purchase = await _load_purchase(db, purchase_id)
    if purchase is None:
        raise ApiError(404, "Purchase not found.", "purchase_not_found")
    return PurchaseRead.model_validate(purchase)
