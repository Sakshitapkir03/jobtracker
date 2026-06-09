from datetime import datetime
from pydantic import BaseModel


class AlertCreate(BaseModel):
    role_keyword: str


class AlertOut(BaseModel):
    id: str
    user_id: str
    role_keyword: str
    is_active: bool
    last_notified_at: datetime | None
    created_at: datetime
    model_config = {"from_attributes": True}
