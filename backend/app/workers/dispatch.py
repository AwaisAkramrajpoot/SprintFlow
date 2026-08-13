"""Safely enqueue Celery jobs with sync fallback for local dev."""

from __future__ import annotations

import logging

from app.core.extended_settings import extended_settings

logger = logging.getLogger("taskflow.workers")


def enqueue_task_assignment_email(
    *,
    assignee_email: str,
    assignee_name: str,
    task_title: str,
    actor_name: str,
    board_url: str | None = None,
) -> None:
    url = board_url or f"{extended_settings.frontend_url}/app/board"
    try:
        from app.workers.tasks import send_task_assignment_email

        send_task_assignment_email.delay(
            assignee_email,
            assignee_name,
            task_title,
            actor_name,
            url,
        )
        logger.info("Queued assignment email for %s", assignee_email)
    except Exception as exc:
        logger.warning("Celery unavailable, sending assignment email inline: %s", exc)
        from app.services.email_service import send_email, task_assignment_email

        subject, html = task_assignment_email(
            assignee_name, task_title, actor_name, url
        )
        send_email(assignee_email, subject, html)
