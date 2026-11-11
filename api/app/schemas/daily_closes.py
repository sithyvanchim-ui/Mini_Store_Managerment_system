"""Daily close schemas — ABA-only reconciliation."""

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.auth import UserRead


class DailyCloseCreate(BaseModel):
    business_date: date
    aba_balance: int = Field(ge=0, description="ABA wallet balance counted at close.")
    expenses: int = Field(default=0, ge=0)
    notes: str | None = Field(default=None, max_length=2000)


class DailyCloseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    business_date: date
    aba_sales: int
    total_sales: int
    gross_profit: int
    expenses: int
    aba_balance: int | None
    variance: int | None
    notes: str | None
    closed_by_name: str
    closed_at: datetime


class DailyClosePreview(BaseModel):
    business_date: date
    aba_sales: int
    total_sales: int
    gross_profit: int
    expenses: int
    aba_balance: int | None
    variance: int | None
    existing_close: DailyCloseRead | None


__all__ = ["DailyCloseCreate", "DailyClosePreview", "DailyCloseRead", "UserRead"]
