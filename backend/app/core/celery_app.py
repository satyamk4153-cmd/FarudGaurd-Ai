import os
import logging
from celery import Celery
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

# Initialize Celery app
celery_app = Celery(
    "fraudguard_worker",
    broker=settings.REDIS_URL or "redis://localhost:6379/0",
    backend=settings.REDIS_URL or "redis://localhost:6379/0",
    include=["backend.app.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
    task_time_limit=3600,
    worker_prefetch_multiplier=1,
    broker_connection_retry_on_startup=True,
)
