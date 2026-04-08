from datetime import datetime
from pydantic import BaseModel, HttpUrl


class CompanyBase(BaseModel):
    name: str
    website: str | None = None
    careers_url: str | None = None
    logo_url: str | None = None
    industry: str | None = None
    notes: str | None = None


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    name: str | None = None
    website: str | None = None
    careers_url: str | None = None
    logo_url: str | None = None
    industry: str | None = None
    notes: str | None = None


class CompanyOut(CompanyBase):
    id: str
    user_id: str
    last_scraped_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedCompanies(BaseModel):
    items: list[CompanyOut]
    total: int
    page: int
    size: int
    pages: int
