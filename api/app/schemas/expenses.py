"""Expense schemas — money paid out of the main ABA account."""

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

ExpenseCategory = Literal["restock", "supplies", "utility", "other"]


class ExpenseCreate(BaseModel):
    business_date: date
    category: ExpenseCategory = "other"
    description: str = Field(max_length=200)
    amount: int = Field(ge=0)


class ExpenseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    business_date: date
    category: ExpenseCategory
    description: str
    amount: int
    created_by_name: str
    created_at: datetime


__all__ = [
    "ExpenseCategory",
    "ExpenseCreate",
    "ExpenseRead",
]
