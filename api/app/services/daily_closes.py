"""Daily close calculations and upsert (ABA-only reconciliation).

MiniStore settles every sale through ABA. At close time the operator enters
the ABA wallet balance; the expected balance is ABA sales minus expenses paid
out of the wallet during the day, and the variance is the difference.
"""

from __future__ import annotations

from datetime import UTC, date, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import DailyClose, Sale, SaleItem, User
from app.schemas.daily_closes import DailyCloseCreate, DailyClosePreview
from app.services.utils import add_activity, day_bounds


async def sales_totals(db: AsyncSession, business_date: date) -> dict[str, int]:
    start, end = day_bounds(business_date)
    aba_sales = await db.scalar(
        select(func.coalesce(func.sum(Sale.total), 0)).where(
            Sale.status == "completed",
            Sale.created_at >= start,
            Sale.created_at < end,
        )
    )
    gross_profit = await db.scalar(
        select(func.coalesce(func.sum(SaleItem.line_profit), 0))
        .join(Sale, Sale.id == SaleItem.sale_id)
        .where(
            Sale.status == "completed",
            Sale.created_at >= start,
            Sale.created_at < end,
        )
    )
    return {
        "aba_sales": int(aba_sales or 0),
        "total_sales": int(aba_sales or 0),
        "gross_profit": int(gross_profit or 0),
    }


async def build_preview(
    db: AsyncSession, business_date: date
) -> DailyClosePreview:
    totals = await sales_totals(db, business_date)
    existing = await db.scalar(
        select(DailyClose).where(DailyClose.business_date == business_date)
    )
    return DailyClosePreview(
        business_date=business_date,
        **totals,
        expenses=existing.expenses if existing else 0,
        aba_balance=existing.aba_balance if existing else None,
        variance=existing.variance if existing else None,
        existing_close=existing,
    )


async def upsert_daily_close(
    db: AsyncSession,
    *,
    payload: DailyCloseCreate,
    user: User,
) -> DailyClose:
    totals = await sales_totals(db, payload.business_date)
    expected_aba = totals["aba_sales"] - payload.expenses
    variance = payload.aba_balance - expected_aba

    existing = await db.scalar(
        select(DailyClose).where(DailyClose.business_date == payload.business_date)
    )
    now = datetime.now(UTC)
    if existing is None:
        close = DailyClose(
            business_date=payload.business_date,
            aba_sales=totals["aba_sales"],
            total_sales=totals["total_sales"],
            gross_profit=totals["gross_profit"],
            expenses=payload.expenses,
            variance=variance,
            aba_balance=payload.aba_balance,
            notes=payload.notes,
            closed_by_id=user.id,
            closed_at=now,
        )
        db.add(close)
    else:
        close = existing
        close.aba_sales = totals["aba_sales"]
        close.total_sales = totals["total_sales"]
        close.gross_profit = totals["gross_profit"]
        close.expenses = payload.expenses
        close.variance = variance
        close.aba_balance = payload.aba_balance
        close.notes = payload.notes
        close.closed_by_id = user.id
        close.closed_at = now

    await db.flush()
    add_activity(
        db,
        activity_type="daily_close",
        message=(
            f"Daily close for {payload.business_date.isoformat()} recorded "
            f"(variance {variance:+,} KHR)."
        ),
        actor=user,
        entity_type="daily_close",
        entity_id=str(close.id),
        created_at=now,
    )
    await db.commit()
    refreshed = await db.scalar(
        select(DailyClose).where(DailyClose.id == close.id)
    )
    assert refreshed is not None
    return refreshed
