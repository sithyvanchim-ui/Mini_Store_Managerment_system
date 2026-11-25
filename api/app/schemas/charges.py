"""ABA charge schemas — charge a product against the shop's ABA wallet."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.wallets import WalletPosition


class ChargeCreate(BaseModel):
    product_id: UUID
    quantity: int = Field(default=1, ge=1)
    note: str | None = Field(default=None, max_length=500)


class ChargeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    reference: str
    amount: int
    quantity: int
    product_code: str
    product_name: str
    note: str | None
    status: str
    qr: str | None = None
    wallet_position: WalletPosition | None = None
    created_by_name: str
    created_at: datetime


class ChargeListResponse(BaseModel):
    items: list[ChargeRead]
    total: int
