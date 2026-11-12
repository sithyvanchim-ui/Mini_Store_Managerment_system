"""Shared schemas and validation helpers."""

import re
from typing import Annotated, Generic, TypeVar

from pydantic import BaseModel, StringConstraints, field_validator

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    sum: int | None = None


# Pydantic's EmailStr rejects reserved special-use domains (RFC 6761/6762,
# e.g. `.local`), which demo emails intentionally use. Validation is relaxed
# to a pragmatic "local@domain.tld" shape instead.
_EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

RelaxedEmail = Annotated[str, StringConstraints(max_length=200)]


def check_email(value: str) -> str:
    """Normalise and sanity-check an email address string."""

    cleaned = value.strip().lower()
    if not _EMAIL_PATTERN.match(cleaned):
        raise ValueError("Enter a valid email address.")
    return cleaned


class EmailValidationMixin(BaseModel):
    """Adds shared email validation to any schema with an `email` field."""

    @field_validator("email", check_fields=False)
    @classmethod
    def _validate_email(cls, value: str | None) -> str | None:
        return check_email(value) if value is not None else None
