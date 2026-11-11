"""Stock views: summary, alerts, movements, and monthly history."""

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.errors import ApiError
from app.models import Product, Sale, SaleItem, StockMovement, User
from app.schemas.common import Page
from app.schemas.stock import (
    CategoryMixItem,
    LowStockItem,
    MonthlyStock,
    ProductStockRow,
    StockMovementRead,
    StockSummary,
    TopProduct,
)
from app.services.utils import month_bounds, month_key, parse_range

router = APIRouter(prefix="/stock", tags=["stock"])


async def _sale_totals_by_product(
    db: AsyncSession,
    start: datetime,
    end: datetime,
) -> dict[UUID, dict[str, int]]:
    """Completed-sale aggregates per product inside a UTC range."""

    rows = await db.execute(
        select(
            SaleItem.product_id,
            func.coalesce(func.sum(SaleItem.quantity), 0).label("units"),
            func.coalesce(func.sum(SaleItem.line_total), 0).label("revenue"),
            func.coalesce(func.sum(SaleItem.line_profit), 0).label("profit"),
        )
        .join(Sale, Sale.id == SaleItem.sale_id)
        .where(
            Sale.status == "completed",
            Sale.created_at >= start,
            Sale.created_at < end,
        )
        .group_by(SaleItem.product_id)
    )
    return {
        row.product_id: {
            "units": int(row.units or 0),
            "revenue": int(row.revenue or 0),
            "profit": int(row.profit or 0),
        }
        for row in rows.all()
    }


def _is_low(product: Product) -> bool:
    return 0 < product.stock_qty <= product.low_stock_threshold


def _alerts_for(products: list[Product]) -> list[LowStockItem]:
    alerts = [
        LowStockItem(
            product_id=product.id,
            name=product.name,
            code=product.code,
            stock_qty=product.stock_qty,
            threshold=product.low_stock_threshold,
            status=product.stock_status,
            slot_code=product.slot_code,
            category=product.category.name if product.category else "Uncategorised",
        )
        for product in products
        if product.stock_status != "in_stock"
    ]
    alerts.sort(key=lambda item: (item.status != "out_of_stock", item.stock_qty))
    return alerts


