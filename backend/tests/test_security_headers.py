"""
Verify that every response carries the OWASP-recommended security headers.
These tests act as a regression guard — if a header is accidentally removed
from SecurityHeadersMiddleware, CI catches it before it reaches production.

References: OWASP Secure Headers Project (https://owasp.org/www-project-secure-headers/)
"""
import pytest


REQUIRED_HEADERS = {
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "strict-origin-when-cross-origin",
    "strict-transport-security": "max-age=63072000; includeSubDomains; preload",
    "permissions-policy": "geolocation=(), microphone=(), camera=(), payment=()",
    "cache-control": "no-store",
    "cross-origin-opener-policy": "same-origin",
    "cross-origin-resource-policy": "same-origin",
}


@pytest.mark.asyncio
async def test_security_headers_present(client):
    response = await client.get("/health")
    for header, expected_value in REQUIRED_HEADERS.items():
        assert header in response.headers, f"Missing security header: {header}"
        assert response.headers[header] == expected_value, (
            f"Header '{header}' expected '{expected_value}', "
            f"got '{response.headers[header]}'"
        )


@pytest.mark.asyncio
async def test_csp_header_present(client):
    response = await client.get("/health")
    assert "content-security-policy" in response.headers
    csp = response.headers["content-security-policy"]
    # Must include frame-ancestors to prevent clickjacking via CSP (backup to X-Frame-Options)
    assert "frame-ancestors" in csp


@pytest.mark.asyncio
async def test_server_header_stripped(client):
    """Server header leaks version info — must be removed."""
    response = await client.get("/health")
    assert "server" not in response.headers


@pytest.mark.asyncio
async def test_request_id_returned(client):
    """Every response must echo a request ID for distributed tracing."""
    response = await client.get("/health")
    assert "x-request-id" in response.headers
    assert len(response.headers["x-request-id"]) > 0


@pytest.mark.asyncio
async def test_client_request_id_echoed(client):
    """If the client sends X-Request-ID, the server must echo it back."""
    custom_id = "test-trace-abc-123"
    response = await client.get("/health", headers={"X-Request-ID": custom_id})
    assert response.headers["x-request-id"] == custom_id
