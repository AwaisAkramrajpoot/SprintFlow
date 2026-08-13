from sqlalchemy.orm import Session, joinedload

from app.core.dependencies import AuthContext
from app.models.entities import Attachment, Board, Comment, Notification, Project, Task
from app.services.company_service import get_company_payload, list_members
from app.services.serializers import (
    notification_to_dict,
    project_to_dict,
    task_to_dict,
    user_public,
)


def build_workspace(db: Session, ctx: AuthContext) -> dict:
    members = list_members(db, ctx.company.id)
    projects = (
        db.query(Project)
        .options(joinedload(Project.creator), joinedload(Project.boards))
        .filter(Project.company_id == ctx.company.id)
        .order_by(Project.created_at.desc())
        .all()
    )
    tasks = (
        db.query(Task)
        .options(
            joinedload(Task.comments).joinedload(Comment.user),
            joinedload(Task.attachments).joinedload(Attachment.uploader),
            joinedload(Task.assignee),
            joinedload(Task.creator),
            joinedload(Task.board),
        )
        .filter(Task.company_id == ctx.company.id)
        .order_by(Task.created_at.desc())
        .all()
    )
    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == ctx.user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )
    boards = (
        db.query(Board)
        .options(joinedload(Board.columns))
        .join(Project, Board.project_id == Project.id)
        .filter(Project.company_id == ctx.company.id)
        .all()
    )

    tasks_by_project: dict[str, list[Task]] = {}
    for task in tasks:
        project_id = task.board.project_id if task.board else None
        if project_id:
            tasks_by_project.setdefault(project_id, []).append(task)

    return {
        "current_user": user_public(ctx.user, ctx.role),
        "currentUser": user_public(ctx.user, ctx.role),
        "company": get_company_payload(ctx.company, ctx.role),
        "members": members,
        "projects": [
            project_to_dict(
                project,
                tasks_by_project.get(project.id, []),
                len(members),
            )
            for project in projects
        ],
        "tasks": [task_to_dict(task) for task in tasks],
        "notifications": [notification_to_dict(item) for item in notifications],
        "activities": [
            {
                "id": item.id,
                "title": notification_to_dict(item)["title"],
                "detail": item.message,
                "time": notification_to_dict(item)["time"],
            }
            for item in notifications[:8]
        ],
        "boards": [
            {
                "id": board.id,
                "project_id": board.project_id,
                "name": board.name,
                "order": board.order,
                "columns": [
                    {
                        "id": column.id,
                        "board_id": column.board_id,
                        "name": column.name,
                        "order": column.order,
                    }
                    for column in sorted(board.columns, key=lambda item: item.order)
                ],
            }
            for board in boards
        ],
    }
