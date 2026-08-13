from pathlib import Path

from fastapi import APIRouter, Depends, File, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.dependencies import ANY_MEMBER, AuthContext
from app.core.exceptions import not_found
from app.core.extended_settings import extended_settings
from app.db.session import get_db
from app.schemas.common import MessageResponse
from app.schemas.taskflow import AttachmentResponse
from app.services import attachment_service
from app.services.serializers import attachment_to_dict

router = APIRouter(prefix="/attachments", tags=["attachments"])


@router.get("", response_model=list[AttachmentResponse])
def list_attachments(
    task_id: str = Query(...),
    ctx: AuthContext = Depends(ANY_MEMBER),
    db: Session = Depends(get_db),
):
    items = attachment_service.list_attachments(db, ctx.company.id, task_id)
    return [AttachmentResponse(**attachment_to_dict(item)) for item in items]


@router.post("", response_model=AttachmentResponse)
def upload_attachment(
    task_id: str = Query(...),
    file: UploadFile = File(...),
    ctx: AuthContext = Depends(ANY_MEMBER),
    db: Session = Depends(get_db),
):
    item = attachment_service.upload_attachment(
        db, ctx.company.id, ctx.user, task_id, file
    )
    return AttachmentResponse(**attachment_to_dict(item))


@router.get("/{attachment_id}/file")
def download_attachment(
    attachment_id: str,
    ctx: AuthContext = Depends(ANY_MEMBER),
    db: Session = Depends(get_db),
):
    item = attachment_service.get_attachment(db, ctx.company.id, attachment_id)
    filename = Path(item.file_url).name
    path = Path(extended_settings.upload_dir) / filename
    if not path.exists():
        raise not_found("File")
    return FileResponse(path, filename=item.original_name)


@router.delete("/{attachment_id}", response_model=MessageResponse)
def delete_attachment(
    attachment_id: str,
    ctx: AuthContext = Depends(ANY_MEMBER),
    db: Session = Depends(get_db),
):
    item = attachment_service.get_attachment(db, ctx.company.id, attachment_id)
    attachment_service.delete_attachment(db, ctx.user, ctx.role, item)
    return MessageResponse(message="Attachment deleted")
