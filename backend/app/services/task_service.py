from datetime import date

from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.core.enums import TaskPriority
from app.core.exceptions import bad_request, not_found
from app.models.entities import Attachment, Board, Comment, Notification, Task, TaskColumn, User
from app.services.project_service import get_company_project


def _notify(db: Session, user_id: str | None, message: str) -> None:
    if not user_id:
        return
    db.add(Notification(user_id=user_id, message=message, is_read=False))


def get_company_task(db: Session, company_id: str, task_id: str) -> Task:
    task = (
        db.query(Task)
        .options(
            joinedload(Task.comments).joinedload(Comment.user),
            joinedload(Task.attachments).joinedload(Attachment.uploader),
            joinedload(Task.assignee),
            joinedload(Task.creator),
            joinedload(Task.board),
            joinedload(Task.column),
        )
        .filter(Task.id == task_id, Task.company_id == company_id)
        .first()
    )
    if task is None:
        raise not_found("Task")
    return task


def list_tasks(
    db: Session,
    company_id: str,
    *,
    project_id: str | None = None,
    board_id: str | None = None,
    status: str | None = None,
    priority: str | None = None,
    assignee_id: str | None = None,
    q: str | None = None,
    limit: int = 50,
    offset: int = 0,
):
    query = (
        db.query(Task)
        .options(
            joinedload(Task.comments).joinedload(Comment.user),
            joinedload(Task.attachments).joinedload(Attachment.uploader),
            joinedload(Task.assignee),
            joinedload(Task.creator),
            joinedload(Task.board),
            joinedload(Task.column),
        )
        .filter(Task.company_id == company_id)
    )
    if board_id:
        query = query.filter(Task.board_id == board_id)
    if project_id:
        query = query.join(Board, Task.board_id == Board.id).filter(
            Board.project_id == project_id
        )
    if status and status != "All":
        query = query.filter(Task.status == status)
    if priority and priority != "All":
        query = query.filter(Task.priority == priority)
    if assignee_id and assignee_id != "All":
        query = query.filter(Task.assignee_id == assignee_id)
    if q:
        like = f"%{q}%"
        query = query.filter(or_(Task.title.ilike(like), Task.description.ilike(like)))

    count_query = db.query(func.count(Task.id)).filter(Task.company_id == company_id)
    if board_id:
        count_query = count_query.filter(Task.board_id == board_id)
    if project_id:
        count_query = count_query.join(Board, Task.board_id == Board.id).filter(
            Board.project_id == project_id
        )
    if status and status != "All":
        count_query = count_query.filter(Task.status == status)
    if priority and priority != "All":
        count_query = count_query.filter(Task.priority == priority)
    if assignee_id and assignee_id != "All":
        count_query = count_query.filter(Task.assignee_id == assignee_id)
    if q:
        like = f"%{q}%"
        count_query = count_query.filter(
            or_(Task.title.ilike(like), Task.description.ilike(like))
        )

    total = count_query.scalar() or 0
    items = query.order_by(Task.created_at.desc()).offset(offset).limit(limit).all()
    return items, total


def _resolve_assignee(db: Session, company_id: str, assignee_id: str | None, assignee: str | None):
    if assignee_id:
        user = db.get(User, assignee_id)
        return user.id if user else None
    if assignee:
        user = (
            db.query(User)
            .filter(User.company_id == company_id, User.full_name == assignee)
            .first()
        )
        return user.id if user else None
    return None


def _resolve_board_and_column(
    db: Session,
    company_id: str,
    *,
    project_id: str | None,
    board_id: str | None,
    column_id: str | None,
    status: str | None,
) -> tuple[Board, TaskColumn]:
    board = None
    if board_id:
        board = (
            db.query(Board)
            .options(joinedload(Board.columns), joinedload(Board.project))
            .filter(Board.id == board_id)
            .first()
        )
    elif project_id:
        project = get_company_project(db, company_id, project_id)
        board = (
            db.query(Board)
            .options(joinedload(Board.columns))
            .filter(Board.project_id == project.id)
            .order_by(Board.order.asc())
            .first()
        )
    if board is None:
        raise bad_request("A valid project_id or board_id is required")
    if board.project.company_id != company_id:
        raise not_found("Board")

    columns = board.columns or []
    column = None
    if column_id:
        column = next((item for item in columns if item.id == column_id), None)
    if column is None and status:
        column = next((item for item in columns if item.name == status), None)
    if column is None and columns:
        column = sorted(columns, key=lambda item: item.order)[0]
    if column is None:
        raise bad_request("Board has no columns")
    return board, column


