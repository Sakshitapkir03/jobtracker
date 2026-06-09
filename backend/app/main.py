import logging
import logging.config
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.router import api_router
from app.config import settings
from app.core.rate_limiter import limiter
from app.database import Base, engine
from app.middleware.audit_log import AuditLogMiddleware
from app.middleware.request_id import RequestIDMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
import app.models.application  # noqa: F401
import app.models.company  # noqa: F401
import app.models.job_posting  # noqa: F401
import app.models.notification  # noqa: F401

_LOG_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "format": (
                '{"time":"%(asctime)s","level":"%(levelname)s",'
                '"logger":"%(name)s","msg":%(message)s}'
            ),
        }
    },
    "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "json"}},
    "root": {"level": "INFO", "handlers": ["console"]},
}
logging.config.dictConfig(_LOG_CONFIG)


_logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as exc:
        # Tables likely already exist; log and continue rather than crashing the deploy
        _logger.warning("DB startup check skipped: %s", exc)
    yield


app = FastAPI(
    title="Job Tracker API",
    version="2.0.0",
    # Disable interactive docs in production — avoids exposing API surface
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None,
    lifespan=lifespan,
)

# ── Rate limiting ────────────────────────────────────────────────────────────
# Per-route limits are applied via @limiter.limit() decorators (see scraper.py,
# upload.py). SlowAPIMiddleware is intentionally omitted — it uses
# BaseHTTPMiddleware which conflicts with anyio 4.x task groups.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Middleware stack (last added = outermost = first to see the request) ─────
# Innermost: security headers — add OWASP headers on every response
app.add_middleware(SecurityHeadersMiddleware)
# Audit logger — structured JSON log per request (PII-safe)
app.add_middleware(AuditLogMiddleware)
# Request ID — assign trace ID before logging and downstream handlers
app.add_middleware(RequestIDMiddleware)
# Outermost: CORS — handle preflight and add Access-Control-* headers
_origins = [o.strip() for o in settings.allowed_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
    expose_headers=["X-Request-ID"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health", tags=["ops"])
async def health():
    return {"status": "ok", "version": app.version, "env": settings.environment}
