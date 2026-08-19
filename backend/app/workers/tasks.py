from __future__ import annotations

import logging
from datetime import date, datetime, timezone

from sqlalchemy.orm import joinedload

from app.db.session import SessionLocal
from app.models.entities import Notification, Task, User
from app.services.email_service import (
    daily_digest_email,
    overdue_task_email,
    send_email,
    task_assignment_email,
)
from app.workers.celery_app import celery_app

logger = logging.getLogger("taskflow.workers")


def _session():
    return SessionLocal()


@celery_app.task(name="app.workers.tasks.send_task_assignment_email", bind=True, max_retries=3)
def send_task_assignment_email(
    self,
    assignee_email: str,
    assignee_name: str,
    task_title: str,
    actor_name: str,
    board_url: str,
) -> str:
    try:
        subject, html = task_assignment_email(
            assignee_name, task_title, actor_name, board_url
        )
        send_email(assignee_email, subject, html)
        return f"assignment-email-sent:{assignee_email}"
    except Exception as exc:
        logger.exception("Assignment email failed for %s", assignee_email)
        raise self.retry(exc=exc, countdown=30)


@celery_app.task(name="app.workers.tasks.send_daily_digest")
def send_daily_digest() -> dict:
    today = date.today()
    sent = 0
    db = _session()
    try:
        users = (
            db.query(User)
            .filter(User.email.isnot(None))
            .all()
        )
        for user in users:
            tasks = (
                db.query(Task)
                .options(joinedload(Task.board))
                .filter(
                    Task.assignee_id == user.id,
                    Task.due_date == today,
                    Task.status != "Done",
                )
                .order_by(Task.priority.desc(), Task.title.asc())
                .all()
            )
            if not tasks:
                continue
            task_lines = [
                f"<li><strong>{task.title}</strong> — {task.priority} · {task.status}</li>"
                for task in tasks
            ]
            subject, html = daily_digest_email(user.full_name, task_lines)
            send_email(user.email, subject, html)
            sent += 1
        logger.info("Daily digest sent to %s users", sent)
        return {"sent": sent, "date": today.isoformat()}
    finally:
        db.close()


@celery_app.task(name="app.workers.tasks.check_overdue_tasks")
def check_overdue_tasks() -> dict:
    today = date.today()
    flagged = 0
    notified = 0
    db = _session()
    try:
        overdue_tasks = (
            db.query(Task)
            .options(joinedload(Task.assignee), joinedload(Task.board))
            .filter(
                Task.due_date.isnot(None),
                Task.due_date < today,
                Task.status != "Done",
                Task.assignee_id.isnot(None),
            )
            .all()
        )

        for task in overdue_tasks:
            flagged += 1
            assignee = task.assignee
            if not assignee or not assignee.email:
                continue

            already_notified = (
                db.query(Notification)
                .filter(
                    Notification.user_id == assignee.id,
                    Notification.message.like(f"%OVERDUE:{task.id}%"),
                )
                .first()
            )
            if already_notified:
                continue

            message = (
                f"OVERDUE:{task.id} Task '{task.title}' is overdue "
                f"(due {task.due_date.isoformat()})."
            )
            db.add(Notification(user_id=assignee.id, message=message, is_read=False))

            subject, html = overdue_task_email(
                assignee.full_name,
                task.title,
                task.due_date.isoformat(),
            )
            send_email(assignee.email, subject, html)
            notified += 1

        db.commit()
        logger.info("Overdue check: %s flagged, %s notified", flagged, notified)
        return {
            "flagged": flagged,
            "notified": notified,
            "checked_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@celery_app.task(name="app.workers.tasks.process_meeting_summary", bind=True, max_retries=2)
def process_meeting_summary(
    self,
    path: str,
    company_id: str,
    user_id: str,
    project_id: str | None,
    create_tasks: bool,
) -> dict:
    db = _session()
    try:
        from app.models.entities import User
        from app.services.ai import ai_service

        actor = db.get(User, user_id)
        if actor is None:
            raise ValueError("User not found")
        transcript = ai_service.transcribe_audio(path)
        return ai_service.meeting_summary_from_transcript(
            db,
            company_id,
            actor,
            transcript,
            project_id,
            create_tasks,
        )
    except Exception as exc:
        logger.exception("Meeting summary failed")
        raise self.retry(exc=exc, countdown=20)
    finally:
        db.close()


@celery_app.task(name="app.workers.tasks.generate_daily_ai_reports")
def generate_daily_ai_reports() -> dict:
    from app.services.ai import ai_service

    return ai_service.generate_daily_reports_for_all_companies()


@celery_app.task(name="app.workers.tasks.ingest_knowledge_document", bind=True, max_retries=2)
def ingest_knowledge_document(self, document_id: str) -> dict:
    from app.core.exceptions import AppException
    from app.services.ai import rag_service

    try:
        return rag_service.run_ingest_job(document_id)
    except Exception as exc:
        logger.exception("Knowledge ingest failed for %s", document_id)
        if isinstance(exc, AppException) and exc.status_code < 500:
            raise
        raise self.retry(exc=exc, countdown=20)
