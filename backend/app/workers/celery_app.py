from __future__ import annotations

from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

celery_app = Celery(
    "taskflow",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    worker_prefetch_multiplier=1,
    beat_schedule={
        "daily-digest": {
            "task": "app.workers.tasks.send_daily_digest",
            "schedule": crontab(hour=8, minute=0),
        },
        "hourly-overdue-check": {
            "task": "app.workers.tasks.check_overdue_tasks",
            "schedule": crontab(minute=0),
        },
    },
)
