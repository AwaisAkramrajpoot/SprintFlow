from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import ANY_MEMBER, AuthContext
from app.db.session import get_db
from app.schemas.common import MessageResponse
from app.services import notification_service
from app.services.serializers import notification_to_dict

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
def list_notifications(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    unread_only: bool = Query(default=False),
    ctx: AuthContext = Depends(ANY_MEMBER),
    db: Session = Depends(get_db),
):
    items, total, unread = notification_service.list_notifications(
        db, ctx.user.id, limit, offset, unread_only
    )
    return {
        "items": [notification_to_dict(item) for item in items],
        "total": total,
        "unread_count": unread,
        "limit": limit,
        "offset": offset,
    }


@router.patch("/{notification_id}/read", response_model=MessageResponse)
def mark_read(
    notification_id: str,
    ctx: AuthContext = Depends(ANY_MEMBER),
    db: Session = Depends(get_db),
):
    notification_service.mark_read(db, ctx.user.id, notification_id)
    return MessageResponse(message="Marked as read")


@router.post("/read-all", response_model=MessageResponse)
def mark_all_read(
    ctx: AuthContext = Depends(ANY_MEMBER),
    db: Session = Depends(get_db),
):
    count = notification_service.mark_all_read(db, ctx.user.id)
    return MessageResponse(message=f"{count} notifications marked as read")
