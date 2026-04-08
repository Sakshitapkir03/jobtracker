import asyncio
import logging
from fastapi import APIRouter
from pydantic import BaseModel
from app.services.cache import get_status, set_status
from app.tasks.scraping_tasks import _scrape_company, _scrape_all_companies

logger = logging.getLogger(__name__)
router = APIRouter()


class TriggerRequest(BaseModel):
    company_id: str | None = None


async def _run_one(company_id: str):
    set_status(company_id, "running")
    try:
        await _scrape_company(company_id)
        set_status(company_id, "done")
    except Exception as exc:
        logger.error("Scrape failed for %s: %s", company_id, exc)
        set_status(company_id, "failed")


async def _run_all():
    await _scrape_all_companies()


@router.post("/trigger")
async def trigger_scrape(body: TriggerRequest):
    if body.company_id:
        set_status(body.company_id, "queued")
        asyncio.create_task(_run_one(body.company_id))
        return {"status": "queued", "company_id": body.company_id}
    else:
        asyncio.create_task(_run_all())
        return {"status": "queued"}


@router.get("/status/{company_id}")
async def scrape_status(company_id: str):
    return {"company_id": company_id, "status": get_status(company_id)}
