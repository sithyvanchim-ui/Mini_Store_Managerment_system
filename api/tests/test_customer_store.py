"""Customer storefront regression tests.

Customers browse the store menu and check out their own orders. Every staff
dashboard area is closed to them, and they never touch cost prices or
discounts. Customer accounts are created by admins only — there is no
self-registration.
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.models import Product
from tests.conftest import API

pytestmark = pytest.mark.asyncio


async def test_customer_can_browse_menu(
    customer_client: AsyncClient, product: Product
) -> None:
    r = await customer_client.get(f"{API}/store/products")
    assert r.status_code == 200, r.text
    menu = r.json()
    assert menu["total"] == 1
    item = menu["items"][0]
    # The menu shows prices but never cost prices or margins.
    assert item["name"] == product.name
    assert item["selling_price"] == product.selling_price
    assert "cost_price" not in item
    assert "margin" not in item


async def test_customer_checkout_creates_sale(
    customer_client: AsyncClient, product: Product
) -> None:
    r = await customer_client.post(
        f"{API}/store/checkout",
        json={
            "items": [{"product_id": str(product.id), "quantity": 2}],
            "payment_method": "aba_khqr",
        },
        headers={"Idempotency-Key": "cust-checkout-1"},
    )
    assert r.status_code == 201, r.text
    sale = r.json()
    assert sale["total"] == product.selling_price * 2
    assert sale["sold_by_name"] == "Chan Customer"
    assert sale["payment_method"] == "aba_khqr"

    # Idempotent retry returns the same sale.
    r2 = await customer_client.post(
        f"{API}/store/checkout",
        json={
            "items": [{"product_id": str(product.id), "quantity": 2}],
            "payment_method": "aba_khqr",
        },
        headers={"Idempotency-Key": "cust-checkout-1"},
    )
    assert r2.status_code == 201
    assert r2.json()["id"] == sale["id"]


async def test_customer_checkout_rejects_extra_quantity(
    customer_client: AsyncClient, product: Product
) -> None:
    r = await customer_client.post(
        f"{API}/store/checkout",
        json={"items": [{"product_id": str(product.id), "quantity": 99}]},
    )
    assert r.status_code == 409
    assert r.json()["code"] == "insufficient_stock"


async def test_customer_sees_only_own_orders(
    customer_client: AsyncClient, product: Product
) -> None:
    r = await customer_client.post(
        f"{API}/store/checkout",
        json={"items": [{"product_id": str(product.id), "quantity": 1}]},
    )
    assert r.status_code == 201
    r = await customer_client.get(f"{API}/store/orders")
    assert r.status_code == 200
    orders = r.json()
    assert orders["total"] == 1
    assert all(order["sold_by_name"] == "Chan Customer" for order in orders["items"])


async def test_customer_blocked_from_dashboard(
    customer_client: AsyncClient,
) -> None:
    for path in (
        "/products",
        "/categories",
        "/suppliers",
        "/purchases",
        "/sales",
        "/stock/movements",
        "/daily-closes",
        "/dashboard/summary",
        "/reports/sales",
        "/reports/staff-performance",
        "/fund-requests",
        "/expenses",
        "/users",
    ):
        r = await customer_client.get(f"{API}{path}")
        assert r.status_code == 403, f"{path} -> {r.status_code}"


async def test_customer_blocked_from_writes(
    customer_client: AsyncClient, product: Product
) -> None:
    r = await customer_client.post(
        f"{API}/sales",
        json={"items": [{"product_id": str(product.id), "quantity": 1}]},
    )
    assert r.status_code == 403
    r = await customer_client.post(f"{API}/sales/{product.id}/void")
    assert r.status_code == 403


async def test_staff_still_sees_dashboard(staff_client: AsyncClient) -> None:
    r = await staff_client.get(f"{API}/products")
    assert r.status_code == 200


async def test_customer_can_change_own_password(
    customer_client: AsyncClient,
) -> None:
    r = await customer_client.post(
        f"{API}/auth/change-password",
        json={
            "current_password": "Customer123!",
            "new_password": "NewCustomer123!",
        },
    )
    assert r.status_code == 204


async def test_admin_can_create_customer_account(
    admin_client: AsyncClient,
) -> None:
    r = await admin_client.post(
        f"{API}/users",
        json={
            "name": "New Buyer",
            "email": "buyer@ministore.local",
            "password": "Buyer1234!",
            "role": "customer",
        },
    )
    assert r.status_code == 200, r.text
    assert r.json()["role"] == "customer"

    # The new customer logs in and lands in the store area only.
    login = await admin_client.post(
        f"{API}/auth/login",
        json={"email": "buyer@ministore.local", "password": "Buyer1234!"},
    )
    assert login.status_code == 200
    assert login.json()["user"]["role"] == "customer"
