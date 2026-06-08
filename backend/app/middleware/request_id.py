"""
Assign a unique request ID to every inbound request.
- Reads X-Request-ID from client if provided (useful for distributed tracing).
- Falls back to a server-generated UUID v4.
- Stores it in scope["state"] so downstream middleware and route handlers can read it.
- Echoes the ID back in the response header for client-side correlation.
"""
import uuid
from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Receive, Scope, Send

HEADER = "x-request-id"


class RequestIDMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] not in {"http", "websocket"}:
            await self.app(scope, receive, send)
            return

        # Extract from incoming headers (bytes)
        raw_headers = dict(scope.get("headers", []))
        req_id = raw_headers.get(HEADER.encode(), b"").decode() or str(uuid.uuid4())

        # Attach to scope state so route handlers and other middleware can read it
        if "state" not in scope:
            scope["state"] = {}
        scope["state"]["request_id"] = req_id

        async def send_with_id(message):
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                headers[HEADER] = req_id
            await send(message)

        await self.app(scope, receive, send_with_id)
