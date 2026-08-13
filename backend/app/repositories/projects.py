from sqlalchemy.orm import Session, joinedload

from app.models.entities import Board, Project, Task, TaskColumn
from app.repositories.base import BaseRepository


class ProjectRepository(BaseRepository):
    def get(self, project_id: str) -> Project | None:
        return self.db.get(Project, project_id)

    def list_for_company(self, company_id: str, limit: int, offset: int):
        query = (
            self.db.query(Project)
            .filter(Project.company_id == company_id)
            .order_by(Project.created_at.desc())
        )
        total = query.count()
        items = query.offset(offset).limit(limit).all()
        return items, total


class BoardRepository(BaseRepository):
    def get(self, board_id: str) -> Board | None:
        return (
            self.db.query(Board)
            .options(joinedload(Board.columns))
            .filter(Board.id == board_id)
            .first()
        )

    def list_for_project(self, project_id: str) -> list[Board]:
        return (
            self.db.query(Board)
            .options(joinedload(Board.columns))
            .filter(Board.project_id == project_id)
            .order_by(Board.order.asc())
            .all()
        )

    def default_for_project(self, project_id: str) -> Board | None:
        return (
            self.db.query(Board)
            .options(joinedload(Board.columns))
            .filter(Board.project_id == project_id)
            .order_by(Board.order.asc())
            .first()
        )


class TaskRepository(BaseRepository):
    def get(self, task_id: str) -> Task | None:
        return (
            self.db.query(Task)
            .options(
                joinedload(Task.comments),
                joinedload(Task.attachments),
                joinedload(Task.assignee),
                joinedload(Task.column),
                joinedload(Task.board),
            )
            .filter(Task.id == task_id)
            .first()
        )
