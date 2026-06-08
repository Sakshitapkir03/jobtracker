from datetime import datetime
from pydantic import BaseModel, Field
from app.models.application import ApplicationStage
from .company import CompanyOut


class ApplicationBase(BaseModel):
    job_title: str = Field(..., max_length=500)
    company_id: str
    job_url: str | None = Field(None, max_length=2000)
    stage: ApplicationStage = ApplicationStage.APPLIED
    applied_at: datetime
    notes: str | None = Field(None, max_length=10_000)
    salary_range: str | None = Field(None, max_length=200)


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
