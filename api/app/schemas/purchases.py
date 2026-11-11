"""Purchase schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.suppliers import SupplierBrief


class PurchaseItemCreate(BaseModel):
    product_id: UUID
    quantity: int = Field(gt=0)
    unit_cost: int = Field(ge=0)


class PurchaseCreate(BaseModel):
    supplier_id: UUID
    purchased_at: datetime | None = None
    notes: str | None = Field(default=None, max_length=2000)
    items: list[PurchaseItemCreate] = Field(min_length=1)


class PurchaseItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    product_id: UUID
    product_code: str
    product_name: str
    quantity: int
    unit_cost: int
    line_total: int


class PurchaseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    reference: str
    supplier_id: UUID
    supplier: SupplierBrief | None = None
    purchased_at: datetime
    total_quantity: int
    total_cost: int
    notes: str | None
    created_by_name: str
    items: list[PurchaseItemRead]
