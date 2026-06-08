"""
Structured JSON audit log for every API request.

Privacy guarantees:
- Request bodies are NEVER logged (may contain PII, credentials, or file data).
- Authorization / Cookie headers are NEVER logged.
- User-Agent is truncated to 200 chars to prevent log-injection via long strings.
- Client IP is extracted from X-Forwarded-For (leftmost = real client behind proxy).

Log fields are kept stable so a SIEM / log aggregator can parse them reliably.
"""
import json
import logging
import time
from starlette.types import ASGIApp, Receive, Scope, Send

logger = logging.getLogger("audit")

_SKIP_PATHS = {"/health", "/favicon.ico"}


class AuditLogMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")
        if path in _SKIP_PATHS:
            await self.app(scope, receive, send)
            return

        start = time.perf_counter()
        req_id = scope.get("state", {}).get("request_id", "-")
        status_holder = [0]

        async def send_and_capture(message):
            if message["type"] == "http.response.start":
                status_holder[0] = message.get("status", 0)
            await send(message)

        await self.app(scope, receive, send_and_capture)

        raw_headers = dict(scope.get("headers", []))
        entry = {
            "request_id": req_id,
            "method": scope.get("method", ""),
            "path": path,
            "query": scope.get("query_string", b"").decode()[:500],
            "status": status_holder[0],
            "duration_ms": round((time.perf_counter() - start) * 1000, 2),
            "ip": _client_ip(scope, raw_headers),
            "ua": raw_headers.get(b"user-agent", b"").decode()[:200],
        }

        if status_holder[0] >= 500:
            logger.error(json.dumps(entry))
        elif status_holder[0] >= 400:
            logger.warning(json.dumps(entry))
        else:
            logger.info(json.dumps(entry))


def _client_ip(scope: Scope, raw_headers: dict) -> str:
    xff = raw_headers.get(b"x-forwarded-for", b"").decode()
    if xff:
        return xff.split(",")[0].strip()
    client = scope.get("client")
    return client[0] if client else "unknown"
