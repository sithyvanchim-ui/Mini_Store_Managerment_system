"""Wallet position endpoint — the shop's ABA wallet for staff/admins."""

from datetime import date

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from tests.conftest import API, login

pytestmark = pytest.mark.asyncio


async def test_wallet_position_requires_staff(client: AsyncClient) -> None:
    response = await client.get(f"{API}/wallet/position")
    assert response.status_code == 401


async def test_staff_can_view_wallet_position(
    staff_client: AsyncClient,
) -> None:
    response = await staff_client.get(f"{API}/wallet/position")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["expected_balance"] >= 0
    assert body["aba_balance"] is None or body["aba_balance"] >= 0


async def test_wallet_position_uses_latest_close(
    admin_client: AsyncClient, seed
) -> None:
    close = await admin_client.post(
        f"{API}/daily-closes",
        json={"business_date": date.today().isoformat(), "aba_balance": 5000},
    )
    assert close.status_code == 201, close.text

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver"
    ) as staff_client:
        await login(staff_client, seed.staff_email, "Staff123!")
        response = await staff_client.get(f"{API}/wallet/position")
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["aba_balance"] == 5000
        assert body["expected_balance"] >= 0
        if body["variance"] is not None:
            assert (
                body["variance"] == body["aba_balance"] - body["expected_balance"]
            )
