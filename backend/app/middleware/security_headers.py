"""
OWASP-recommended HTTP security headers applied to every response.
References: OWASP Secure Headers Project, ASVS v4.0 §14.4

Implemented as pure ASGI middleware (not BaseHTTPMiddleware) to avoid the
known anyio task-group incompatibility with Starlette's BaseHTTPMiddleware.
"""
from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Receive, Scope, Send

_HEADERS: list[tuple[bytes, bytes]] = [
    # Prevent MIME-type sniffing attacks
    (b"x-content-type-options", b"nosniff"),
    # Block framing — protects against clickjacking (OWASP A05)
    (b"x-frame-options", b"DENY"),
    # Disable legacy XSS filter; modern browsers use CSP instead
    (b"x-xss-protection", b"0"),
    # Limit referrer information sent cross-origin
    (b"referrer-policy", b"strict-origin-when-cross-origin"),
    # Restrict browser feature APIs — defence-in-depth for data privacy
    (b"permissions-policy", b"geolocation=(), microphone=(), camera=(), payment=()"),
    # Force HTTPS for 2 years, include subdomains (HSTS preload-ready)
    (b"strict-transport-security", b"max-age=63072000; includeSubDomains; preload"),
    # CSP — API-only backend: lock down aggressively
    (b"content-security-policy", b"default-src 'none'; frame-ancestors 'none';"),
    # Prevent caching of API responses that may contain personal data
    (b"cache-control", b"no-store"),
    (b"cross-origin-opener-policy", b"same-origin"),
    (b"cross-origin-resource-policy", b"same-origin"),
]

_STRIP = {b"server", b"x-powered-by"}


class SecurityHeadersMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_security_headers(message):
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                for name, value in _HEADERS:
                    headers[name.decode()] = value.decode()
                for name in _STRIP:
                    name_str = name.decode()
                    if name_str in headers:
                        del headers[name_str]
            await send(message)

        await self.app(scope, receive, send_with_security_headers)
