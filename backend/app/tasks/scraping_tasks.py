"""
Background scraping tasks (pure async — no Celery required).
"""
import asyncio
import logging
from datetime import datetime, timezone
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.company import Company
from app.models.job_posting import JobPosting
from app.services.scraper import scrape_company_jobs, find_careers_url

logger = logging.getLogger(__name__)


async def _scrape_company(company_id: str) -> dict:
    async with AsyncSessionLocal() as db:
        company = await db.get(Company, company_id)
        if not company:
            return {"error": "company not found"}

        if not company.careers_url:
            logger.info("Discovering careers URL for %s", company.name)
            found = await find_careers_url(company.name)
            if not found:
                logger.warning("No URL found for %s", company.name)
                company.last_scraped_at = datetime.now(timezone.utc)
                await db.commit()
                return {"company": company.name, "new_jobs": 0}
            company.careers_url = found
            await db.flush()

        logger.info("Scraping %s → %s", company.name, company.careers_url)
        raw_jobs = await scrape_company_jobs(company.careers_url)

        new_count = 0
        for job_data in raw_jobs:
            existing = await db.scalar(
                select(JobPosting).where(JobPosting.url == job_data["url"])
            )
            if existing:
                continue
            db.add(JobPosting(company_id=company_id, **job_data))
            new_count += 1

        company.last_scraped_at = datetime.now(timezone.utc)
        await db.commit()

        logger.info("Scraped %d new jobs for %s", new_count, company.name)
        return {"company": company.name, "new_jobs": new_count}


async def _scrape_all_companies():
    async with AsyncSessionLocal() as db:
        companies = (await db.scalars(select(Company))).all()

    logger.info("Starting scrape for %d companies", len(companies))

    # Process in small concurrent batches to avoid overwhelming the DB/network
    semaphore = asyncio.Semaphore(3)

    async def _bounded(company_id: str):
        async with semaphore:
            try:
                await _scrape_company(company_id)
            except Exception as exc:
                logger.error("Failed scraping %s: %s", company_id, exc)

    await asyncio.gather(*[_bounded(c.id) for c in companies])
    logger.info("Scrape all completed")
