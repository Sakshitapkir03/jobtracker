from datetime import datetime
from pydantic import BaseModel


class NotificationOut(BaseModel):
    id: str
    user_id: str
    title: str
    body: str
    link: str | None
    read: bool
    created_at: datetime

    model_config = {"from_attributes": True}
