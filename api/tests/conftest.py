"""Shared pytest fixtures for the MiniStore API test suite.

The suite runs against a dedicated SQLite file database configured via the
DATABASE_URL environment variable, which must be set before any ``app`` module
is imported (conftest imports happen before test modules).
"""

from __future__ import annotations

import os
from collections.abc import AsyncIterator, Iterator
from datetime import UTC, datetime
from pathlib import Path

import pytest
import pytest_asyncio
from argon2 import PasswordHasher
from httpx import ASGITransport, AsyncClient

# Configure a dedicated test database before importing anything from app.
TEST_DB_PATH = Path(__file__).resolve().parent / "_ministore_test.db"
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{TEST_DB_PATH.as_posix()}"
os.environ.setdefault("JWT_SECRET", "test-only-secret")

from app.core import security  # noqa: E402
from app.core.database import SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Base, Category, Product, Supplier, User  # noqa: E402

# Use a fast Argon2 configuration in tests only.
security.password_hasher = PasswordHasher(time_cost=1, memory_cost=8192, parallelism=1)

API = "/api/v1"


def hash_password(password: str) -> str:
    return security.hash_password(password)


@pytest.fixture(autouse=True)
def _clean_test_db_file() -> Iterator[None]:
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()
    yield
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()


@pytest_asyncio.fixture(autouse=True)
async def clean_db() -> AsyncIterator[None]:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
        await connection.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


class Seed:
    """Convenience container for seeded users and reference data."""

    def __init__(self, admin: User, staff: User, category: Category, supplier: Supplier):
        self.admin = admin
        self.staff = staff
        self.category = category
        self.supplier = supplier

    @property
    def admin_email(self) -> str:
        return self.admin.email

    @property
    def staff_email(self) -> str:
        return self.staff.email


@pytest_asyncio.fixture
async def seed() -> Seed:
    async with SessionLocal() as session:
        admin = User(
            name="Ada Admin",
            email="admin@ministore.local",
            password_hash=hash_password("Admin123!"),
            role="admin",
        )
        staff = User(
            name="Sok Staff",
            email="staff@ministore.local",
            password_hash=hash_password("Staff123!"),
            role="staff",
        )
        category = Category(name="Drinks", color="#0FB5A0")
        supplier = Supplier(
            name="Phnom Fridge Supply",
            contact_name="Vuthy",
            phone="012345678",
        )
        session.add_all([admin, staff, category, supplier])
        await session.commit()
        await session.refresh(admin)
        await session.refresh(staff)
        await session.refresh(category)
        await session.refresh(supplier)
        return Seed(admin=admin, staff=staff, category=category, supplier=supplier)


@pytest_asyncio.fixture
async def client() -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as async_client:
        yield async_client


async def login(client: AsyncClient, email: str, password: str) -> None:
    """Login, asserting success, so subsequent requests carry the session cookie."""
    response = await client.post(
        f"{API}/auth/login", json={"email": email, "password": password}
    )
    assert response.status_code == 200, response.text


@pytest_asyncio.fixture
async def admin_client(client: AsyncClient, seed: Seed) -> AsyncClient:
    await login(client, seed.admin_email, "Admin123!")
    return client


@pytest_asyncio.fixture
async def staff_client(client: AsyncClient, seed: Seed) -> AsyncClient:
    await login(client, seed.staff_email, "Staff123!")
    return client


@pytest_asyncio.fixture
async def product(seed: Seed) -> Product:
    async with SessionLocal() as session:
        item = Product(
            code="DRK-100",
            name="Coca Cola 350ml",
            category_id=seed.category.id,
            package="Can 350ml",
            cost_price=2000,
            selling_price=3000,
            stock_qty=12,
            low_stock_threshold=4,
            location="fridge",
            slot_code="A1",
        )
        session.add(item)
        await session.commit()
        await session.refresh(item)
        return item


def utc_now() -> datetime:
    return datetime.now(UTC)
