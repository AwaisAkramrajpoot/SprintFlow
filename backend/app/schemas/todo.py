from pydantic import BaseModel


class TodoCreate(BaseModel):
    name: str
    description: str | None = None


class TodoResponse(BaseModel):
    id: int
    name: str
    description: str | None = None

    class Config:
        from_attributes = True