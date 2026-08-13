from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import bad_request, not_found
from app.models.entities import Board, Project, TaskColumn


def get_company_board(db: Session, company_id: str, board_id: str) -> Board:
    board = (
        db.query(Board)
        .options(joinedload(Board.columns), joinedload(Board.project))
        .filter(Board.id == board_id)
        .first()
    )
    if board is None or board.project is None or board.project.company_id != company_id:
        raise not_found("Board")
    return board


def list_boards(db: Session, company_id: str, project_id: str | None) -> list[Board]:
    query = (
        db.query(Board)
        .options(joinedload(Board.columns), joinedload(Board.project))
        .join(Project, Board.project_id == Project.id)
        .filter(Project.company_id == company_id)
    )
    if project_id:
        query = query.filter(Board.project_id == project_id)
    return query.order_by(Board.order.asc()).all()


def create_board(db: Session, project: Project, name: str, order: int) -> Board:
    board = Board(project_id=project.id, name=name.strip(), order=order)
    db.add(board)
    db.flush()
    for index, column_name in enumerate(["Backlog", "In Progress", "Review", "Done"]):
        db.add(TaskColumn(board_id=board.id, name=column_name, order=index))
    db.commit()
    return get_company_board(db, project.company_id, board.id)


def update_board(db: Session, board: Board, name: str | None, order: int | None) -> Board:
    if name is not None:
        board.name = name.strip()
    if order is not None:
        board.order = order
    db.commit()
    db.refresh(board)
    return board


def delete_board(db: Session, board: Board) -> None:
    db.delete(board)
    db.commit()


def add_column(db: Session, board: Board, name: str, order: int | None) -> TaskColumn:
    next_order = order if order is not None else len(board.columns)
    column = TaskColumn(board_id=board.id, name=name.strip(), order=next_order)
    db.add(column)
    db.commit()
    db.refresh(column)
    return column


def reorder_columns(db: Session, board: Board, column_ids: list[str]) -> Board:
    existing = {column.id: column for column in board.columns}
    if set(column_ids) != set(existing):
        raise bad_request("column_ids must include every column on this board")
    for index, column_id in enumerate(column_ids):
        existing[column_id].order = index
    db.commit()
    return get_company_board(db, board.project.company_id, board.id)
