"""Dashboard aggregation endpoints."""

from datetime import UTC, datetime, time, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import ActivityLog, DailyClose, Product, Sale, SaleItem
from app.schemas.dashboard import (
    ActivityItem,
    DashboardPeriodStats,
    DashboardSummary,
    SalesTrendPoint,
)
from app.schemas.stock import CategoryMixItem, TopProduct

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _day_bounds(day: datetime) -> tuple[datetime, datetime]:
    start = datetime.combine(day.date(), time.min, tzinfo=UTC)
    return start, start + timedelta(days=1)


def _change_pct(current: int, previous: int) -> float:
    if previous <= 0:
        return 0.0
    return round((current - previous) / previous * 100.0, 1)


async def _period_stats(
    db: AsyncSession, start: datetime, end: datetime
) -> DashboardPeriodStats:
    rows = await db.execute(
        select(
            func.coalesce(func.count(func.distinct(Sale.id)), 0),
            func.coalesce(func.sum(Sale.total), 0),
            func.coalesce(func.sum(SaleItem.line_profit), 0),
            func.coalesce(func.sum(SaleItem.quantity), 0),
        )
        .select_from(Sale)
        .join(SaleItem, SaleItem.sale_id == Sale.id)
        .where(
            Sale.status == "completed",
            Sale.created_at >= start,
            Sale.created_at < end,
        )
    )
    sales_count, revenue, profit, units = rows.one()
    return DashboardPeriodStats(
        revenue=int(revenue or 0),
        gross_profit=int(profit or 0),
        units_sold=int(units or 0),
        sales_count=int(sales_count or 0),
    )


async def _aba_total(db: AsyncSession, start: datetime, end: datetime) -> int:
    return int(
        await db.scalar(
            select(func.coalesce(func.sum(Sale.total), 0)).where(
                Sale.status == "completed",
                Sale.created_at >= start,
                Sale.created_at < end,
            )
        )
        or 0
    )


