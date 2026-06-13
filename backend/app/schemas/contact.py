from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ContactOut(BaseModel):
    id: str
    user_id: str
    company_id: str
    name: str
    title: Optional[str] = None
    email: Optional[str] = None
    linkedin_url: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ContactWithCompanyOut(ContactOut):
    company_name: str
