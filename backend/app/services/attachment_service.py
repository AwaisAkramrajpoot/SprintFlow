from pathlib import Path

from fastapi import UploadFile
from sqlalchemy.orm import Session, joinedload

from app.core.enums import MemberRole
from app.core.exceptions import bad_request, forbidden, not_found
from app.core.extended_settings import extended_settings
from app.models.entities import Attachment, User
from app.services.task_service import get_company_task


def _ensure_upload_dir() -> Path:
    path = Path(extended_settings.upload_dir)
    path.mkdir(parents=True, exist_ok=True)
    return path


def list_attachments(db: Session, company_id: str, task_id: str) -> list[Attachment]:
    task = get_company_task(db, company_id, task_id)
    return (
        db.query(Attachment)
        .options(joinedload(Attachment.uploader))
        .filter(Attachment.task_id == task.id)
        .order_by(Attachment.created_at.desc())
        .all()
    )


def upload_attachment(
    db: Session, company_id: str, actor: User, task_id: str, file: UploadFile
) -> Attachment:
    task = get_company_task(db, company_id, task_id)
    data = file.file.read()
    if not data:
        raise bad_request("Empty file")
    if len(data) > extended_settings.max_upload_bytes:
        raise bad_request("File exceeds the 10MB upload limit")

    upload_dir = _ensure_upload_dir()
    safe_name = Path(file.filename or "upload.bin").name
    stored = Attachment(
        task_id=task.id,
        file_url="",
        original_name=safe_name,
        size_bytes=len(data),
        uploaded_by=actor.id,
    )
    db.add(stored)
    db.flush()
    destination = upload_dir / f"{stored.id}_{safe_name}"
    destination.write_bytes(data)
    stored.file_url = f"/uploads/{destination.name}"
    db.commit()
    return (
        db.query(Attachment)
        .options(joinedload(Attachment.uploader))
        .filter(Attachment.id == stored.id)
        .first()
    )


def get_attachment(db: Session, company_id: str, attachment_id: str) -> Attachment:
    item = (
        db.query(Attachment)
        .options(joinedload(Attachment.task), joinedload(Attachment.uploader))
        .filter(Attachment.id == attachment_id)
        .first()
    )
    if item is None or item.task is None or item.task.company_id != company_id:
        raise not_found("Attachment")
    return item


def delete_attachment(db: Session, actor: User, role: str, item: Attachment) -> None:
    is_admin = role in {MemberRole.OWNER.value, MemberRole.ADMIN.value}
    if item.uploaded_by != actor.id and not is_admin:
        raise forbidden("You can only delete attachments you uploaded")
    filename = Path(item.file_url).name if item.file_url else None
    db.delete(item)
    db.commit()
    if filename:
        path = Path(extended_settings.upload_dir) / filename
        if path.exists():
            path.unlink()
