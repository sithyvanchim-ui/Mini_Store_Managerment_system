"""Stock views and movement schemas."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.schemas.products import ProductRead


class StockMovementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    product_id: UUID
    product_code: str
    product_name: str
    type: Literal["restock", "sale", "adjustment", "waste", "void"]
    quantity_delta: int
    unit_cost: int | None
    reference: str | None
    note: str | None
    created_by_name: str
    created_at: datetime


class LowStockItem(BaseModel):
    product_id: UUID
    name: str
    code: str
    stock_qty: int
    threshold: int
    status: Literal["in_stock", "low_stock", "out_of_stock"]
    slot_code: str | None
    category: str


class ProductStockRow(ProductRead):
    units_sold: int = 0
    revenue: int = 0
    profit: int = 0
    retail_value: int = 0
    cost_value: int = 0


class CategoryMixItem(BaseModel):
    category: str
    revenue: int
    units: int
    percent: float
    color: str


class TopProduct(BaseModel):
    product_id: UUID
    name: str
    code: str
    units_sold: int
    revenue: int
    profit: int


class StockSummary(BaseModel):
    month: str
    product_count: int
    total_units: int
    inventory_value: int
    retail_value: int
    units_sold: int
    revenue: int
    gross_profit: int
    low_stock_count: int
    out_of_stock_count: int
    category_mix: list[CategoryMixItem]
    top_products: list[TopProduct]
    alerts: list[LowStockItem]
    items: list[ProductStockRow]


class MonthlyStock(BaseModel):
    month: str
    units_sold: int
    revenue: int
    profit: int
    closing_units: int
