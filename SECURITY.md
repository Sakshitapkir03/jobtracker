# Security Policy

## Threat Model

This application stores job application data, performs automated ATS scraping,
and accepts file uploads. The following threats were considered during design:

| OWASP Category | Threat | Mitigation |
|---|---|---|
| A01 — Broken Access Control | Unauthenticated access to all data | Single-user design; all endpoints require same-origin; CORS locked to known origins |
| A02 — Cryptographic Failures | Sensitive data in transit | HSTS enforced (max-age 2 years, preload-ready); TLS terminated at load balancer |
| A03 — Injection | SQL injection via query params | SQLAlchemy ORM — all queries use parameterized statements, never string interpolation |
| A03 — Injection | HTML injection in email templates | `html.escape()` applied to all user-controlled values before rendering in emails |
| A03 — Injection | Log injection via User-Agent / path | UA truncated to 200 chars; JSON-structured logs prevent multi-line injection |
| A04 — Insecure Design | SSRF via scraper | Scraper only calls three allow-listed ATS APIs (Greenhouse, Lever, Ashby) |
| A04 — Insecure Design | Unbounded file uploads | 50 MB hard cap; MIME type and extension validated before parsing |
| A04 — Insecure Design | Unrestricted API usage | Global rate limit: 200 req/min/IP; scraper trigger: 5 req/min; upload: 10 req/min |
| A05 — Security Misconfiguration | Clickjacking | `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'` |
| A05 — Security Misconfiguration | MIME sniffing | `X-Content-Type-Options: nosniff` |
| A05 — Security Misconfiguration | Information disclosure via headers | `Server` header stripped; `/docs` disabled in production |
| A06 — Vulnerable Components | Dependency CVEs | `pip-audit` + `npm audit` run in CI on every push; full scan weekly |
| A08 — Software Integrity Failures | Malicious file uploads | Files parsed in-memory with no shell execution; no write access to filesystem |
| A09 — Logging Failures | Insufficient audit trail | Structured JSON audit log on every request: method, path, status, IP, duration, request ID |
| A09 — Logging Failures | PII in logs | Request bodies are never logged; Authorization and Cookie headers excluded |

## Security Controls Implemented

### HTTP Security Headers
Applied to every response via `SecurityHeadersMiddleware`:

```
Content-Security-Policy:   default-src 'none'; frame-ancestors 'none'
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options:    nosniff
X-Frame-Options:           DENY
Referrer-Policy:           strict-origin-when-cross-origin
Permissions-Policy:        geolocation=(), microphone=(), camera=(), payment=()
Cache-Control:             no-store
Cross-Origin-Opener-Policy:   same-origin
Cross-Origin-Resource-Policy: same-origin
```

### Rate Limiting
Enforced per IP address via SlowAPI:
- **Global default**: 200 requests/minute
- **Scraper trigger** (`POST /api/v1/scraper/trigger`): 5 requests/minute
- **File upload** (`POST /api/v1/upload/companies-pdf`): 10 requests/minute

Exceeding limits returns HTTP 429 with a `Retry-After` header.

### Distributed Tracing
Every request receives a `X-Request-ID` header (UUID v4). If the client sends
one, it is echoed back. This enables correlating frontend errors with backend
audit logs without exposing internal state.

### Container Security
- Both backend and frontend containers run as non-root users (UID 1001)
- Frontend uses a multi-stage Docker build — only the compiled standalone
  bundle ships to production, no build tooling or source code
- `--no-install-recommends` and `apt-get clean` minimise the OS attack surface

### CI/CD Security Gates
On every pull request and push to `main`:
- **Ruff** — Python linting and formatting enforcement
- **Bandit** — Python SAST (flags common security anti-patterns)
- **pip-audit** — checks Python dependencies against OSV / PyPI Advisory DB
- **npm audit** — checks Node.js dependencies against the npm security registry

Weekly automated scans:
- **TruffleHog** — scans the full git history for leaked secrets (verified only)
- Full dependency re-scan for both backend and frontend

## Secret Management

Secrets are managed exclusively through platform environment variables
(Render dashboard for backend, Vercel dashboard / GitHub Actions secrets for
frontend and CI). They are **never** committed to version control.

The `.gitignore` excludes `.env`, `.env.local`, and all `*.local` variants.

## Reporting a Vulnerability

If you discover a security issue, please **do not** open a public GitHub issue.

Contact the maintainer directly via the email on the GitHub profile, or open
a [GitHub private security advisory](https://github.com/Sakshitapkir03/jobtracker/security/advisories/new).

Please include:
- A description of the vulnerability and its potential impact
- Steps to reproduce
- Any relevant logs or screenshots (redact personal data)

You can expect an acknowledgement within 48 hours.
