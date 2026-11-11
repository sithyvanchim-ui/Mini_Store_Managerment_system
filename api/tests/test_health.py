"""Health probes and unauthenticated access."""

from httpx import AsyncClient

API = "/api/v1"


async def test_health(client: AsyncClient) -> None:
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


async def test_ready(client: AsyncClient) -> None:
    response = await client.get("/ready")
    assert response.status_code == 200
    assert response.json()["status"] in {"ready", "degraded"}


async def test_protected_endpoint_requires_auth(client: AsyncClient) -> None:
    response = await client.get(f"{API}/auth/me")
    assert response.status_code == 401
    assert response.json()["code"] == "not_authenticated"
