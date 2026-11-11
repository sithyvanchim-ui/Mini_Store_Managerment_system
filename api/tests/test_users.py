"""User management (admin-only) endpoints."""

from httpx import AsyncClient

API = "/api/v1"


async def test_staff_cannot_list_users(staff_client: AsyncClient) -> None:
    response = await staff_client.get(f"{API}/users")
    assert response.status_code == 403
    assert response.json()["code"] == "forbidden"


async def test_admin_lists_seeded_users(admin_client: AsyncClient) -> None:
    response = await admin_client.get(f"{API}/users")
    assert response.status_code == 200
    body = response.json()
    emails = {item["email"] for item in body["items"]}
    assert {"admin@ministore.local", "staff@ministore.local"} <= emails
    assert body["total"] >= 2


async def test_admin_creates_user(admin_client: AsyncClient) -> None:
    payload = {
        "name": "Dara Kong",
        "email": "dara@ministore.local",
        "password": "DaraPass1",
        "role": "staff",
    }
    response = await admin_client.post(f"{API}/users", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == "dara@ministore.local"
    assert body["role"] == "staff"
    assert "password_hash" not in body


async def test_admin_create_user_duplicate_email(admin_client: AsyncClient) -> None:
    payload = {
        "name": "Copy Cat",
        "email": "STAFF@ministore.local",  # case-insensitive duplicate
        "password": "DaraPass1",
        "role": "staff",
    }
    response = await admin_client.post(f"{API}/users", json=payload)
    assert response.status_code == 409
    assert response.json()["code"] == "email_exists"


async def test_admin_updates_user_role_and_status(admin_client: AsyncClient) -> None:
    created = await admin_client.post(
        f"{API}/users",
        json={
            "name": "Nita Long",
            "email": "nita@ministore.local",
            "password": "NitaPass1",
            "role": "staff",
        },
    )
    assert created.status_code == 200
    user_id = created.json()["id"]

    promoted = await admin_client.patch(
        f"{API}/users/{user_id}", json={"role": "admin"}
    )
    assert promoted.status_code == 200
    assert promoted.json()["role"] == "admin"

    disabled = await admin_client.patch(
        f"{API}/users/{user_id}", json={"is_active": False}
    )
    assert disabled.status_code == 200
    assert disabled.json()["is_active"] is False


async def test_staff_cannot_create_user(staff_client: AsyncClient) -> None:
    response = await staff_client.post(
        f"{API}/users",
        json={
            "name": "Sneaky",
            "email": "sneaky@ministore.local",
            "password": "Sneaky12",
            "role": "admin",
        },
    )
    assert response.status_code == 403
