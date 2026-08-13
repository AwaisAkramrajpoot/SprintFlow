from sqlalchemy.orm import Session

from app.core.exceptions import not_found
from app.models.entities import Notification


def list_notifications(db: Session, user_id: str, limit: int, offset: int, unread_only: bool = False):
    query = db.query(Notification).filter(Notification.user_id == user_id)
    if unread_only:
        query = query.filter(Notification.is_read.is_(False))
    total = query.count()
    unread = (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read.is_(False))
        .count()
    )
    items = (
        query.order_by(Notification.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return items, total, unread


def mark_read(db: Session, user_id: str, notification_id: str) -> Notification:
    item = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == user_id)
        .first()
    )
    if item is None:
        raise not_found("Notification")
    item.is_read = True
    db.commit()
    db.refresh(item)
    return item


def mark_all_read(db: Session, user_id: str) -> int:
    updated = (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read.is_(False))
        .update({Notification.is_read: True})
    )
    db.commit()
    return updated
