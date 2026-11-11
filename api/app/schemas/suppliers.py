"""Supplier schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import EmailValidationMixin, RelaxedEmail


class SupplierRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    contact_name: str | None
    phone: str | None
    email: str | None
    address: str | None
    notes: str | None
    is_active: bool
    created_at: datetime


class SupplierBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str


class SupplierCreate(EmailValidationMixin):
    name: str = Field(min_length=1, max_length=160)
    contact_name: str | None = Field(default=None, max_length=120)
    phone: str | None = Field(default=None, max_length=40)
    email: RelaxedEmail | None = None
    address: str | None = Field(default=None, max_length=255)
    notes: str | None = Field(default=None, max_length=2000)


class SupplierUpdate(EmailValidationMixin):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    contact_name: str | None = Field(default=None, max_length=120)
    phone: str | None = Field(default=None, max_length=40)
    email: RelaxedEmail | None = None
    address: str | None = Field(default=None, max_length=255)
    notes: str | None = Field(default=None, max_length=2000)
    is_active: bool | None = None
