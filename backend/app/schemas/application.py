from datetime import datetime
from pydantic import BaseModel
from app.models.application import ApplicationStage
from .company import CompanyOut


class ApplicationBase(BaseModel):
    job_title: str
    company_id: str
    job_url: str | None = None
    stage: ApplicationStage = ApplicationStage.APPLIED
    applied_at: datetime
    notes: str | None = None
    salary_range: str | None = None


class ApplicationCreate(ApplicationBase):
    pass


class ApplicationUpdate(BaseModel):
    job_title: str | None = None
    company_id: str | None = None
    job_url: str | None = None
    stage: ApplicationStage | None = None
    applied_at: datetime | None = None
    notes: str | None = None
    salary_range: str | None = None


class ApplicationOut(ApplicationBase):
    id: str
    user_id: str
    company: CompanyOut | None = None
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaginatedApplications(BaseModel):
    items: list[ApplicationOut]
    total: int
    page: int
    size: int
    pages: int
