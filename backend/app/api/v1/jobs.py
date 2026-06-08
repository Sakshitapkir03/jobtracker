from math import ceil
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, or_, and_, not_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.job_posting import JobPosting
from app.schemas.job_posting import JobPostingOut, PaginatedJobPostings

router = APIRouter()

_ENTRY_TITLE = [
    "junior", "entry level", "entry-level", "new grad", "new-grad",
    "associate", "graduate", "intern", "co-op", "coop", "early career",
    "university grad", "campus", "apprentice",
]
_ENTRY_DESC = [
    "new grad", "new graduate", "recent grad", "recent graduate",
    "entry level", "entry-level", "early career", "no prior experience",
    "no experience required", "recent college", "fresh graduate",
    "0-1 year", "0-2 year", "0 to 1 year", "0 to 2 year",
    "1-2 year", "1 to 2 year", "up to 2 year",
    "0+ years", "1+ year", "2 years of experience",
]
_SENIOR_TITLE = [
    "senior", " sr ", "sr.", "staff engineer", "staff software",
    "principal", " lead ", "tech lead", "manager", "director",
    " vp ", "head of", "architect", "distinguished", "fellow",
]


@router.get("", response_model=PaginatedJobPostings)
async def list_jobs(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    company_id: str | None = None,
    keyword: str | None = None,
    location: str | None = None,
    days: int = Query(7, ge=1, le=30),
    entry_level: bool = Query(False),
    db: AsyncSession = Depends(get_db),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    date_filter = or_(
        JobPosting.posted_at >= since,
        (JobPosting.posted_at.is_(None)) & (JobPosting.scraped_at >= since),
    )
    q = (
        select(JobPosting)
        .options(selectinload(JobPosting.company))
        .where(date_filter)
        .order_by(JobPosting.scraped_at.desc())
    )
    if company_id:
        q = q.where(JobPosting.company_id == company_id)
    if keyword:
        q = q.where(JobPosting.title.ilike(f"%{keyword}%"))
    if location:
        q = q.where(JobPosting.location.ilike(f"%{location}%"))
    if entry_level:
        positive = or_(
            *[JobPosting.title.ilike(f"%{s}%") for s in _ENTRY_TITLE],
            *[JobPosting.description.ilike(f"%{s}%") for s in _ENTRY_DESC],
        )
        no_senior = not_(or_(*[JobPosting.title.ilike(f"%{s}%") for s in _SENIOR_TITLE]))
        q = q.where(and_(positive, no_senior))

    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    items = (await db.scalars(q.offset((page - 1) * size).limit(size))).all()

    return PaginatedJobPostings(
        items=items, total=total, page=page, size=size,
        pages=ceil(total / size) if total else 1,
    )
