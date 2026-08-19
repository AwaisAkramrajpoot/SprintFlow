"""Safely enqueue Celery jobs with sync fallback for local dev."""

from __future__ import annotations

import logging

from app.core.extended_settings import extended_settings

logger = logging.getLogger("taskflow.workers")

_INLINE_JOBS: dict[str, dict] = {}


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


def enqueue_meeting_summary(
    *,
    path: str,
    company_id: str,
    user_id: str,
    project_id: str | None,
    create_tasks: bool,
) -> str:
    try:
        from app.workers.tasks import process_meeting_summary

        result = process_meeting_summary.delay(
            path, company_id, user_id, project_id, create_tasks
        )
        logger.info("Queued meeting summary job %s", result.id)
        return result.id
    except Exception as exc:
        logger.warning("Celery unavailable, processing meeting inline: %s", exc)
        from app.db.session import SessionLocal
        from app.models.entities import User
        from app.services.ai import ai_service

        db = SessionLocal()
        try:
            actor = db.get(User, user_id)
            transcript = ai_service.transcribe_audio(path)
            payload = ai_service.meeting_summary_from_transcript(
                db, company_id, actor, transcript, project_id, create_tasks
            )
        finally:
            db.close()
        job_id = f"inline-{company_id[:8]}"
        _INLINE_JOBS[job_id] = {"status": "success", "result": payload, "error": None}
        return job_id


def enqueue_knowledge_ingest(*, document_id: str) -> str:
    try:
        from app.workers.tasks import ingest_knowledge_document

        result = ingest_knowledge_document.delay(document_id)
        logger.info("Queued knowledge ingest job %s for %s", result.id, document_id)
        return result.id
    except Exception as exc:
        logger.warning("Celery unavailable, ingesting document inline: %s", exc)
        from app.db.session import SessionLocal
        from app.services.ai import rag_service

        db = SessionLocal()
        try:
            payload = rag_service.ingest_document(db, document_id)
        finally:
            db.close()
        job_id = f"inline-kb-{document_id[:8]}"
        _INLINE_JOBS[job_id] = {"status": "success", "result": payload, "error": None}
        return job_id


def get_job_status(job_id: str) -> dict:
    if job_id in _INLINE_JOBS:
        return _INLINE_JOBS[job_id]
    try:
        from celery.result import AsyncResult

        from app.workers.celery_app import celery_app

        result = AsyncResult(job_id, app=celery_app)
        if result.state in {"PENDING", "STARTED", "RETRY"}:
            return {"status": result.state.lower(), "result": None, "error": None}
        if result.successful():
            return {"status": "success", "result": result.result, "error": None}
        return {
            "status": "failed",
            "result": None,
            "error": str(result.result) if result.result else result.state,
        }
    except Exception as exc:
        return {"status": "unknown", "result": None, "error": str(exc)}
