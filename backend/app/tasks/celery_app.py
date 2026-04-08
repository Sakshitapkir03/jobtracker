from celery import Celery
from celery.schedules import crontab
from app.config import settings

celery_app = Celery(
    "job_tracker",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.tasks.scraping_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)

# Daily scrape at 8 AM UTC
celery_app.conf.beat_schedule = {
    "daily-scrape-all": {
        "task": "app.tasks.scraping_tasks.scrape_all_users_task",
        "schedule": crontab(hour=8, minute=0),
    },
}
