"""
Input validation tests — verifies the API rejects malformed, oversized,
and boundary-violating inputs before they reach business logic.

This is an OWASP A03 (Injection) and A04 (Insecure Design) concern:
strong input validation is the first line of defence against injection
attacks and unexpected application state.
"""
import pytest


class TestJobsInputValidation:
    @pytest.mark.asyncio
    async def test_page_must_be_positive(self, client):
        response = await client.get("/api/v1/jobs?page=0")
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_size_upper_bound_enforced(self, client):
        response = await client.get("/api/v1/jobs?size=99999")
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_days_upper_bound_enforced(self, client):
        """Unbounded date ranges could cause expensive full-table scans."""
        response = await client.get("/api/v1/jobs?days=9999")
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_days_must_be_positive(self, client):
        response = await client.get("/api/v1/jobs?days=0")
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_valid_request_accepted(self, client):
        """Baseline — a well-formed request must not be rejected."""
        response = await client.get("/api/v1/jobs?page=1&size=10&days=7")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_sql_like_keyword_does_not_crash(self, client):
        """
        SQLAlchemy ORM uses parameterized queries, so SQL fragments in keyword
        params must be treated as plain strings, not executed.
        The server should return 200 (empty results), not 500.
        """
        response = await client.get("/api/v1/jobs?keyword='; DROP TABLE jobs;--")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_xss_payload_in_keyword_does_not_crash(self, client):
        """XSS payloads in query params must be handled safely."""
        response = await client.get("/api/v1/jobs?keyword=<script>alert(1)</script>")
        assert response.status_code == 200


class TestApplicationsInputValidation:
    @pytest.mark.asyncio
    async def test_invalid_stage_rejected(self, client):
        payload = {
            "company_id": "some-uuid",
            "job_title": "Engineer",
            "stage": "INVALID_STAGE",
            "applied_at": "2024-01-01T00:00:00Z",
        }
        response = await client.post("/api/v1/applications", json=payload)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_missing_required_fields_rejected(self, client):
        response = await client.post("/api/v1/applications", json={})
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_oversized_notes_rejected(self, client):
        """Notes field should not accept arbitrarily large payloads."""
        payload = {
            "company_id": "some-uuid",
            "job_title": "Engineer",
            "stage": "APPLIED",
            "applied_at": "2024-01-01T00:00:00Z",
            "notes": "x" * 100_001,  # >100k chars
        }
        response = await client.post("/api/v1/applications", json=payload)
        # Either 422 (Pydantic rejects it) or 400 (manual check) — not 200/500
        assert response.status_code in (400, 422)
