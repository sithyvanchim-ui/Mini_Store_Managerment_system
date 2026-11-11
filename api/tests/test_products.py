"""Product CRUD, code normalization, and manual stock adjustments."""

from httpx import AsyncClient

API = "/api/v1"


def product_payload(category_id: str, **overrides: object) -> dict:
    payload = {
        "code": "  drk-200 ",
        "name": "Water Blue 1L",
        "category_id": category_id,
        "package": "Bottle 1L",
        "cost_price": 1400,
        "selling_price": 2500,
        "stock_qty": 8,
        "low_stock_threshold": 3,
        "location": "shelf",
    }
    payload.update(overrides)
    return payload


async def test_create_product_normalizes_code(
    admin_client: AsyncClient, seed
) -> None:
    response = await admin_client.post(
        f"{API}/products", json=product_payload(str(seed.category.id))
    )
    assert response.status_code == 200
    body = response.json()
    assert body["code"] == "DRK-200"
    assert body["stock_status"] == "in_stock"
    assert body["margin"] == body["selling_price"] - body["cost_price"]


async def test_create_product_duplicate_code_rejected(
    admin_client: AsyncClient, product
) -> None:
    payload = product_payload(str(product.category_id), code="DRK-100")
    response = await admin_client.post(f"{API}/products", json=payload)
    assert response.status_code == 409
    assert response.json()["code"] == "duplicate_code"


async def test_create_product_unknown_category(admin_client: AsyncClient) -> None:
    response = await admin_client.post(
        f"{API}/products",
        json=product_payload(
            "00000000-0000-0000-0000-000000000000",
            code="DRK-300",
        ),
    )
    assert response.status_code == 404
    assert response.json()["code"] == "category_not_found"


async def test_product_list_search_and_filters(
    admin_client: AsyncClient, product
) -> None:
    by_name = await admin_client.get(f"{API}/products", params={"q": "coca"})
    assert by_name.status_code == 200
    assert by_name.json()["total"] == 1

    by_code = await admin_client.get(f"{API}/products", params={"q": "drk-100"})
    assert by_code.json()["total"] == 1

    fridge = await admin_client.get(f"{API}/products", params={"location": "fridge"})
    assert fridge.json()["total"] == 1

    shelf = await admin_client.get(f"{API}/products", params={"location": "shelf"})
    assert shelf.json()["total"] == 0

    invalid = await admin_client.get(f"{API}/products", params={"location": "floor"})
    assert invalid.status_code == 400


async def test_adjust_stock_restocks_and_consumes(
    admin_client: AsyncClient, product
) -> None:
    restock = await admin_client.post(
        f"{API}/products/{product.id}/adjust-stock",
        json={"type": "restock", "quantity": 6, "note": "late delivery"},
    )
    assert restock.status_code == 200
    assert restock.json()["stock_qty"] == product.stock_qty + 6

    waste = await admin_client.post(
        f"{API}/products/{product.id}/adjust-stock",
        json={"type": "waste", "quantity": 2, "note": "broken bottle"},
    )
    assert waste.status_code == 200
    assert waste.json()["stock_qty"] == product.stock_qty + 4


async def test_adjust_stock_cannot_go_below_zero(
    admin_client: AsyncClient, product
) -> None:
    response = await admin_client.post(
        f"{API}/products/{product.id}/adjust-stock",
        json={"type": "waste", "quantity": product.stock_qty + 1},
    )
    assert response.status_code == 409
    assert response.json()["code"] == "insufficient_stock"
