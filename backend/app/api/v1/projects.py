from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import ADMIN_PLUS, ANY_MEMBER, AuthContext
from app.db.session import get_db
from app.schemas.common import MessageResponse, PaginatedResponse
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate
from app.services import project_service
from app.services.company_service import list_members
from app.services.serializers import project_to_dict

router = APIRouter(prefix="/projects", tags=["projects"])


def _to_response(db: Session, ctx: AuthContext, project) -> ProjectResponse:
    tasks = project_service.project_tasks(db, project.id)
    members = list_members(db, ctx.company.id)
    return ProjectResponse(**project_to_dict(project, tasks, len(members)))


@router.get("", response_model=PaginatedResponse)
def list_projects(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    ctx: AuthContext = Depends(ANY_MEMBER),
    db: Session = Depends(get_db),
):
    items, total = project_service.list_projects(db, ctx.company.id, limit, offset)
    members = list_members(db, ctx.company.id)
    return {
        "items": [
            project_to_dict(project, project_service.project_tasks(db, project.id), len(members))
            for project in items
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.post("", response_model=ProjectResponse)
def create_project(
    payload: ProjectCreate,
    background: BackgroundTasks,
    ctx: AuthContext = Depends(ADMIN_PLUS),
    db: Session = Depends(get_db),
):
    project = project_service.create_project(
        db,
        ctx.company.id,
        ctx.user,
        payload.name,
        payload.description,
        background=background,
        company_name=ctx.company.name,
    )
    return _to_response(db, ctx, project)


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: str,
    ctx: AuthContext = Depends(ANY_MEMBER),
    db: Session = Depends(get_db),
):
    project = project_service.get_company_project(db, ctx.company.id, project_id)
    return _to_response(db, ctx, project)


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: str,
    payload: ProjectUpdate,
    ctx: AuthContext = Depends(ADMIN_PLUS),
    db: Session = Depends(get_db),
):
    project = project_service.get_company_project(db, ctx.company.id, project_id)
    project = project_service.update_project(db, project, payload.name, payload.description)
    return _to_response(db, ctx, project)


@router.delete("/{project_id}", response_model=MessageResponse)
def delete_project(
    project_id: str,
    ctx: AuthContext = Depends(ADMIN_PLUS),
    db: Session = Depends(get_db),
):
    project = project_service.get_company_project(db, ctx.company.id, project_id)
    project_service.delete_project(db, project)
    return MessageResponse(message="Project deleted")
