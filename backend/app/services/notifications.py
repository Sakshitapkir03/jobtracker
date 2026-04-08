"""Create in-app notifications stored in DB (triggers Supabase Realtime)."""
import uuid
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.notification import Notification

logger = logging.getLogger(__name__)


async def create_notification(
    db: AsyncSession,
    user_id: str,
    title: str,
    body: str,
    link: str | None = None,
) -> Notification:
    notification = Notification(
        id=str(uuid.uuid4()),
        user_id=user_id,
        title=title,
        body=body,
        link=link,
    )
    db.add(notification)
    await db.flush()
    logger.info("Created notification for user %s: %s", user_id, title)
    return notification
