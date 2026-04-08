import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from celery.result import AsyncResult
from app.services.cache import get_redis
from app.tasks.scraping_tasks import scrape_company_task, scrape_all_companies_task

logger = logging.getLogger(__name__)
router = APIRouter()


class TriggerRequest(BaseModel):
    company_id: str | None = None


@router.post("/trigger")
async def trigger_scrape(body: TriggerRequest):
    if body.company_id:
        task = scrape_company_task.delay(body.company_id)
        # Track which task is running for this company
        r = get_redis()
        await r.setex(f"scrape:task:{body.company_id}", 7200, task.id)
        await r.setex(f"scrape:status:{body.company_id}", 7200, "queued")
    else:
        task = scrape_all_companies_task.delay()

    return {"task_id": task.id, "status": "queued"}


@router.get("/status/{company_id}")
async def scrape_status(company_id: str):
    r = get_redis()
    task_id = await r.get(f"scrape:task:{company_id}")
    status = await r.get(f"scrape:status:{company_id}")

    if not task_id:
        return {"company_id": company_id, "status": "idle", "task_id": None}

    # Also check Celery result state
    result = AsyncResult(task_id)
    celery_state = result.state  # PENDING, STARTED, SUCCESS, FAILURE

    if celery_state == "SUCCESS":
        return {"company_id": company_id, "status": "done", "task_id": task_id}
    elif celery_state == "FAILURE":
        return {"company_id": company_id, "status": "failed", "task_id": task_id}
    elif celery_state in ("STARTED", "RETRY"):
        return {"company_id": company_id, "status": "running", "task_id": task_id}

    return {"company_id": company_id, "status": status or "queued", "task_id": task_id}


@router.get("/task/{task_id}")
async def task_status(task_id: str):
    result = AsyncResult(task_id)
    return {
        "task_id": task_id,
        "state": result.state,
        "result": result.result if result.ready() else None,
    }
