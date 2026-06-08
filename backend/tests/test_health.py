"""Tests for the /health endpoint."""
import pytest


@pytest.mark.asyncio
async def test_health_returns_ok(client):
    response = await client.get("/health")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_health_body_shape(client):
    data = (await client.get("/health")).json()
    assert data["status"] == "ok"
    assert "version" in data
    assert "env" in data


@pytest.mark.asyncio
async def test_health_method_not_allowed(client):
    """POST to a GET-only endpoint must return 405, not 500."""
    response = await client.post("/health")
    assert response.status_code == 405
