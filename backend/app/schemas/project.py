from datetime import datetime

from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None


class ProjectResponse(BaseModel):
    id: str
    company_id: str
    name: str
    description: str | None
    created_by: str | None
    created_at: datetime
    lead: str | None = None
    progress: int = 0
    status: str = "On Track"
    members: int = 0
    due_date: datetime | None = None

    model_config = {"from_attributes": True}
