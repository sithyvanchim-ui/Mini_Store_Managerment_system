"""Fund request schemas — money requested from the main ABA account."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class FundRequestCreate(BaseModel):
    amount: int = Field(gt=0, description="KHR to request from the main account.")
    purpose: str = Field(max_length=200)
    note: str | None = Field(default=None, max_length=2000)


class FundRequestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    reference: str
    amount: int
    purpose: str
    note: str | None
    status: Literal["pending", "approved", "rejected", "disbursed"]
    requested_by_name: str
    reviewed_by_name: str | None
    decision_note: str | None
    reviewed_at: datetime | None
    created_at: datetime


class FundReviewPayload(BaseModel):
    decision: Literal["approved", "rejected"]
    note: str | None = Field(default=None, max_length=2000)


__all__ = [
    "FundRequestCreate",
    "FundRequestRead",
    "FundReviewPayload",
]
