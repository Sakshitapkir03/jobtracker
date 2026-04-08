# H1B Job Finder

Real-time job discovery pipeline for H1B sponsor companies.

## How it works

1. Upload an Excel / CSV / PDF with company names (no URLs needed)
2. Click **Scrape All** — the system auto-discovers each company's careers page and scrapes jobs posted in the past 7 days
3. Browse the **Job Feed**, filter by keyword or location
4. Click **+ Applied** to track applications

## Stack

- **Frontend**: Next.js 14, Tailwind CSS, React Query
- **Backend**: FastAPI, SQLAlchemy, PostgreSQL (Supabase)
- **Scraping**: Playwright + DuckDuckGo URL discovery
- **Queue**: Celery + Redis

## Local development

### Prerequisites
- Node.js 18+
- Python 3.11+
- Redis (`brew install redis && redis-server`)
- Playwright (`playwright install chromium`)

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium

cp .env.example .env
# Fill in DATABASE_URL and REDIS_URL

uvicorn app.main:app --reload --port 8000
```

### Celery worker (in a separate terminal)

```bash
cd backend
source .venv/bin/activate
celery -A app.tasks.celery_app worker --loglevel=info --concurrency=4
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

## Deployment

### Docker Compose (full stack)

```bash
cp .env.example .env
# Fill in DATABASE_URL

docker-compose up --build
```

### Vercel (frontend) + Railway (backend)

See `backend/.env.example` and `frontend/.env.local.example` for required environment variables.
