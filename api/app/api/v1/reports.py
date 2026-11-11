"""Report endpoints: sales series and staff performance."""

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import Sale, SaleItem, User
from app.schemas.reports import ReportSalesPoint, StaffPerformance
from app.services.utils import day_bounds, parse_range

router = APIRouter(prefix="/reports", tags=["reports"])


async def _range_or_default(
    from_value: str | None, to_value: str | None
) -> tuple[datetime, datetime]:
    start, end = parse_range(from_value, to_value)
    if start is None or end is None:
        now = datetime.now(UTC)
        start = (now - timedelta(days=29)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        end = day_bounds(now.date())[1]
    return start, end


@router.get("/sales", response_model=list[ReportSalesPoint])
async def sales_report(
    from_value: str | None = Query(default=None, alias="from"),
    to_value: str | None = Query(default=None, alias="to"),
    group_by: str = Query(default="day"),
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ReportSalesPoint]:
    if group_by not in {"day", "month"}:
        raise HTTPException(status_code=400, detail="group_by must be 'day' or 'month'.")

    start, end = await _range_or_default(from_value, to_value)
    if group_by == "month":
        period_expr = (
            func.strftime("%Y-%m", Sale.created_at)
            if db.get_bind().dialect.name == "sqlite"
            else func.to_char(Sale.created_at, "YYYY-MM")
        )
    else:
        period_expr = func.date(Sale.created_at)

    sale_rows = await db.execute(
        select(
            period_expr.label("period"),
            func.count(func.distinct(Sale.id)),
            func.coalesce(func.sum(Sale.total), 0),
        )
        .select_from(Sale)
        .where(
            Sale.status == "completed",
            Sale.created_at >= start,
            Sale.created_at < end,
        )
        .group_by(period_expr)
    )
    per_period_sales = {
        str(row.period): (int(row[1] or 0), int(row[2] or 0))
        for row in sale_rows.all()
    }

    item_rows = await db.execute(
        select(
            period_expr.label("period"),
            func.coalesce(func.sum(SaleItem.quantity), 0),
            func.coalesce(func.sum(SaleItem.line_profit), 0),
        )
        .select_from(SaleItem)
        .join(Sale, Sale.id == SaleItem.sale_id)
        .where(
            Sale.status == "completed",
            Sale.created_at >= start,
            Sale.created_at < end,
        )
        .group_by(period_expr)
    )
    per_period_items = {
        str(row.period): (int(row[1] or 0), int(row[2] or 0))
        for row in item_rows.all()
    }

    def _period_sort_key(value: str) -> str:
        return value.replace("-", "")

    periods = sorted(
        set(per_period_sales) | set(per_period_items), key=_period_sort_key
    )
    return [
        ReportSalesPoint(
            period=period,
            revenue=per_period_sales.get(period, (0, 0))[1],
            profit=per_period_items.get(period, (0, 0))[1],
            units=per_period_items.get(period, (0, 0))[0],
            sales=per_period_sales.get(period, (0, 0))[0],
        )
        for period in periods
    ]


@router.get("/staff-performance", response_model=list[StaffPerformance])
async def staff_performance(
    from_value: str | None = Query(default=None, alias="from"),
    to_value: str | None = Query(default=None, alias="to"),
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[StaffPerformance]:
    start, end = await _range_or_default(from_value, to_value)
    rows = await db.execute(
        select(
            Sale.sold_by_id,
            User.name,
            func.count(func.distinct(Sale.id)),
            func.coalesce(func.sum(Sale.total), 0),
            func.coalesce(func.sum(SaleItem.quantity), 0),
        )
        .select_from(Sale)
        .join(User, User.id == Sale.sold_by_id)
        .join(SaleItem, SaleItem.sale_id == Sale.id)
        .where(
            Sale.status == "completed",
            Sale.created_at >= start,
            Sale.created_at < end,
        )
        .group_by(Sale.sold_by_id, User.name)
        .order_by(func.sum(Sale.total).desc())
    )
    return [
        StaffPerformance(
            user_id=row[0],
            name=row[1],
            sales_count=int(row[2] or 0),
            revenue=int(row[3] or 0),
            units=int(row[4] or 0),
        )
        for row in rows.all()
    ]