@router.get("/summary", response_model=DashboardSummary)
async def dashboard_summary(
    _user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DashboardSummary:
    now = datetime.now(UTC)
    today_start, tomorrow_start = _day_bounds(now)
    yesterday_start = today_start - timedelta(days=1)

    today = await _period_stats(db, today_start, tomorrow_start)
    yesterday = await _period_stats(db, yesterday_start, today_start)
    aba_total = await _aba_total(db, today_start, tomorrow_start)

    products = await db.execute(
        select(Product.stock_qty, Product.low_stock_threshold).where(
            Product.is_active.is_(True)
        )
    )
    low_stock_count = 0
    out_of_stock_count = 0
    active_products = 0
    for stock_qty, threshold in products.all():
        active_products += 1
        if stock_qty <= 0:
            out_of_stock_count += 1
        elif stock_qty <= threshold:
            low_stock_count += 1

    inventory_value = int(
        await db.scalar(
            select(
                func.coalesce(
                    func.sum(Product.stock_qty * Product.cost_price), 0
                )
            ).where(Product.is_active.is_(True))
        )
        or 0
    )

    close_count = await db.scalar(
        select(func.count()).select_from(DailyClose).where(
            DailyClose.business_date == now.date()
        )
    )

    return DashboardSummary(
        today=today,
        yesterday=yesterday,
        revenue_change_pct=_change_pct(today.revenue, yesterday.revenue),
        profit_change_pct=_change_pct(today.gross_profit, yesterday.gross_profit),
        units_change_pct=_change_pct(today.units_sold, yesterday.units_sold),
        profit_margin_pct=round(
            (today.gross_profit / today.revenue * 100.0) if today.revenue else 0.0,
            1,
        ),
        low_stock_count=low_stock_count,
        out_of_stock_count=out_of_stock_count,
        active_products=active_products,
        inventory_value=inventory_value,
        aba_total=aba_total,
        daily_close_done=bool(close_count),
    )


@router.get("/sales-trend", response_model=list[SalesTrendPoint])
async def sales_trend(
    days: int = Query(default=7, ge=1, le=90),
    _user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[SalesTrendPoint]:
    now = datetime.now(UTC)
    first_start = _day_bounds(now - timedelta(days=days - 1))[0]

    sale_rows = await db.execute(
        select(
            func.date(Sale.created_at).label("sale_date"),
            func.count(func.distinct(Sale.id)),
            func.coalesce(func.sum(Sale.total), 0),
        )
        .select_from(Sale)
        .where(
            Sale.status == "completed",
            Sale.created_at >= first_start,
        )
        .group_by(func.date(Sale.created_at))
    )
    per_day_sales = {
        str(row.sale_date): (int(row[1] or 0), int(row[2] or 0))
        for row in sale_rows.all()
    }

    item_rows = await db.execute(
        select(
            func.date(Sale.created_at).label("sale_date"),
            func.coalesce(func.sum(SaleItem.quantity), 0),
            func.coalesce(func.sum(SaleItem.line_profit), 0),
        )
        .select_from(SaleItem)
        .join(Sale, Sale.id == SaleItem.sale_id)
        .where(
            Sale.status == "completed",
            Sale.created_at >= first_start,
        )
        .group_by(func.date(Sale.created_at))
    )
    per_day_items = {
        str(row.sale_date): (int(row[1] or 0), int(row[2] or 0))
        for row in item_rows.all()
    }

    points: list[SalesTrendPoint] = []
    for offset in range(days - 1, -1, -1):
        day = (now - timedelta(days=offset)).date()
        key = day.isoformat()
        sales_count, revenue = per_day_sales.get(key, (0, 0))
        units, profit = per_day_items.get(key, (0, 0))
        points.append(
            SalesTrendPoint(
                date=key,
                revenue=revenue,
                profit=profit,
                units=units,
                sales=sales_count,
            )
        )
    return points


@router.get("/category-mix", response_model=list[CategoryMixItem])
async def category_mix(
    days: int = Query(default=30, ge=1, le=365),
    _user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[CategoryMixItem]:
    start = datetime.now(UTC) - timedelta(days=days)

    rows = await db.execute(
        select(
            SaleItem.product_id,
            func.coalesce(func.sum(SaleItem.line_total), 0),
            func.coalesce(func.sum(SaleItem.quantity), 0),
        )
        .select_from(SaleItem)
        .join(Sale, Sale.id == SaleItem.sale_id)
        .where(
            Sale.status == "completed",
            Sale.created_at >= start,
        )
        .group_by(SaleItem.product_id)
    )

    product_rows = (
        await db.scalars(
            select(Product).options(selectinload(Product.category))
        )
    ).all()
    product_meta = {
        product.id: (
            product.category.name if product.category else "Uncategorised",
            product.category.color
            if product.category and product.category.color
            else "#AAB2F8",
        )
        for product in product_rows
    }

    total_revenue = 0
    buckets: dict[str, dict[str, float]] = {}
    for product_id, revenue, units in rows.all():
        name, color = product_meta.get(product_id, ("Uncategorised", "#AAB2F8"))
        bucket = buckets.setdefault(
            name, {"revenue": 0.0, "units": 0.0, "color": color}
        )
        bucket["revenue"] += float(revenue or 0)
        bucket["units"] += float(units or 0)
        total_revenue += float(revenue or 0)

    return [
        CategoryMixItem(
            category=name,
            revenue=int(data["revenue"]),
            units=int(data["units"]),
            percent=round(
                (data["revenue"] / total_revenue * 100.0) if total_revenue else 0.0,
                1,
            ),
            color=data["color"],
        )
        for name, data in sorted(buckets.items(), key=lambda pair: -pair[1]["revenue"])
    ]


@router.get("/top-products", response_model=list[TopProduct])
async def top_products(
    days: int = Query(default=30, ge=1, le=365),
    limit: int = Query(default=5, ge=1, le=50),
    _user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[TopProduct]:
    start = datetime.now(UTC) - timedelta(days=days)
    rows = await db.execute(
        select(
            SaleItem.product_id,
            Product.name,
            Product.code,
            func.coalesce(func.sum(SaleItem.quantity), 0),
            func.coalesce(func.sum(SaleItem.line_total), 0),
            func.coalesce(func.sum(SaleItem.line_profit), 0),
        )
        .select_from(SaleItem)
        .join(Sale, Sale.id == SaleItem.sale_id)
        .join(Product, Product.id == SaleItem.product_id)
        .where(
            Sale.status == "completed",
            Sale.created_at >= start,
        )
        .group_by(SaleItem.product_id, Product.name, Product.code)
        .order_by(func.sum(SaleItem.line_total).desc())
        .limit(limit)
    )
    return [
        TopProduct(
            product_id=row.product_id,
            name=row.name,
            code=row.code,
            units_sold=int(row[3] or 0),
            revenue=int(row[4] or 0),
            profit=int(row[5] or 0),
        )
        for row in rows.all()
    ]


@router.get("/recent-activity", response_model=list[ActivityItem])
async def recent_activity(
    limit: int = Query(default=8, ge=1, le=50),
    _user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ActivityItem]:
    rows = (
        await db.scalars(
            select(ActivityLog)
            .order_by(ActivityLog.created_at.desc(), ActivityLog.id.desc())
            .limit(limit)
        )
    ).all()
    return [
        ActivityItem(
            id=str(log.id),
            type=log.type,
            message=log.message,
            actor=log.actor_name,
            created_at=log.created_at,
        )
        for log in rows
    ]