@router.get("/summary", response_model=StockSummary)
async def stock_summary(
    month: str | None = Query(default=None),
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StockSummary:
    month_value = month or month_key()
    try:
        start, end = month_bounds(month_value)
    except (ValueError, IndexError) as exc:
        raise ApiError(400, "Invalid month, expected YYYY-MM.", "invalid_month") from exc

    products = (
        await db.scalars(
            select(Product)
            .where(Product.is_active.is_(True))
            .order_by(Product.name)
            .options(selectinload(Product.category))
        )
    ).all()

    if not products:
        return StockSummary(
            month=month_value,
            product_count=0,
            total_units=0,
            inventory_value=0,
            retail_value=0,
            units_sold=0,
            revenue=0,
            gross_profit=0,
            low_stock_count=0,
            out_of_stock_count=0,
            category_mix=[],
            top_products=[],
            alerts=[],
            items=[],
        )

    month_totals = await _sale_totals_by_product(db, start, end)

    rows: list[ProductStockRow] = []
    units_sold = 0
    revenue = 0
    gross_profit = 0
    low_stock_count = 0
    out_of_stock_count = 0

    mix_totals: dict[str, dict[str, float]] = {}
    mix_colors: dict[str, str] = {}
    ranked: list[TopProduct] = []

    for product in products:
        totals_for_product = month_totals.get(product.id, {})
        sold_units = totals_for_product.get("units", 0)
        sold_revenue = totals_for_product.get("revenue", 0)
        sold_profit = totals_for_product.get("profit", 0)
        units_sold += sold_units
        revenue += sold_revenue
        gross_profit += sold_profit

        if product.stock_qty <= 0:
            out_of_stock_count += 1
        elif _is_low(product):
            low_stock_count += 1

        category_name = product.category.name if product.category else "Uncategorised"
        category_color = (
            product.category.color
            if product.category and product.category.color
            else "#AAB2F8"
        )
        bucket = mix_totals.setdefault(category_name, {"revenue": 0.0, "units": 0.0})
        bucket["revenue"] += sold_revenue
        bucket["units"] += sold_units
        mix_colors.setdefault(category_name, category_color)

        ranked.append(
            TopProduct(
                product_id=product.id,
                name=product.name,
                code=product.code,
                units_sold=sold_units,
                revenue=sold_revenue,
                profit=sold_profit,
            )
        )

        rows.append(
            ProductStockRow(
                id=product.id,
                code=product.code,
                name=product.name,
                category_id=product.category_id,
                category=product.category,
                package=product.package,
                cost_price=product.cost_price,
                selling_price=product.selling_price,
                stock_qty=product.stock_qty,
                low_stock_threshold=product.low_stock_threshold,
                location=product.location,
                slot_code=product.slot_code,
                is_active=product.is_active,
                margin=product.margin,
                stock_status=product.stock_status,
                created_at=product.created_at,
                updated_at=product.updated_at,
                units_sold=sold_units,
                revenue=sold_revenue,
                profit=sold_profit,
                retail_value=product.stock_qty * product.selling_price,
                cost_value=product.stock_qty * product.cost_price,
            )
        )

    total_units = sum(product.stock_qty for product in products)
    inventory_value = sum(product.stock_qty * product.cost_price for product in products)
    retail_value = sum(
        product.stock_qty * product.selling_price for product in products
    )

    category_mix = [
        CategoryMixItem(
            category=name,
            revenue=int(data["revenue"]),
            units=int(data["units"]),
            percent=round((data["revenue"] / revenue * 100.0) if revenue else 0.0, 1),
            color=mix_colors.get(name, "#AAB2F8"),
        )
        for name, data in sorted(mix_totals.items(), key=lambda pair: -pair[1]["revenue"])
    ]

    top_products = sorted(ranked, key=lambda item: (-item.units_sold, -item.revenue))[:5]

    return StockSummary(
        month=month_value,
        product_count=len(products),
        total_units=total_units,
        inventory_value=inventory_value,
        retail_value=retail_value,
        units_sold=units_sold,
        revenue=revenue,
        gross_profit=gross_profit,
        low_stock_count=low_stock_count,
        out_of_stock_count=out_of_stock_count,
        category_mix=category_mix,
        top_products=top_products,
        alerts=_alerts_for(products),
        items=rows,
    )


@router.get("/alerts", response_model=list[LowStockItem])
async def stock_alerts(
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[LowStockItem]:
    products = (
        await db.scalars(
            select(Product)
            .where(Product.is_active.is_(True))
            .order_by(Product.stock_qty.asc())
            .options(selectinload(Product.category))
        )
    ).all()
    return _alerts_for(products)


@router.get("/movements", response_model=Page[StockMovementRead])
async def stock_movements(
    product_id: UUID | None = Query(default=None),
    movement_type: str | None = Query(default=None, alias="type"),
    from_value: str | None = Query(default=None, alias="from"),
    to_value: str | None = Query(default=None, alias="to"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=30, ge=1, le=500),
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Page[StockMovementRead]:
    conditions = []
    if product_id:
        conditions.append(StockMovement.product_id == product_id)
    if movement_type:
        if movement_type not in {"restock", "sale", "adjustment", "waste", "void"}:
            raise ApiError(400, "Invalid movement type.", "invalid_type")
        conditions.append(StockMovement.type == movement_type)
    start, end = parse_range(from_value, to_value)
    if start:
        conditions.append(StockMovement.created_at >= start)
    if end:
        conditions.append(StockMovement.created_at < end)

    total = await db.scalar(select(func.count(StockMovement.id)).where(*conditions))
    movements = (
        await db.scalars(
            select(StockMovement)
            .where(*conditions)
            .order_by(StockMovement.created_at.desc(), StockMovement.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .options(
                selectinload(StockMovement.product),
                selectinload(StockMovement.created_by),
            )
        )
    ).all()
    return Page(
        items=[StockMovementRead.model_validate(movement) for movement in movements],
        total=int(total or 0),
        page=page,
        page_size=page_size,
    )


@router.get("/monthly", response_model=list[MonthlyStock])
async def stock_monthly(
    months: int = Query(default=6, ge=1, le=24),
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[MonthlyStock]:
    """Monthly sales history with reconstructed closing stock counts.

    Past-month closing units come from the movement ledger: current stock minus
    every movement recorded after that month's close.
    """

    now = datetime.now(UTC)
    year, month = now.year, now.month

    keys: list[str] = []
    boundaries: list[tuple[datetime, datetime]] = []
    for offset in range(months - 1, -1, -1):
        total = year * 12 + (month - 1) - offset
        shifted_year, shifted_month = total // 12, total % 12 + 1
        key = f"{shifted_year:04d}-{shifted_month:02d}"
        keys.append(key)
        boundaries.append(month_bounds(key))

    current_stock = int(
        await db.scalar(
            select(func.coalesce(func.sum(Product.stock_qty), 0)).where(
                Product.is_active.is_(True)
            )
        )
        or 0
    )

    response: list[MonthlyStock] = []
    for key, (start, end) in zip(keys, boundaries, strict=True):
        sale_rows = await db.execute(
            select(
                func.coalesce(func.sum(SaleItem.quantity), 0),
                func.coalesce(func.sum(SaleItem.line_total), 0),
                func.coalesce(func.sum(SaleItem.line_profit), 0),
            )
            .join(Sale, Sale.id == SaleItem.sale_id)
            .where(
                Sale.status == "completed",
                Sale.created_at >= start,
                Sale.created_at < end,
            )
        )
        units, revenue, profit = sale_rows.one()

        if key == month_key():
            closing_units = current_stock
        else:
            net_delta = await db.scalar(
                select(func.coalesce(func.sum(StockMovement.quantity_delta), 0)).where(
                    StockMovement.created_at > end
                )
            )
            closing_units = current_stock - int(net_delta or 0)

        response.append(
            MonthlyStock(
                month=key,
                units_sold=int(units or 0),
                revenue=int(revenue or 0),
                profit=int(profit or 0),
                closing_units=max(0, closing_units),
            )
        )
    return response
