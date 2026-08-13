from datetime import date, datetime

from pydantic import BaseModel, Field

from app.core.enums import TaskPriority


class BoardCreate(BaseModel):
    project_id: str
    name: str = Field(min_length=1, max_length=255)
    order: int = 0


class BoardUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    order: int | None = None


class TaskColumnCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    order: int | None = None


class TaskColumnReorder(BaseModel):
    column_ids: list[str]


class TaskColumnResponse(BaseModel):
    id: str
    board_id: str
    name: str
    order: int

    model_config = {"from_attributes": True}


class BoardResponse(BaseModel):
    id: str
    project_id: str
    name: str
    order: int
    columns: list[TaskColumnResponse] = []

    model_config = {"from_attributes": True}


class CommentCreate(BaseModel):
    task_id: str
    content: str = Field(min_length=1)


class CommentResponse(BaseModel):
    id: str
    task_id: str
    user_id: str
    author: str | None = None
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AttachmentResponse(BaseModel):
    id: str
    task_id: str
    file_url: str
    name: str
    size: str | None = None
    uploaded_by: str | None = None
    uploaded_at: datetime | None = None

    model_config = {"from_attributes": True}


class TaskCreate(BaseModel):
    project_id: str | None = None
    board_id: str | None = None
    column_id: str | None = None
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    assignee_id: str | None = None
    assignee: str | None = None
    priority: TaskPriority = TaskPriority.MEDIUM
    due_date: date | None = None
    status: str | None = None


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    assignee_id: str | None = None
    assignee: str | None = None
    priority: TaskPriority | None = None
    due_date: date | None = None
    status: str | None = None
    column_id: str | None = None


class TaskMoveRequest(BaseModel):
    column_id: str | None = None
    status: str | None = None


class TaskAssignRequest(BaseModel):
    assignee_id: str | None = None
    assignee: str | None = None


class TaskResponse(BaseModel):
    id: str
    project_id: str | None = None
    board_id: str
    column_id: str | None
    title: str
    description: str | None
    assignee_id: str | None
    assignee: str | None = None
    priority: str
    due_date: date | None
    status: str
    created_by: str | None
    created_at: datetime
    comments: list[CommentResponse] = []
    attachments: list[AttachmentResponse] = []
    checklist: list = []

    model_config = {"from_attributes": True}


class NotificationResponse(BaseModel):
    id: str
    title: str | None = None
    message: str
    unread: bool = True
    time: str | None = None
    type: str = "system"
    created_at: datetime

    model_config = {"from_attributes": True}


class WorkspaceResponse(BaseModel):
    current_user: dict
    company: dict
    members: list[dict]
    projects: list[dict]
    tasks: list[dict]
    notifications: list[dict]
    activities: list[dict] = []
    boards: list[dict] = []
