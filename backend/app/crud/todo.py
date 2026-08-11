from sqlalchemy.orm import Session

from app.models.todo import Todo
from app.schemas.todo import TodoCreate


def create_todo(db: Session, todo: TodoCreate):
    new_todo = Todo(
        name=todo.name,
        description=todo.description
    )

    db.add(new_todo)
    db.commit()
    db.refresh(new_todo)

    return new_todo


def get_todos(db: Session):
    return db.query(Todo).all()


def get_todo(db: Session, todo_id: int):
    return db.query(Todo).filter(Todo.id == todo_id).first()


def update_todo(
    db: Session,
    todo_id: int,
    todo: TodoCreate
):
    existing_todo = get_todo(db, todo_id)

    if not existing_todo:
        return None

    existing_todo.name = todo.name
    existing_todo.description = todo.description

    db.commit()
    db.refresh(existing_todo)

    return existing_todo


def delete_todo(db: Session, todo_id: int):
    existing_todo = get_todo(db, todo_id)

    if not existing_todo:
        return None

    db.delete(existing_todo)
    db.commit()

    return existing_todo