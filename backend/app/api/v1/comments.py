from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import ANY_MEMBER, AuthContext
from app.db.session import get_db
from app.schemas.common import MessageResponse
from app.schemas.taskflow import CommentCreate, CommentResponse
from app.services import comment_service
from app.services.serializers import comment_to_dict

router = APIRouter(prefix="/comments", tags=["comments"])


@router.get("", response_model=list[CommentResponse])
def list_comments(
    task_id: str = Query(...),
    ctx: AuthContext = Depends(ANY_MEMBER),
    db: Session = Depends(get_db),
):
    comments = comment_service.list_comments(db, ctx.company.id, task_id)
    return [CommentResponse(**comment_to_dict(item)) for item in comments]


@router.post("", response_model=CommentResponse)
def create_comment(
    payload: CommentCreate,
    ctx: AuthContext = Depends(ANY_MEMBER),
    db: Session = Depends(get_db),
):
    comment = comment_service.add_comment(
        db, ctx.company.id, ctx.user, payload.task_id, payload.content
    )
    return CommentResponse(**comment_to_dict(comment))


@router.delete("/{comment_id}", response_model=MessageResponse)
def delete_comment(
    comment_id: str,
    ctx: AuthContext = Depends(ANY_MEMBER),
    db: Session = Depends(get_db),
):
    comment_service.delete_comment(db, ctx.user, ctx.role, ctx.company.id, comment_id)
    return MessageResponse(message="Comment deleted")
