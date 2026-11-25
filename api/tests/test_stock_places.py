"""Two stock places: the store display and the selling pool.

Customers can only buy what is actually on display in the store. Staff sales
draw from the selling pool first and only dip into the display when the pool
cannot cover the order. Admins can move units between the two places.
"""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.database import SessionLocal
from app.main import app
from app.models import Product
from tests.conftest import API, login

pytestmark = pytest.mark.asyncio


async def _product(client: AsyncClient, product) -> dict:
    response = await client.get(f"{API}/products/{product.id}")
    assert response.status_code == 200, response.text
    return response.json()


async def _product_row(product) -> Product:
    """Read the product straight from the database (any role may buy)."""
    async with SessionLocal() as session:
        stored = await session.get(Product, product.id)
        assert stored is not None
        session.expunge(stored)
        return stored


async def test_new_product_splits_stock_between_places(
    admin_client: AsyncClient, seed
) -> None:
    response = await admin_client.post(
        f"{API}/products",
        json={
            "code": "SPL-1",
            "name": "Split Stock Cola",
            "category_id": str(seed.category.id),
            "package": "Can",
            "cost_price": 1000,
            "selling_price": 2000,
            "stock_qty": 10,
            "store_qty": 6,
            "low_stock_threshold": 2,
            "location": "fridge",
        },
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["stock_qty"] == 10
    assert body["store_qty"] == 6
    assert body["sell_qty"] == 4
    assert body["store_status"] == "in_stock"


async def test_store_stock_cannot_exceed_total(
    admin_client: AsyncClient, seed
) -> None:
    response = await admin_client.post(
        f"{API}/products",
        json={
            "code": "SPL-2",
            "name": "Impossible Split",
            "category_id": str(seed.category.id),
            "package": "Can",
            "cost_price": 1000,
            "selling_price": 2000,
            "stock_qty": 3,
            "store_qty": 5,
            "location": "fridge",
        },
    )
    assert response.status_code == 422


async def test_customer_cannot_buy_more_than_the_store_display(
    customer_client: AsyncClient, product
) -> None:
    # 12 units on hand, but only 8 are on display in the store.
    response = await customer_client.post(
        f"{API}/store/checkout",
        json={"items": [{"product_id": str(product.id), "quantity": 9}]},
    )
    assert response.status_code == 409
    assert "in the store" in response.json()["detail"]


async def test_customer_checkout_only_takes_from_the_store(
    customer_client: AsyncClient, product
) -> None:
    response = await customer_client.post(
        f"{API}/store/checkout",
        json={"items": [{"product_id": str(product.id), "quantity": 3}]},
    )
    assert response.status_code == 201, response.text
    sale = response.json()
    assert sale["channel"] == "store"

    fresh = await _product_row(product)
    assert fresh.stock_qty == 9
    assert fresh.store_qty == 5
    assert fresh.sell_qty == 4


async def test_counter_sale_uses_selling_pool_then_dips_into_store(
    admin_client: AsyncClient, product
) -> None:
    # 12 total, 8 in the store -> 4 in the selling pool.
    first = await admin_client.post(
        f"{API}/sales",
        json={"items": [{"product_id": str(product.id), "quantity": 4}]},
    )
    assert first.status_code == 201, first.text
    assert first.json()["channel"] == "counter"

    fresh = await _product(admin_client, product)
    assert fresh["stock_qty"] == 8
    assert fresh["store_qty"] == 8
    assert fresh["sell_qty"] == 0

    # The pool is empty, so the counter sale has to take from the display.
    second = await admin_client.post(
        f"{API}/sales",
        json={"items": [{"product_id": str(product.id), "quantity": 2}]},
    )
    assert second.status_code == 201, second.text

    fresh = await _product(admin_client, product)
    assert fresh["stock_qty"] == 6
    assert fresh["store_qty"] == 6
    assert fresh["sell_qty"] == 0


async def test_transfer_moves_units_between_places(
    admin_client: AsyncClient, product
) -> None:
    # Moving into the selling pool frees up the store display number down.
    response = await admin_client.post(
        f"{API}/products/{product.id}/transfer-stock",
        json={"to": "sell", "quantity": 4},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["store_qty"] == 4
    assert body["sell_qty"] == 8

    response = await admin_client.post(
        f"{API}/products/{product.id}/transfer-stock",
        json={"to": "store", "quantity": 2},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["store_qty"] == 6
    assert body["sell_qty"] == 6

    # Cannot move more than one place actually holds.
    response = await admin_client.post(
        f"{API}/products/{product.id}/transfer-stock",
        json={"to": "store", "quantity": 99},
    )
    assert response.status_code == 409


async def test_staff_cannot_transfer_stock(
    staff_client: AsyncClient, product
) -> None:
    response = await staff_client.post(
        f"{API}/products/{product.id}/transfer-stock",
        json={"to": "sell", "quantity": 1},
    )
    assert response.status_code == 403


async def test_void_returns_customer_units_to_the_store(
    admin_client: AsyncClient, product, seed
) -> None:
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver"
    ) as customer:
        await login(customer, seed.customer_email, "Customer123!")
        response = await customer.post(
            f"{API}/store/checkout",
            json={"items": [{"product_id": str(product.id), "quantity": 2}]},
        )
        assert response.status_code == 201, response.text
        sale_id = response.json()["id"]

    after_sale = await _product(admin_client, product)
    assert after_sale["stock_qty"] == 10
    assert after_sale["store_qty"] == 6

    response = await admin_client.post(f"{API}/sales/{sale_id}/void")
    assert response.status_code == 200, response.text

    fresh = await _product(admin_client, product)
    assert fresh["stock_qty"] == 12
    assert fresh["store_qty"] == 8
    assert fresh["sell_qty"] == 4


async def test_stock_summary_reports_both_places(
    admin_client: AsyncClient, product
) -> None:
    response = await admin_client.get(f"{API}/stock/summary")
    assert response.status_code == 200, response.text
    summary = response.json()
    assert summary["total_units"] == 12
    assert summary["store_units"] == 8
    assert summary["sell_units"] == 4
    item = summary["items"][0]
    assert item["store_qty"] == 8
    assert item["sell_qty"] == 4


async def test_insert_stock_adds_units_to_the_store(
    admin_client: AsyncClient, product
) -> None:
    # 12 total, 8 in the store.
    response = await admin_client.post(
        f"{API}/products/{product.id}/insert-stock",
        json={"place": "store", "quantity": 3},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["stock_qty"] == 15
    assert body["store_qty"] == 11
    assert body["sell_qty"] == 4


async def test_insert_stock_adds_units_to_the_sell_pool(
    admin_client: AsyncClient, product
) -> None:
    response = await admin_client.post(
        f"{API}/products/{product.id}/insert-stock",
        json={"place": "sell", "quantity": 5},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["stock_qty"] == 17
    assert body["store_qty"] == 8
    assert body["sell_qty"] == 9


async def test_staff_cannot_insert_stock(
    staff_client: AsyncClient, product
) -> None:
    response = await staff_client.post(
        f"{API}/products/{product.id}/insert-stock",
        json={"place": "store", "quantity": 1},
    )
    assert response.status_code == 403


async def test_clear_store_place_moves_units_to_sell(
    admin_client: AsyncClient, product
) -> None:
    response = await admin_client.post(
        f"{API}/products/{product.id}/clear-place",
        json={"place": "store"},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["stock_qty"] == 12
    assert body["store_qty"] == 0
    assert body["sell_qty"] == 12


async def test_clear_sell_place_moves_units_to_store(
    admin_client: AsyncClient, product
) -> None:
    response = await admin_client.post(
        f"{API}/products/{product.id}/clear-place",
        json={"place": "sell"},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["stock_qty"] == 12
    assert body["store_qty"] == 12
    assert body["sell_qty"] == 0
