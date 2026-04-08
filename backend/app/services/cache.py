"""Redis caching utilities."""
import json
import redis.asyncio as aioredis
from app.config import settings

_redis: aioredis.Redis | None = None


def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis


async def cache_get(key: str):
    r = get_redis()
    value = await r.get(key)
    return json.loads(value) if value else None


async def cache_set(key: str, value, ttl_seconds: int = 300):
    r = get_redis()
    await r.set(key, json.dumps(value, default=str), ex=ttl_seconds)


async def cache_delete(key: str):
    r = get_redis()
    await r.delete(key)


async def cache_delete_pattern(pattern: str):
    r = get_redis()
    keys = await r.keys(pattern)
    if keys:
        await r.delete(*keys)
