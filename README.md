# H1B Job Discovery Pipeline

> Automatically discover and track real-time job openings at companies that sponsor H1B visas.

**[Read the full build story on Substack →]()**

---

## What It Does

Upload an Excel or CSV file containing H1B sponsor company names — no URLs, no manual research needed. The system:

1. **Discovers** each company's careers page automatically (Greenhouse, Lever, Ashby, Workday, or web search)
2. **Scrapes** live job postings directly from the ATS APIs — not job boards
3. **Surfaces** openings in a searchable, filterable feed
4. **Tracks** your applications through the hiring pipeline

Every job shown is a real, currently open position pulled directly from the company's hiring system.

---

## The Problem This Solves

The H1B visa process limits international job seekers to a narrow pool of companies willing to sponsor. The [USCIS H1B disclosure data](https://www.uscis.gov/tools/reports-and-studies/h-1b-employer-data-hub) lists ~45,000+ employer names — but no job links, no career page URLs, no ATS information. Manually checking each company's website is not feasible.

This pipeline automates the entire discovery and monitoring process.

---

## Architecture

```
Excel Upload → Company DB
                   ↓
          Celery Task Queue (Redis)
                   ↓
         URL Discovery (per company)
          ├── Direct ATS Probe      ← Greenhouse / Lever / Ashby slugs
          ├── DuckDuckGo ATS Search ← site:boards.greenhouse.io "Company"
          └── General Web Search   ← fallback
                   ↓
         ATS-Specific Scraper
          ├── Greenhouse API    (boards-api.greenhouse.io)
          ├── Lever API         (api.lever.co)
          ├── Ashby GraphQL     (jobs.ashbyhq.com)
          ├── Workday JSON API  (myworkdayjobs.com)
          └── Playwright        (fallback for everything else)
                   ↓
         PostgreSQL (Supabase)
                   ↓
         Next.js Job Feed → Apply → Application Tracker
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router), React Query v5, Tailwind CSS, shadcn/ui |
| **Backend** | FastAPI (async), SQLAlchemy 2.0 (async), asyncpg |
| **Database** | PostgreSQL via Supabase |
| **Task Queue** | Celery 5 + Redis |
| **Scraping** | httpx (async HTTP), Playwright (browser automation) |
| **Parsing** | PyMuPDF (PDF), openpyxl (Excel), csv (CSV) |
| **Deployment** | Docker Compose, Vercel (frontend), Railway (backend) |

---

## Key Engineering Concepts

**Async-first architecture** — FastAPI + asyncpg + httpx keep the backend non-blocking. URL discovery fires HEAD requests to 12 ATS endpoints concurrently per company.

**ATS fingerprinting** — Before any scraping, the system identifies which Applicant Tracking System a company uses (Greenhouse, Lever, Ashby, Workday) and calls the native JSON/GraphQL API directly. This avoids Playwright for ~70% of companies, reducing overhead by 10x.

**Slug inference** — Company names from the H1B dataset are in raw legal form ("STRIPE INC", "GOOGLE LLC"). The pipeline strips legal suffixes, generates 4 slug variants, and probes ATS domains directly before falling back to search — eliminating unnecessary DuckDuckGo calls.

**Idempotent upserts** — Jobs are deduplicated by URL. Re-scraping a company only adds genuinely new postings without duplicates.

**Distributed task queue** — 45,000+ companies are processed as independent Celery tasks. Failed tasks retry with exponential backoff. Redis tracks per-company scrape status for real-time UI feedback.

**Connection pool management** — Supabase's free tier has a 15-connection session-mode limit. Pool size is tuned per service (FastAPI: 3, Celery workers: 3 each) to stay within bounds without sacrificing throughput.

**No auth by design** — This is a local single-user tool. Removing Supabase RLS, JWT validation, and the auth middleware cut ~400 lines of boilerplate and eliminated an entire class of 500 errors.

---

## Impact & Scope

- **~45,000 H1B sponsor companies** in the dataset, covering Finance, Technology, Healthcare, and Professional Services
- Directly addresses the information asymmetry faced by international job seekers
- Scrapes job postings at their **source** — not LinkedIn or Indeed, which have their own algorithmic filters and may hide listings
- Application tracking closes the loop: discovery → apply → track → outcome

---

## Setup

### Prerequisites
- Node.js 18+, Python 3.11+
- Redis (`brew install redis && redis-server`)
- Playwright (`playwright install chromium`)
- A Supabase project (free tier works)

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium

cp .env.example .env
# Set DATABASE_URL and REDIS_URL

uvicorn app.main:app --reload --port 8000
```

### Celery Worker
```bash
# In a separate terminal
cd backend && source .venv/bin/activate
celery -A app.tasks.celery_app worker --loglevel=info --concurrency=2
```

### Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Database Migrations
Run these SQL migrations in your Supabase SQL editor (in order):
1. `supabase/migrations/20240101000000_initial.sql`
2. `supabase/migrations/20240102000000_remove_auth.sql`

### Docker (full stack)
```bash
cp .env.example .env  # fill in DATABASE_URL
docker-compose up --build
```

---

## Deployment

### Frontend → Vercel
```bash
cd frontend
vercel deploy --prod
# Set env: NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

### Backend → Railway
1. Connect your GitHub repo to Railway
2. Set root directory: `backend`
3. Add environment variables from `backend/.env.example`
4. Railway auto-detects the `Dockerfile`

The Celery worker is a separate Railway service using the same Docker image with command:
```
celery -A app.tasks.celery_app worker --loglevel=info --concurrency=2
```

---

## Possible Improvements

| Area | Idea |
|---|---|
| **Coverage** | Add iCIMS, SmartRecruiters, BambooHR, Taleo ATS parsers |
| **Freshness** | `posted_at` extraction per ATS (Greenhouse returns `updated_at`) |
| **Alerts** | Email / Slack notification when a target company posts a new role |
| **Relevance** | LLM-based job description matching against a resume |
| **Scheduling** | Celery Beat for automatic nightly re-scrapes |
| **Deduplication** | Fuzzy title matching to collapse near-duplicate postings |
| **Scale** | Replace Celery with a serverless queue (AWS SQS + Lambda) to handle spikes |
| **Auth** | Multi-user mode with Supabase Auth for shared team use |
| **Analytics** | Track application response rates by company / industry |

---

## Project Structure

```
job-tracker/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # FastAPI route handlers
│   │   ├── models/          # SQLAlchemy ORM models
│   │   ├── schemas/         # Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── scraper.py   # ATS detection + scraping logic
│   │   │   ├── pdf_parser.py
│   │   │   ├── csv_parser.py
│   │   │   └── excel_parser.py
│   │   └── tasks/
│   │       └── scraping_tasks.py  # Celery task definitions
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── app/             # Next.js App Router pages
│       ├── components/      # React components
│       └── lib/api.ts       # Typed API client
├── supabase/migrations/
└── docker-compose.yml
```

---

*Built to solve a real problem. Every job shown is a live opening at a verified H1B sponsor.*
