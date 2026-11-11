"""Application settings schemas."""

from pydantic import BaseModel, ConfigDict, Field


class AppSettingsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    store_name: str
    dorm_name: str
    currency: str
    low_stock_default: int
    receipt_footer: str


class AppSettingsUpdate(BaseModel):
    store_name: str | None = Field(default=None, min_length=1, max_length=120)
    dorm_name: str | None = Field(default=None, min_length=1, max_length=120)
    currency: str | None = Field(default=None, min_length=1, max_length=8)
    low_stock_default: int | None = Field(default=None, ge=0)
    receipt_footer: str | None = Field(default=None, max_length=2000)
