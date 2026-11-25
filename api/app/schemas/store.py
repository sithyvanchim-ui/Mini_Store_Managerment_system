"""Customer storefront schemas.

Customers browse the menu and check out themselves; staff workflows
(discounts, cost data, purchasing) are never exposed here.
"""

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.sales import PaymentMethod


class StoreProductRead(BaseModel):
    """A product as customers see it.

    ``stock_qty`` and ``stock_status`` describe the store display only —
    units held for counter sales are never visible to customers.
    """

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    package: str
    selling_price: int
    stock_qty: int
    location: Literal["fridge", "shelf"]
    stock_status: Literal["in_stock", "low_stock", "out_of_stock"]
    category_name: str | None = None


class StoreCheckoutItem(BaseModel):
    product_id: UUID
    quantity: int = Field(gt=0)


class StoreCheckoutCreate(BaseModel):
    """A customer self-checkout: no discount — that is a staff decision."""

    items: list[StoreCheckoutItem] = Field(min_length=1)
    payment_method: PaymentMethod = "aba_khqr"
    notes: str | None = Field(default=None, max_length=500)
