"""Category schemas."""

from uuid import UUID

from pydantic import BaseModel, Field


class CategoryRead(BaseModel):
    id: UUID
    name: str
    color: str | None
    product_count: int = 0


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    color: str | None = Field(default=None, max_length=16)


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    color: str | None = Field(default=None, max_length=16)