def create_task(
    db: Session,
    company_id: str,
    actor: User,
    *,
    title: str,
    description: str | None,
    project_id: str | None,
    board_id: str | None,
    column_id: str | None,
    status: str | None,
    priority: TaskPriority | str,
    due_date: date | None,
    assignee_id: str | None,
    assignee: str | None,
) -> Task:
    board, column = _resolve_board_and_column(
        db,
        company_id,
        project_id=project_id,
        board_id=board_id,
        column_id=column_id,
        status=status,
    )
    resolved_assignee = _resolve_assignee(db, company_id, assignee_id, assignee)
    priority_value = priority.value if isinstance(priority, TaskPriority) else priority
    task = Task(
        company_id=company_id,
        board_id=board.id,
        column_id=column.id,
        title=title.strip(),
        description=description,
        assignee_id=resolved_assignee,
        priority=priority_value,
        due_date=due_date,
        status=column.name,
        created_by=actor.id,
    )
    db.add(task)
    if resolved_assignee and resolved_assignee != actor.id:
        _notify(db, resolved_assignee, f"{actor.full_name} assigned '{task.title}' to you.")
    db.commit()
    return get_company_task(db, company_id, task.id)


def update_task(db: Session, company_id: str, actor: User, task: Task, payload: dict) -> Task:
    if "title" in payload and payload["title"] is not None:
        task.title = payload["title"].strip()
    if "description" in payload:
        task.description = payload["description"]
    if "priority" in payload and payload["priority"] is not None:
        value = payload["priority"]
        task.priority = value.value if hasattr(value, "value") else value
    if "due_date" in payload:
        task.due_date = payload["due_date"]

    new_assignee = _resolve_assignee(
        db, company_id, payload.get("assignee_id"), payload.get("assignee")
    )
    if "assignee_id" in payload or "assignee" in payload:
        if new_assignee != task.assignee_id:
            task.assignee_id = new_assignee
            if new_assignee and new_assignee != actor.id:
                _notify(
                    db,
                    new_assignee,
                    f"{actor.full_name} assigned '{task.title}' to you.",
                )

    if payload.get("column_id") or payload.get("status"):
        move_task(
            db,
            company_id,
            task,
            column_id=payload.get("column_id"),
            status=payload.get("status"),
            commit=False,
        )

    db.commit()
    return get_company_task(db, company_id, task.id)


def move_task(
    db: Session,
    company_id: str,
    task: Task,
    *,
    column_id: str | None,
    status: str | None,
    commit: bool = True,
) -> Task:
    board = (
        db.query(Board)
        .options(joinedload(Board.columns))
        .filter(Board.id == task.board_id)
        .first()
    )
    if board is None:
        raise not_found("Board")
    column = None
    if column_id:
        column = next((item for item in board.columns if item.id == column_id), None)
    if column is None and status:
        column = next((item for item in board.columns if item.name == status), None)
    if column is None:
        raise bad_request("Unknown board column")
    task.column_id = column.id
    task.status = column.name
    if commit:
        db.commit()
        return get_company_task(db, company_id, task.id)
    return task


def assign_task(
    db: Session, company_id: str, actor: User, task: Task, assignee_id: str | None, assignee: str | None
) -> Task:
    resolved = _resolve_assignee(db, company_id, assignee_id, assignee)
    task.assignee_id = resolved
    if resolved and resolved != actor.id:
        _notify(db, resolved, f"{actor.full_name} assigned '{task.title}' to you.")
    db.commit()
    return get_company_task(db, company_id, task.id)


def delete_task(db: Session, task: Task) -> None:
    db.delete(task)
    db.commit()
