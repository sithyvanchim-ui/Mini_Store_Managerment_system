"""Sales endpoints: checkout, history, detail, and void."""

from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.core.errors import ApiError
from app.models import Sale, User
from app.schemas.common import Page
from app.schemas.sales import SaleCreate, SaleRead
from app.services.sales import create_sale as _create_sale
from app.services.sales import load_sale as _load_sale
from app.services.sales import void_sale as _void_sale
from app.services.utils import parse_range

router = APIRouter(prefix="/sales", tags=["sales"])


async def _sale_page(
    db: AsyncSession,
    conditions: list,
    page: int,
    page_size: int,
) -> Page[SaleRead]:
    total = await db.scalar(select(func.count(Sale.id)).where(*conditions))
    sales = (
        await db.scalars(
            select(Sale)
            .where(*conditions)
            .order_by(Sale.created_at.desc(), Sale.reference.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .options(selectinload(Sale.items), selectinload(Sale.sold_by))
        )
    ).all()
    return Page(
        items=[SaleRead.model_validate(sale) for sale in sales],
        total=int(total or 0),
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=SaleRead, status_code=201)
async def create_sale(
    payload: SaleCreate,
    idempotency_key: str | None = Header(default=None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SaleRead:
    sale = await _create_sale(
        db,
        payload=payload,
        user=user,
        idempotency_key=idempotency_key.strip() if idempotency_key else None,
    )
    return SaleRead.model_validate(sale)


@router.get("", response_model=Page[SaleRead])
async def list_sales(
    q: str | None = Query(default=None),
    status: str | None = Query(default=None),
    from_value: str | None = Query(default=None, alias="from"),
    to_value: str | None = Query(default=None, alias="to"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=500),
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Page[SaleRead]:
    conditions = []
    if q:
        conditions.append(Sale.reference.ilike(f"%{q.strip()}%"))
    if status:
        if status not in {"completed", "voided"}:
            raise ApiError(400, "Invalid sale status filter.", "invalid_status")
        conditions.append(Sale.status == status)
    start, end = parse_range(from_value, to_value)
    if start:
        conditions.append(Sale.created_at >= start)
    if end:
        conditions.append(Sale.created_at < end)
    return await _sale_page(db, conditions, page, page_size)


@router.get("/{sale_id}", response_model=SaleRead)
async def get_sale(
    sale_id: UUID,
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SaleRead:
    sale = await _load_sale(db, sale_id)
    return SaleRead.model_validate(sale)


@router.post("/{sale_id}/void", response_model=SaleRead)
async def void_sale_endpoint(
    sale_id: UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> SaleRead:
    sale = await _void_sale(db, sale_id=sale_id, user=admin)
    return SaleRead.model_validate(sale)
