"""Product schemas."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ProductCategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    color: str | None


class ProductRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    name: str
    category_id: UUID
    category: ProductCategoryRead | None = None
    package: str
    cost_price: int
    selling_price: int
    stock_qty: int
    low_stock_threshold: int
    location: Literal["fridge", "shelf"]
    slot_code: str | None
    is_active: bool
    margin: int
    stock_status: Literal["in_stock", "low_stock", "out_of_stock"]
    created_at: datetime
    updated_at: datetime


class ProductCreate(BaseModel):
    code: str = Field(min_length=1, max_length=40)
    name: str = Field(min_length=1, max_length=160)
    category_id: UUID
    package: str = Field(min_length=1, max_length=40)
    cost_price: int = Field(ge=0)
    selling_price: int = Field(ge=0)
    stock_qty: int = Field(default=0, ge=0)
    low_stock_threshold: int = Field(default=6, ge=0)
    location: Literal["fridge", "shelf"] = "fridge"
    slot_code: str | None = Field(default=None, max_length=20)
    is_active: bool = True


class ProductUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=1, max_length=40)
    name: str | None = Field(default=None, min_length=1, max_length=160)
    category_id: UUID | None = None
    package: str | None = Field(default=None, min_length=1, max_length=40)
    cost_price: int | None = Field(default=None, ge=0)
    selling_price: int | None = Field(default=None, ge=0)
    low_stock_threshold: int | None = Field(default=None, ge=0)
    location: Literal["fridge", "shelf"] | None = None
    slot_code: str | None = Field(default=None, max_length=20)
    is_active: bool | None = None


class StockAdjustRequest(BaseModel):
    type: Literal["restock", "adjustment", "waste"]
    quantity: int = Field(gt=0)
    note: str | None = Field(default=None, max_length=500)
