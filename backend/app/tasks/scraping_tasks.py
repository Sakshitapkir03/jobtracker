"""
Celery tasks for scraping job postings.

Flow:
  scrape_all_companies_task
    └─ for each company → scrape_company_task
         └─ discover careers URL if missing
         └─ scrape job postings
         └─ upsert new job_postings
"""
import asyncio
import logging
import redis
from datetime import datetime, timezone
from celery import shared_task
from sqlalchemy import select
from app.tasks.celery_app import celery_app
from app.database import AsyncSessionLocal
from app.models.company import Company
from app.models.job_posting import JobPosting
from app.services.scraper import scrape_company_jobs, find_careers_url
from app.config import settings

logger = logging.getLogger(__name__)

# Sync Redis client for use inside Celery tasks (sync context)
_redis_sync = redis.from_url(settings.redis_url, decode_responses=True)


def run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


def _set_status(company_id: str, status: str):
    try:
        _redis_sync.setex(f"scrape:status:{company_id}", 7200, status)
    except Exception:
        pass


@celery_app.task(
    name="app.tasks.scraping_tasks.scrape_company_task",
    bind=True,
    max_retries=2,
    default_retry_delay=60,
)
def scrape_company_task(self, company_id: str):
    """Scrape jobs for a single company."""
    _set_status(company_id, "running")
    try:
        result = run_async(_scrape_company(company_id))
        _set_status(company_id, "done")
        return result
    except Exception as exc:
        _set_status(company_id, "failed")
        logger.error("scrape_company_task failed for %s: %s", company_id, exc)
        raise self.retry(exc=exc)


@celery_app.task(name="app.tasks.scraping_tasks.scrape_all_companies_task")
def scrape_all_companies_task():
    """Queue scrape tasks for all companies."""
    return run_async(_scrape_all_companies())


async def _scrape_company(company_id: str):
    async with AsyncSessionLocal() as db:
        company = await db.get(Company, company_id)
        if not company:
            return {"error": "company not found"}

        # Auto-discover careers URL when missing
        if not company.careers_url:
            logger.info("Discovering careers URL for %s", company.name)
            found = await find_careers_url(company.name)
            if not found:
                logger.warning("Could not find careers URL for %s", company.name)
                company.last_scraped_at = datetime.now(timezone.utc)
                await db.commit()
                return {"company": company.name, "new_jobs": 0, "error": "no_url"}
            company.careers_url = found
            await db.flush()

        logger.info("Scraping %s → %s", company.name, company.careers_url)
        raw_jobs = await scrape_company_jobs(
            company.careers_url, headless=settings.playwright_headless
        )

        new_count = 0
        for job_data in raw_jobs:
            # Skip duplicates
            existing = await db.scalar(
                select(JobPosting).where(JobPosting.url == job_data["url"])
            )
            if existing:
                continue
            posting = JobPosting(company_id=company_id, **job_data)
            db.add(posting)
            new_count += 1

        company.last_scraped_at = datetime.now(timezone.utc)
        await db.commit()

        logger.info("Scraped %d new jobs for %s", new_count, company.name)
        return {"company": company.name, "new_jobs": new_count}


async def _scrape_all_companies():
    async with AsyncSessionLocal() as db:
        companies = (await db.scalars(select(Company))).all()

    queued = 0
    for company in companies:
        scrape_company_task.delay(company.id)
        queued += 1

    logger.info("Queued scrape for %d companies", queued)
    return {"queued": queued}
