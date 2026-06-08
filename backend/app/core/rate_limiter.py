"""
Rate limiting via SlowAPI (wraps the `limits` library).

Default limit: 200 requests/minute per IP — applied globally via SlowAPIMiddleware.
Expensive endpoints (scraper, upload) get tighter per-route limits.

In production, swap storage_uri for Redis to share limits across workers:
    storage_uri=settings.redis_url
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200/minute"],
    storage_uri="memory://",
)
