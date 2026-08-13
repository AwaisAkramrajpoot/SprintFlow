from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import ANY_MEMBER, MANAGER_PLUS, AuthContext
from app.db.session import get_db
from app.schemas.common import MessageResponse
from app.schemas.taskflow import (
    TaskAssignRequest,
    TaskCreate,
    TaskMoveRequest,
    TaskResponse,
    TaskUpdate,
)
from app.services import task_service
from app.services.broadcast_service import (
    broadcast_task_created,
    broadcast_task_deleted,
    broadcast_task_moved,
    broadcast_task_updated,
)
from app.services.serializers import task_to_dict

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _task(task) -> TaskResponse:
    return TaskResponse(**task_to_dict(task))


@router.get("")
def list_tasks(
    project_id: str | None = Query(default=None),
    board_id: str | None = Query(default=None),
    status: str | None = Query(default=None),
    priority: str | None = Query(default=None),
    assignee_id: str | None = Query(default=None),
    q: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    ctx: AuthContext = Depends(ANY_MEMBER),
    db: Session = Depends(get_db),
):
    items, total = task_service.list_tasks(
        db,
        ctx.company.id,
        project_id=project_id,
        board_id=board_id,
        status=status,
        priority=priority,
        assignee_id=assignee_id,
        q=q,
        limit=limit,
        offset=offset,
    )
    return {
        "items": [task_to_dict(item) for item in items],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.post("", response_model=TaskResponse)
def create_task(
    payload: TaskCreate,
    background: BackgroundTasks,
    ctx: AuthContext = Depends(ANY_MEMBER),
    db: Session = Depends(get_db),
):
    task = task_service.create_task(
        db,
        ctx.company.id,
        ctx.user,
        title=payload.title,
        description=payload.description,
        project_id=payload.project_id,
        board_id=payload.board_id,
        column_id=payload.column_id,
        status=payload.status,
        priority=payload.priority,
        due_date=payload.due_date,
        assignee_id=payload.assignee_id,
        assignee=payload.assignee,
    )
    background.add_task(broadcast_task_created, task)
    return _task(task)


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: str,
    ctx: AuthContext = Depends(ANY_MEMBER),
    db: Session = Depends(get_db),
):
    return _task(task_service.get_company_task(db, ctx.company.id, task_id))


@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: str,
    payload: TaskUpdate,
    background: BackgroundTasks,
    ctx: AuthContext = Depends(ANY_MEMBER),
    db: Session = Depends(get_db),
):
    task = task_service.get_company_task(db, ctx.company.id, task_id)
    data = payload.model_dump(exclude_unset=True)
    if "assignee_id" in data or "assignee" in data:
        from app.core.dependencies import ROLE_RANK
        from app.core.enums import MemberRole
        from app.core.exceptions import forbidden

        if ROLE_RANK.get(ctx.role, 0) < ROLE_RANK[MemberRole.MANAGER.value]:
            raise forbidden("Assigning tasks requires Manager or above")
    updated = task_service.update_task(db, ctx.company.id, ctx.user, task, data)
    background.add_task(broadcast_task_updated, updated)
    return _task(updated)


@router.post("/{task_id}/move", response_model=TaskResponse)
def move_task(
    task_id: str,
    payload: TaskMoveRequest,
    background: BackgroundTasks,
    ctx: AuthContext = Depends(ANY_MEMBER),
    db: Session = Depends(get_db),
):
    task = task_service.get_company_task(db, ctx.company.id, task_id)
    moved = task_service.move_task(
        db, ctx.company.id, task, column_id=payload.column_id, status=payload.status
    )
    background.add_task(broadcast_task_moved, moved)
    return _task(moved)


@router.post("/{task_id}/assign", response_model=TaskResponse)
def assign_task(
    task_id: str,
    payload: TaskAssignRequest,
    background: BackgroundTasks,
    ctx: AuthContext = Depends(MANAGER_PLUS),
    db: Session = Depends(get_db),
):
    task = task_service.get_company_task(db, ctx.company.id, task_id)
    assigned = task_service.assign_task(
        db, ctx.company.id, ctx.user, task, payload.assignee_id, payload.assignee
    )
    background.add_task(broadcast_task_updated, assigned)
    return _task(assigned)


@router.delete("/{task_id}", response_model=MessageResponse)
def delete_task(
    task_id: str,
    background: BackgroundTasks,
    ctx: AuthContext = Depends(ANY_MEMBER),
    db: Session = Depends(get_db),
):
    task = task_service.get_company_task(db, ctx.company.id, task_id)
    project_id = task.board.project_id if task.board else None
    task_service.delete_task(db, task)
    if project_id:
        background.add_task(broadcast_task_deleted, ctx.company.id, project_id, task_id)
    return MessageResponse(message="Task deleted")
