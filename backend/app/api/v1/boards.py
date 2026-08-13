from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import ADMIN_PLUS, ANY_MEMBER, AuthContext
from app.db.session import get_db
from app.schemas.common import MessageResponse
from app.schemas.taskflow import (
    BoardCreate,
    BoardResponse,
    BoardUpdate,
    TaskColumnCreate,
    TaskColumnReorder,
    TaskColumnResponse,
)
from app.services import board_service, project_service

router = APIRouter(prefix="/boards", tags=["boards"])


@router.get("", response_model=list[BoardResponse])
def list_boards(
    project_id: str | None = Query(default=None),
    ctx: AuthContext = Depends(ANY_MEMBER),
    db: Session = Depends(get_db),
):
    boards = board_service.list_boards(db, ctx.company.id, project_id)
    return boards


@router.post("", response_model=BoardResponse)
def create_board(
    payload: BoardCreate,
    ctx: AuthContext = Depends(ADMIN_PLUS),
    db: Session = Depends(get_db),
):
    project = project_service.get_company_project(db, ctx.company.id, payload.project_id)
    return board_service.create_board(db, project, payload.name, payload.order)


@router.get("/{board_id}", response_model=BoardResponse)
def get_board(
    board_id: str,
    ctx: AuthContext = Depends(ANY_MEMBER),
    db: Session = Depends(get_db),
):
    return board_service.get_company_board(db, ctx.company.id, board_id)


@router.patch("/{board_id}", response_model=BoardResponse)
def update_board(
    board_id: str,
    payload: BoardUpdate,
    ctx: AuthContext = Depends(ADMIN_PLUS),
    db: Session = Depends(get_db),
):
    board = board_service.get_company_board(db, ctx.company.id, board_id)
    return board_service.update_board(db, board, payload.name, payload.order)


@router.delete("/{board_id}", response_model=MessageResponse)
def delete_board(
    board_id: str,
    ctx: AuthContext = Depends(ADMIN_PLUS),
    db: Session = Depends(get_db),
):
    board = board_service.get_company_board(db, ctx.company.id, board_id)
    board_service.delete_board(db, board)
    return MessageResponse(message="Board deleted")


@router.post("/{board_id}/columns", response_model=TaskColumnResponse)
def add_column(
    board_id: str,
    payload: TaskColumnCreate,
    ctx: AuthContext = Depends(ADMIN_PLUS),
    db: Session = Depends(get_db),
):
    board = board_service.get_company_board(db, ctx.company.id, board_id)
    return board_service.add_column(db, board, payload.name, payload.order)


@router.patch("/{board_id}/columns/reorder", response_model=BoardResponse)
def reorder_columns(
    board_id: str,
    payload: TaskColumnReorder,
    ctx: AuthContext = Depends(ADMIN_PLUS),
    db: Session = Depends(get_db),
):
    board = board_service.get_company_board(db, ctx.company.id, board_id)
    return board_service.reorder_columns(db, board, payload.column_ids)
