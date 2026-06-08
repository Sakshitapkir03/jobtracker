"""
Shared test fixtures.

DATABASE_URL must be set before any app module is imported so pydantic-settings
doesn't raise a validation error. We use a dummy URL — the DB is fully mocked
via dependency_overrides, so no real connection is ever made.
"""
import os
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost:5432/testdb")

import pytest
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport


def _make_mock_engine():
    """
    Returns a mock that satisfies `async with engine.begin() as conn`.

    `engine.begin` is a read-only property on AsyncEngine, so we can't
    patch the attribute directly. Instead we replace the entire `engine`
    name in `app.main`'s module namespace via patch("app.main.engine").
    """
    mock_conn = AsyncMock()
    mock_conn.run_sync = AsyncMock()

    @asynccontextmanager
    async def mock_begin():
        yield mock_conn

    mock_engine = MagicMock()
    mock_engine.begin = mock_begin
    return mock_engine


@pytest.fixture
def mock_db():
    """AsyncSession mock pre-wired for the most common query patterns."""
    db = AsyncMock()

    # scalar() → used for COUNT queries
    db.scalar = AsyncMock(return_value=0)

    # scalars().all() → used for SELECT queries returning ORM objects
    scalars_result = MagicMock()
    scalars_result.all.return_value = []
    db.scalars = AsyncMock(return_value=scalars_result)

    # execute().all() → used for SELECT queries returning raw rows
    execute_result = MagicMock()
    execute_result.all.return_value = []
    db.execute = AsyncMock(return_value=execute_result)

    return db


@pytest.fixture
async def client(mock_db):
    """
    ASGI test client with:
    - DB startup (create_all) patched out — no real DB connection
    - get_db dependency overridden with mock_db
    """
    from app.main import app
    from app.database import get_db

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    # Patch the `engine` name inside app.main so the lifespan's
    # `async with engine.begin()` uses our mock instead of the real engine.
    with patch("app.main.engine", _make_mock_engine()):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            yield c

    app.dependency_overrides.clear()
