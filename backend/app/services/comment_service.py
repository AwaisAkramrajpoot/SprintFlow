from sqlalchemy.orm import Session, joinedload

from app.core.enums import MemberRole
from app.core.exceptions import forbidden, not_found
from app.models.entities import Comment, Notification, Task, User
from app.services.task_service import get_company_task


def list_comments(db: Session, company_id: str, task_id: str) -> list[Comment]:
    task = get_company_task(db, company_id, task_id)
    return (
        db.query(Comment)
        .options(joinedload(Comment.user))
        .filter(Comment.task_id == task.id)
        .order_by(Comment.created_at.asc())
        .all()
    )


def add_comment(
    db: Session, company_id: str, actor: User, task_id: str, content: str
) -> Comment:
    task = get_company_task(db, company_id, task_id)
    comment = Comment(task_id=task.id, user_id=actor.id, content=content.strip())
    db.add(comment)
    if task.assignee_id and task.assignee_id != actor.id:
        db.add(
            Notification(
                user_id=task.assignee_id,
                message=f"{actor.full_name} commented on '{task.title}'.",
                is_read=False,
            )
        )
    if task.created_by and task.created_by not in {actor.id, task.assignee_id}:
        db.add(
            Notification(
                user_id=task.created_by,
                message=f"{actor.full_name} commented on '{task.title}'.",
                is_read=False,
            )
        )
    db.commit()
    db.refresh(comment)
    comment = (
        db.query(Comment)
        .options(joinedload(Comment.user))
        .filter(Comment.id == comment.id)
        .first()
    )
    return comment


def delete_comment(db: Session, actor: User, role: str, company_id: str, comment_id: str) -> None:
    comment = (
        db.query(Comment)
        .join(Task, Comment.task_id == Task.id)
        .filter(Comment.id == comment_id, Task.company_id == company_id)
        .first()
    )
    if comment is None:
        raise not_found("Comment")
    is_admin = role in {MemberRole.OWNER.value, MemberRole.ADMIN.value}
    if comment.user_id != actor.id and not is_admin:
        raise forbidden("You can only delete your own comments")
    db.delete(comment)
    db.commit()
