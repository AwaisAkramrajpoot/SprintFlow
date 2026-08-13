from pydantic import BaseModel, Field


class MessageResponse(BaseModel):
    message: str


class PaginationParams(BaseModel):
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class PaginatedResponse(BaseModel):
    items: list
    total: int
    limit: int
    offset: int
