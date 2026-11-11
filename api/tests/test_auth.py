"""Authentication flows: login, session, password change, logout."""

from httpx import AsyncClient
from sqlalchemy import select

from app.core.database import SessionLocal
from app.models import User
from tests.conftest import Seed

API = "/api/v1"
ADMIN_EMAIL = "admin@ministore.local"
ADMIN_PASSWORD = "Admin123!"


async def test_login_success_sets_cookie(client: AsyncClient, seed: Seed) -> None:
    assert seed.admin_email == ADMIN_EMAIL
    response = await client.post(
        f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["user"]["role"] == "admin"
    assert "access_token" in response.cookies


async def test_login_wrong_password(client: AsyncClient) -> None:
    response = await client.post(
        f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "nope"}
    )
    assert response.status_code == 401
    assert response.json()["code"] == "invalid_credentials"


async def test_login_inactive_user_rejected(
    client: AsyncClient, seed: Seed
) -> None:
    assert seed.admin_email == ADMIN_EMAIL
    async with SessionLocal() as session:
        user = await session.scalar(select(User).where(User.email == ADMIN_EMAIL))
        assert user is not None
        user.is_active = False
        await session.commit()

    response = await client.post(
        f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 401
    assert response.json()["code"] == "invalid_credentials"


async def test_me_returns_current_user(admin_client: AsyncClient) -> None:
    response = await admin_client.get(f"{API}/auth/me")
    assert response.status_code == 200
    assert response.json()["user"]["email"] == ADMIN_EMAIL


async def test_change_password_round_trip(admin_client: AsyncClient) -> None:
    wrong = await admin_client.post(
        f"{API}/auth/change-password",
        json={"current_password": "wrong", "new_password": "NewPass123"},
    )
    assert wrong.status_code == 400

    changed = await admin_client.post(
        f"{API}/auth/change-password",
        json={"current_password": ADMIN_PASSWORD, "new_password": "NewPass123"},
    )
    assert changed.status_code == 204

    # Old password no longer works; the new one does.
    await admin_client.post(f"{API}/auth/logout")
    old = await admin_client.post(
        f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert old.status_code == 401
    new = await admin_client.post(
        f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "NewPass123"}
    )
    assert new.status_code == 200


async def test_logout_clears_cookie(client: AsyncClient) -> None:
    await client.post(
        f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    logout = await client.post(f"{API}/auth/logout")
    assert logout.status_code == 204
    me = await client.get(f"{API}/auth/me")
    assert me.status_code == 401
