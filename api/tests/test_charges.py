"""ABA charge endpoints."""

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.core.database import SessionLocal
from app.models import AppSettings
from tests.conftest import API

pytestmark = pytest.mark.asyncio


async def _set_khqr(khqr: str | None = "mina@aba") -> None:
    async with SessionLocal() as session:
        row = await session.scalar(select(AppSettings).limit(1))
        if row is None:
            row = AppSettings(khqr_data=khqr)
            session.add(row)
        else:
            row.khqr_data = khqr
        await session.commit()


async def test_admin_can_create_charge(
    admin_client: AsyncClient, product
) -> None:
    await _set_khqr()
    response = await admin_client.post(
        f"{API}/charges",
        json={"product_id": str(product.id), "quantity": 2},
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["amount"] == product.selling_price * 2
    assert body["quantity"] == 2
    assert body["product_code"] == product.code
    assert body["status"] == "pending"
    assert body["qr"]
    assert body["wallet_position"] is not None


async def test_staff_cannot_create_charge(
    staff_client: AsyncClient, product
) -> None:
    response = await staff_client.post(
        f"{API}/charges",
        json={"product_id": str(product.id)},
    )
    assert response.status_code == 403


async def test_charge_requires_configured_khqr(
    admin_client: AsyncClient, product
) -> None:
    await _set_khqr(None)
    response = await admin_client.post(
        f"{API}/charges",
        json={"product_id": str(product.id)},
    )
    assert response.status_code == 409


async def test_charges_list_for_staff(staff_client: AsyncClient) -> None:
    response = await staff_client.get(f"{API}/charges")
    assert response.status_code == 200
    assert response.json()["items"] is not None
