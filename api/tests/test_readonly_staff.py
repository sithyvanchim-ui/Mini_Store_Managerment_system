"""Staff accounts are fully read-only: every write endpoint must reject them."""

from httpx import AsyncClient

API = "/api/v1"


async def test_staff_cannot_write_anything(
    staff_client: AsyncClient,
    seed,
    product,
) -> None:
    """Every mutating endpoint returns 403 for staff."""
    # Products
    r = await staff_client.post(
        f"{API}/products",
        json={
            "code": "DRK-999",
            "name": "Staff Product",
            "category_id": str(seed.category.id),
            "package": "Bottle",
            "cost_price": 1000,
            "selling_price": 2000,
            "stock_qty": 5,
            "low_stock_threshold": 2,
            "location": "fridge",
        },
    )
    assert r.status_code == 403

    r = await staff_client.patch(
        f"{API}/products/{product.id}", json={"name": "Hacked"}
    )
    assert r.status_code == 403

    r = await staff_client.post(
        f"{API}/products/{product.id}/adjust-stock",
        json={"type": "restock", "quantity": 10},
    )
    assert r.status_code == 403

    # Sales
    r = await staff_client.post(
        f"{API}/sales",
        json={"items": [{"product_id": str(product.id), "quantity": 1}]},
    )
    assert r.status_code == 403

    # Purchases
    r = await staff_client.post(
        f"{API}/purchases",
        json={
            "supplier_id": str(seed.supplier.id),
            "purchased_at": "2026-11-15T10:00:00Z",
            "items": [
                {
                    "product_id": str(product.id),
                    "quantity": 5,
                    "unit_cost": 1000,
                }
            ],
        },
    )
    assert r.status_code == 403

    # Suppliers
    r = await staff_client.post(
        f"{API}/suppliers", json={"name": "Staff Supplier", "phone": "0123"}
    )
    assert r.status_code == 403

    r = await staff_client.post(
        f"{API}/categories", json={"name": "Staff Category"}
    )
    assert r.status_code == 403

    # Money
    r = await staff_client.post(
        f"{API}/expenses",
        json={
            "business_date": "2026-11-15",
            "category": "supplies",
            "description": "Staff expense",
            "amount": 1000,
        },
    )
    assert r.status_code == 403

    r = await staff_client.post(
        f"{API}/fund-requests",
        json={"amount": 5000, "purpose": "Staff request"},
    )
    assert r.status_code == 403

    # Daily close
    r = await staff_client.post(
        f"{API}/daily-closes",
        json={"business_date": "2026-11-15", "aba_balance": 100, "expenses": 0},
    )
    assert r.status_code == 403

    # Users management stays admin-only too
    r = await staff_client.post(
        f"{API}/users",
        json={"email": "x@x.local", "name": "X", "role": "staff", "password": "Passw0rd!"},
    )
    assert r.status_code == 403


async def test_staff_can_still_view(staff_client: AsyncClient) -> None:
    """Read endpoints remain accessible for staff."""
    for path in (
        "/products",
        "/suppliers",
        "/purchases",
        "/sales",
        "/expenses",
        "/fund-requests",
    ):
        r = await staff_client.get(f"{API}{path}")
        assert r.status_code == 200, path
