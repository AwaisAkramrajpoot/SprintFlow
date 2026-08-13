from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.models.entities import Attachment, Comment, Task


def search_tasks(db: Session, company_id: str, q: str, limit: int = 20, offset: int = 0):
    query = (
        db.query(Task)
        .options(
            joinedload(Task.comments).joinedload(Comment.user),
            joinedload(Task.attachments).joinedload(Attachment.uploader),
            joinedload(Task.assignee),
            joinedload(Task.creator),
            joinedload(Task.board),
        )
        .filter(Task.company_id == company_id)
    )

    dialect = db.get_bind().dialect.name
    if dialect == "postgresql":
        document = func.concat(
            func.coalesce(Task.title, ""),
            " ",
            func.coalesce(Task.description, ""),
        )
        query = query.filter(
            func.to_tsvector("english", document).op("@@")(
                func.plainto_tsquery("english", q)
            )
        )
    else:
        like = f"%{q}%"
        query = query.filter(or_(Task.title.ilike(like), Task.description.ilike(like)))

    total = query.count()
    items = query.order_by(Task.created_at.desc()).offset(offset).limit(limit).all()
    return items, total
