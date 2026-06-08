"""
Unit tests for the jobs listing API.
DB interactions are mocked so tests run without a real database.
"""
import pytest
from unittest.mock import MagicMock, AsyncMock
from datetime import datetime, timezone


def _make_company():
    c = MagicMock()
    c.id = "company-uuid-1"
    c.user_id = "user-uuid-1"
    c.name = "Acme Corp"
    c.website = None
    c.careers_url = None
    c.logo_url = None
    c.industry = None
    c.notes = None
    c.job_count = 0
    c.last_scraped_at = None
    c.created_at = datetime(2024, 1, 1, tzinfo=timezone.utc)
    return c


def _make_job(title="Software Engineer", location="Remote"):
    job = MagicMock()
    job.id = "job-uuid-1"
    job.title = title
    job.location = location
    job.company_id = "company-uuid-1"
    job.url = "https://example.com/job/1"
    job.description = "A great job"
    job.posted_at = datetime(2024, 1, 15, tzinfo=timezone.utc)
    job.scraped_at = datetime(2024, 1, 15, tzinfo=timezone.utc)
    job.is_new = False
    job.company = _make_company()
    return job


@pytest.mark.asyncio
async def test_list_jobs_empty(client):
    """Empty DB returns empty list with total=0."""
    response = await client.get("/api/v1/jobs")
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["total"] == 0
    assert data["page"] == 1


@pytest.mark.asyncio
async def test_list_jobs_returns_items(client, mock_db):
    job = _make_job()
    mock_db.scalar = AsyncMock(return_value=1)
    scalars_result = MagicMock()
    scalars_result.all.return_value = [job]
    mock_db.scalars = AsyncMock(return_value=scalars_result)

    response = await client.get("/api/v1/jobs")
    assert response.status_code == 200
    assert response.json()["total"] == 1


@pytest.mark.asyncio
async def test_pagination_page_param(client, mock_db):
    mock_db.scalar = AsyncMock(return_value=100)
    scalars_result = MagicMock()
    scalars_result.all.return_value = []
    mock_db.scalars = AsyncMock(return_value=scalars_result)

    response = await client.get("/api/v1/jobs?page=2&size=10")
    assert response.status_code == 200
    data = response.json()
    assert data["page"] == 2
    assert data["size"] == 10
    assert data["total"] == 100
    assert data["pages"] == 10


@pytest.mark.asyncio
async def test_entry_level_filter_accepted(client):
    """entry_level=true must be accepted without error."""
    response = await client.get("/api/v1/jobs?entry_level=true")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_keyword_filter_accepted(client):
    response = await client.get("/api/v1/jobs?keyword=python")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_location_filter_accepted(client):
    response = await client.get("/api/v1/jobs?location=new+york")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_combined_filters(client):
    response = await client.get(
        "/api/v1/jobs?keyword=engineer&location=remote&entry_level=true&days=14"
    )
    assert response.status_code == 200
