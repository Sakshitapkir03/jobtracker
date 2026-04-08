from datetime import datetime
from pydantic import BaseModel
from .company import CompanyOut


class JobPostingOut(BaseModel):
    id: str
    company_id: str
    company: CompanyOut | None = None
    title: str
    url: str
    location: str | None
    description: str | None
    posted_at: datetime | None
    is_new: bool
    scraped_at: datetime

    model_config = {"from_attributes": True}


class PaginatedJobPostings(BaseModel):
    items: list[JobPostingOut]
    total: int
    page: int
    size: int
    pages: int
