from math import ceil
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.job_posting import JobPosting
from app.schemas.job_posting import JobPostingOut, PaginatedJobPostings

router = APIRouter()


@router.get("", response_model=PaginatedJobPostings)
async def list_jobs(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    company_id: str | None = None,
    keyword: str | None = None,
    location: str | None = None,
    days: int = Query(7, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    q = (
        select(JobPosting)
        .options(selectinload(JobPosting.company))
        .where(JobPosting.scraped_at >= since)
        .order_by(JobPosting.scraped_at.desc())
    )
    if company_id:
        q = q.where(JobPosting.company_id == company_id)
    if keyword:
        q = q.where(JobPosting.title.ilike(f"%{keyword}%"))
    if location:
        q = q.where(JobPosting.location.ilike(f"%{location}%"))

    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    items = (await db.scalars(q.offset((page - 1) * size).limit(size))).all()

    return PaginatedJobPostings(
        items=items, total=total, page=page, size=size,
        pages=ceil(total / size) if total else 1,
    )
