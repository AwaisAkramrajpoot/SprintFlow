from fastapi import BackgroundTasks
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import not_found
from app.models.entities import Board, Project, Task, TaskColumn, User
from app.services.email_service import project_created_email, send_email

DEFAULT_COLUMNS = ["Backlog", "In Progress", "Review", "Done"]


def create_default_board(db: Session, project: Project) -> Board:
    board = Board(project_id=project.id, name="Main Board", order=0)
    db.add(board)
    db.flush()
    for index, name in enumerate(DEFAULT_COLUMNS):
        db.add(TaskColumn(board_id=board.id, name=name, order=index))
    return board


def create_project(
    db: Session,
    company_id: str,
    user: User,
    name: str,
    description: str | None,
    background: BackgroundTasks | None = None,
    company_name: str | None = None,
) -> Project:
    project = Project(
        company_id=company_id,
        name=name.strip(),
        description=description,
        created_by=user.id,
    )
    db.add(project)
    db.flush()
    create_default_board(db, project)
    db.commit()
    db.refresh(project)
    if background:
        subject, html = project_created_email(
            user.full_name, project.name, company_name or "your workspace"
        )
        background.add_task(send_email, user.email, subject, html)
    return (
        db.query(Project)
        .options(joinedload(Project.creator), joinedload(Project.boards))
        .filter(Project.id == project.id)
        .first()
    )


def get_company_project(db: Session, company_id: str, project_id: str) -> Project:
    project = (
        db.query(Project)
        .options(joinedload(Project.creator), joinedload(Project.boards))
        .filter(Project.id == project_id, Project.company_id == company_id)
        .first()
    )
    if project is None:
        raise not_found("Project")
    return project


def list_projects(db: Session, company_id: str, limit: int, offset: int):
    query = (
        db.query(Project)
        .options(joinedload(Project.creator))
        .filter(Project.company_id == company_id)
        .order_by(Project.created_at.desc())
    )
    total = query.count()
    return query.offset(offset).limit(limit).all(), total


def update_project(db: Session, project: Project, name: str | None, description: str | None):
    if name is not None:
        project.name = name.strip()
    if description is not None:
        project.description = description
    db.commit()
    db.refresh(project)
    return project


def delete_project(db: Session, project: Project) -> None:
    db.delete(project)
    db.commit()


def project_tasks(db: Session, project_id: str) -> list[Task]:
    return (
        db.query(Task)
        .join(Board, Task.board_id == Board.id)
        .filter(Board.project_id == project_id)
        .all()
    )
