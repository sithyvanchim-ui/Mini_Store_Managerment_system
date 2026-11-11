"""Dashboard schemas."""

from datetime import datetime

from pydantic import BaseModel


class DashboardPeriodStats(BaseModel):
    revenue: int
    gross_profit: int
    units_sold: int
    sales_count: int


class DashboardSummary(BaseModel):
    today: DashboardPeriodStats
    yesterday: DashboardPeriodStats
    revenue_change_pct: float
    profit_change_pct: float
    units_change_pct: float
    profit_margin_pct: float
    low_stock_count: int
    out_of_stock_count: int
    active_products: int
    inventory_value: int
    aba_total: int
    daily_close_done: bool


class SalesTrendPoint(BaseModel):
    date: str
    revenue: int
    profit: int
    units: int
    sales: int


class ActivityItem(BaseModel):
    id: str
    type: str
    message: str
    actor: str
    created_at: datetime
