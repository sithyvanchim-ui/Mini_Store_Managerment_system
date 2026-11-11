"""Auth and user schemas."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import EmailValidationMixin, RelaxedEmail


class LoginRequest(EmailValidationMixin):
    email: RelaxedEmail
    password: str = Field(min_length=1, max_length=200)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: str
    role: Literal["admin", "staff"]
    is_active: bool
    created_at: datetime


class LoginResponse(BaseModel):
    user: UserRead


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=200)
    new_password: str = Field(min_length=8, max_length=200)


class UserCreate(EmailValidationMixin):
    name: str = Field(min_length=1, max_length=120)
    email: RelaxedEmail
    password: str = Field(min_length=8, max_length=200)
    role: Literal["admin", "staff"] = "staff"


class UserUpdate(EmailValidationMixin):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    email: RelaxedEmail | None = None
    role: Literal["admin", "staff"] | None = None
    is_active: bool | None = None
