"""SQLAlchemy ORM models.

Money is stored as integer KHR, quantities as integers, and all timestamps are
timezone-aware UTC.  The schema avoids PostgreSQL-only column types so the same
Alembic migration runs on SQLite and PostgreSQL.
"""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    TypeDecorator,
    Uuid,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def utcnow() -> datetime:
    return datetime.now(UTC)


class UTCDateTime(TypeDecorator[datetime]):
    """Store naive UTC in SQLite, aware UTC in PostgreSQL, return aware UTC."""

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect: Any) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        return value.astimezone(UTC)

    def process_result_value(self, value: datetime | None, dialect: Any) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value.astimezone(UTC)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("role IN ('admin', 'staff')", name="ck_users_role"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(16), nullable=False, default="staff")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime, nullable=False, default=utcnow, onupdate=utcnow
    )


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(80), nullable=False, unique=True)
    color: Mapped[str | None] = mapped_column(String(16), nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime, nullable=False, default=utcnow, onupdate=utcnow
    )

    products: Mapped[list[Product]] = relationship(back_populates="category", lazy="selectin")


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint("cost_price >= 0", name="ck_products_cost_price_nonnegative"),
        CheckConstraint("selling_price >= 0", name="ck_products_selling_price_nonnegative"),
        CheckConstraint("stock_qty >= 0", name="ck_products_stock_nonnegative"),
        CheckConstraint(
            "low_stock_threshold >= 0", name="ck_products_threshold_nonnegative"
        ),
        CheckConstraint("location IN ('fridge', 'shelf')", name="ck_products_location"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(40), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    category_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("categories.id"), nullable=False, index=True
    )
    package: Mapped[str] = mapped_column(String(40), nullable=False)
    cost_price: Mapped[int] = mapped_column(Integer, nullable=False)
    selling_price: Mapped[int] = mapped_column(Integer, nullable=False)
    stock_qty: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    low_stock_threshold: Mapped[int] = mapped_column(Integer, nullable=False, default=6)
    location: Mapped[str] = mapped_column(String(16), nullable=False, default="fridge")
    slot_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime, nullable=False, default=utcnow, onupdate=utcnow
    )

    category: Mapped[Category] = relationship(back_populates="products", lazy="selectin")

    @property
    def margin(self) -> int:
        return self.selling_price - self.cost_price

    @property
    def stock_status(self) -> str:
        if self.stock_qty <= 0:
            return "out_of_stock"
        if self.stock_qty <= self.low_stock_threshold:
            return "low_stock"
        return "in_stock"


class Supplier(Base):
    __tablename__ = "suppliers"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(160), nullable=False, unique=True)
    contact_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime, nullable=False, default=utcnow, onupdate=utcnow
    )


class Purchase(Base):
    __tablename__ = "purchases"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    reference: Mapped[str] = mapped_column(String(40), nullable=False, unique=True)
    supplier_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("suppliers.id"), nullable=False, index=True
    )
    purchased_at: Mapped[datetime] = mapped_column(
        UTCDateTime, nullable=False, default=utcnow, index=True
    )
    total_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_cost: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime, nullable=False, default=utcnow, onupdate=utcnow
    )

    supplier: Mapped[Supplier] = relationship(lazy="selectin")
    created_by: Mapped[User | None] = relationship(lazy="selectin")
    items: Mapped[list[PurchaseItem]] = relationship(
        back_populates="purchase", cascade="all, delete-orphan", lazy="selectin"
    )

    @property
    def created_by_name(self) -> str:
        return self.created_by.name if self.created_by else "System"


