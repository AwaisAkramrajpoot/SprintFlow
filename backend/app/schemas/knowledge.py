from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class KnowledgeDocumentResponse(BaseModel):
    id: str
    original_name: str
    content_type: str | None = None
    size_bytes: int = 0
    status: str
    error_message: str | None = None
    chunk_count: int = 0
    uploaded_by: str | None = None
    uploaded_by_name: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class KnowledgeUploadResponse(BaseModel):
    document: KnowledgeDocumentResponse
    job_id: str
    status: str


class KnowledgeDocumentListResponse(BaseModel):
    items: list[KnowledgeDocumentResponse]
    total: int


class KnowledgeAskRequest(BaseModel):
    question: str = Field(min_length=3, max_length=4000)
    top_k: int = Field(default=5, ge=1, le=12)


class KnowledgeSource(BaseModel):
    document_id: str
    chunk_id: str
    filename: str
    score: float
    excerpt: str
    page: int | None = None
    metadata: dict[str, Any] = {}


class KnowledgeAskResponse(BaseModel):
    answer: str
    sources: list[KnowledgeSource] = []
    used_chunk_count: int = 0
