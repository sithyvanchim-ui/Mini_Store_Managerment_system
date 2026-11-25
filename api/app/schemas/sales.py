"""Sales and checkout schemas.

Every sale settles electronically into the store's accounts — no cash. The
buyer chooses the channel at checkout: ABA KHQR, Alipay, card, Pi Pay, or
ACLEDA.
"""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

PaymentMethod = Literal["aba_khqr", "alipay", "card", "pi_pay", "acleda"]


class SaleItemCreate(BaseModel):
    product_id: UUID
    quantity: int = Field(gt=0)


class SaleCreate(BaseModel):
    items: list[SaleItemCreate] = Field(min_length=1)
    discount: int = Field(default=0, ge=0)
    payment_method: PaymentMethod = "aba_khqr"
    notes: str | None = Field(default=None, max_length=2000)


class SaleItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    product_id: UUID
    product_code: str
    product_name: str
    unit_price: int
    unit_cost: int
    quantity: int
    line_total: int
    line_profit: int


class SaleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    reference: str
    payment_method: str
    subtotal: int
    discount: int
    total: int
    status: Literal["completed", "voided"]
    channel: Literal["counter", "store"] = "counter"
    sold_by_name: str
    notes: str | None
    created_at: datetime
    items: list[SaleItemRead]