class PurchaseItem(Base):
    __tablename__ = "purchase_items"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_purchase_items_quantity_positive"),
        CheckConstraint("unit_cost >= 0", name="ck_purchase_items_unit_cost_nonnegative"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    purchase_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("purchases.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("products.id"), nullable=False, index=True
    )
    product_code: Mapped[str] = mapped_column(String(40), nullable=False)
    product_name: Mapped[str] = mapped_column(String(160), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_cost: Mapped[int] = mapped_column(Integer, nullable=False)
    line_total: Mapped[int] = mapped_column(Integer, nullable=False)

    purchase: Mapped[Purchase] = relationship(back_populates="items")


class Sale(Base):
    __tablename__ = "sales"
    __table_args__ = (
        CheckConstraint("subtotal >= 0", name="ck_sales_subtotal_nonnegative"),
        CheckConstraint("discount >= 0", name="ck_sales_discount_nonnegative"),
        CheckConstraint("total >= 0", name="ck_sales_total_nonnegative"),
        CheckConstraint("status IN ('completed', 'voided')", name="ck_sales_status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    reference: Mapped[str] = mapped_column(String(40), nullable=False, unique=True)
    subtotal: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    discount: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="completed")
    idempotency_key: Mapped[str | None] = mapped_column(
        String(120), nullable=True, unique=True
    )
    sold_by_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=False, index=True
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime, nullable=False, default=utcnow, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime, nullable=False, default=utcnow, onupdate=utcnow
    )
    voided_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
    voided_by_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=True
    )

    sold_by: Mapped[User] = relationship(foreign_keys=[sold_by_id], lazy="selectin")
    voided_by: Mapped[User | None] = relationship(foreign_keys=[voided_by_id], lazy="selectin")
    items: Mapped[list[SaleItem]] = relationship(
        back_populates="sale", cascade="all, delete-orphan", lazy="selectin"
    )

    @property
    def sold_by_name(self) -> str:
        return self.sold_by.name if self.sold_by else ""


class SaleItem(Base):
    __tablename__ = "sale_items"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_sale_items_quantity_positive"),
        CheckConstraint("unit_price >= 0", name="ck_sale_items_unit_price_nonnegative"),
        CheckConstraint("unit_cost >= 0", name="ck_sale_items_unit_cost_nonnegative"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    sale_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("sales.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("products.id"), nullable=False, index=True
    )
    product_code: Mapped[str] = mapped_column(String(40), nullable=False)
    product_name: Mapped[str] = mapped_column(String(160), nullable=False)
    unit_price: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_cost: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    line_total: Mapped[int] = mapped_column(Integer, nullable=False)
    line_profit: Mapped[int] = mapped_column(Integer, nullable=False)

    sale: Mapped[Sale] = relationship(back_populates="items")


class StockMovement(Base):
    __tablename__ = "stock_movements"
    __table_args__ = (
        CheckConstraint(
            "type IN ('restock', 'sale', 'adjustment', 'waste', 'void')",
            name="ck_stock_movements_type",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("products.id"), nullable=False, index=True
    )
    type: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    quantity_delta: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_cost: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reference: Mapped[str | None] = mapped_column(String(80), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime, nullable=False, default=utcnow, index=True
    )

    product: Mapped[Product] = relationship(lazy="selectin")
    created_by: Mapped[User | None] = relationship(lazy="selectin")

    @property
    def product_code(self) -> str:
        return self.product.code

    @property
    def product_name(self) -> str:
        return self.product.name

    @property
    def created_by_name(self) -> str:
        return self.created_by.name if self.created_by else "System"


class DailyClose(Base):
    """End-of-day ABA reconciliation (the store settles via ABA only)."""

    __tablename__ = "daily_closes"
    __table_args__ = (
        CheckConstraint("expenses >= 0", name="ck_daily_closes_expenses_nonnegative"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    business_date: Mapped[date] = mapped_column(Date, nullable=False, unique=True, index=True)
    aba_sales: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_sales: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    gross_profit: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    expenses: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    variance: Mapped[int | None] = mapped_column(Integer, nullable=True)
    aba_balance: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    closed_by_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=True
    )
    closed_at: Mapped[datetime] = mapped_column(UTCDateTime, nullable=False, default=utcnow)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, nullable=False, default=utcnow)

    closed_by: Mapped[User | None] = relationship(lazy="selectin")

    @property
    def closed_by_name(self) -> str:
        return self.closed_by.name if self.closed_by else "System"


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    actor_name: Mapped[str] = mapped_column(String(120), nullable=False, default="System")
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=True
    )
    entity_type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    entity_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    meta: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime, nullable=False, default=utcnow, index=True
    )


class AppSettings(Base):
    __tablename__ = "app_settings"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    store_name: Mapped[str] = mapped_column(String(120), nullable=False, default="MiniStore")
    dorm_name: Mapped[str] = mapped_column(String(120), nullable=False, default="Block C Dorm")
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="KHR")
    low_stock_default: Mapped[int] = mapped_column(Integer, nullable=False, default=6)
    receipt_footer: Mapped[str] = mapped_column(
        Text, nullable=False, default="Thank you! Please keep the fridge tidy."
    )
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime, nullable=False, default=utcnow, onupdate=utcnow
    )


class FundRequest(Base):
    """Request to move money from the main ABA account for buying products."""

    __tablename__ = "fund_requests"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_fund_requests_amount_positive"),
        CheckConstraint(
            "status IN ('pending', 'approved', 'rejected', 'disbursed')",
            name="ck_fund_requests_status",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    reference: Mapped[str] = mapped_column(String(40), nullable=False, unique=True)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    purpose: Mapped[str] = mapped_column(String(200), nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="pending", index=True
    )
    requested_by_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=False, index=True
    )
    reviewed_by_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=True
    )
    decision_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime, nullable=False, default=utcnow, index=True
    )

    requested_by: Mapped[User] = relationship(
        foreign_keys=[requested_by_id], lazy="selectin"
    )
    reviewed_by: Mapped[User | None] = relationship(
        foreign_keys=[reviewed_by_id], lazy="selectin"
    )

    @property
    def requested_by_name(self) -> str:
        return self.requested_by.name if self.requested_by else ""

    @property
    def reviewed_by_name(self) -> str | None:
        return self.reviewed_by.name if self.reviewed_by else None


class Expense(Base):
    """Money paid out of the main ABA account during the day."""

    __tablename__ = "expenses"
    __table_args__ = (
        CheckConstraint("amount >= 0", name="ck_expenses_amount_nonnegative"),
        CheckConstraint(
            "category IN ('restock', 'supplies', 'utility', 'other')",
            name="ck_expenses_category",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    business_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(16), nullable=False, default="other")
    description: Mapped[str] = mapped_column(String(200), nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime, nullable=False, default=utcnow, index=True
    )

    created_by: Mapped[User] = relationship(foreign_keys=[created_by_id], lazy="selectin")

    @property
    def created_by_name(self) -> str:
        return self.created_by.name if self.created_by else ""
