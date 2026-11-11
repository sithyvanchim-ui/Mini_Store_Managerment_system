"""Daily close endpoints."""

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import DailyClose, User
from app.schemas.common import Page
from app.schemas.daily_closes import DailyCloseCreate, DailyClosePreview, DailyCloseRead
from app.services.daily_closes import build_preview, upsert_daily_close
from app.services.utils import parse_range

router = APIRouter(prefix="/daily-closes", tags=["daily-closes"])


@router.get("/today", response_model=DailyClosePreview)
async def today_close(
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DailyClosePreview:
    return await build_preview(db, date.today())


@router.post("", response_model=DailyCloseRead, status_code=201)
async def create_daily_close(
    payload: DailyCloseCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DailyCloseRead:
    close = await upsert_daily_close(db, payload=payload, user=user)
    return DailyCloseRead.model_validate(close)


@router.get("", response_model=Page[DailyCloseRead])
async def list_daily_closes(
    from_value: str | None = Query(default=None, alias="from"),
    to_value: str | None = Query(default=None, alias="to"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=500),
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Page[DailyCloseRead]:
    conditions = []
    start, end = parse_range(from_value, to_value)
    if start:
        conditions.append(DailyClose.business_date >= start.date())
    if end:
        conditions.append(DailyClose.business_date < end.date())

    total = await db.scalar(select(func.count(DailyClose.id)).where(*conditions))
    closes = (
        await db.scalars(
            select(DailyClose)
            .where(*conditions)
            .order_by(DailyClose.business_date.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .options(selectinload(DailyClose.closed_by))
        )
    ).all()
    return Page(
        items=[DailyCloseRead.model_validate(close) for close in closes],
        total=int(total or 0),
        page=page,
        page_size=page_size,
    )
