from fastapi import APIRouter, BackgroundTasks, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.core.dependencies import ANY_MEMBER, AuthContext
from app.core.enums import KnowledgeDocStatus
from app.core.exceptions import bad_request
from app.db.session import get_db
from app.schemas.common import MessageResponse
from app.schemas.knowledge import (
    KnowledgeAskRequest,
    KnowledgeAskResponse,
    KnowledgeDocumentListResponse,
    KnowledgeDocumentResponse,
    KnowledgeUploadResponse,
)
from app.services.ai import rag_service
from app.workers.dispatch import get_job_status

router = APIRouter(prefix="/knowledge-base", tags=["knowledge-base"])


@router.post("/upload", response_model=KnowledgeUploadResponse)
def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    ctx: AuthContext = Depends(ANY_MEMBER),
    db: Session = Depends(get_db),
):
    doc = rag_service.create_document(db, ctx.company.id, ctx.user, file)
    background_tasks.add_task(rag_service.run_ingest_job, doc.id)
    refreshed = rag_service.get_document(db, ctx.company.id, doc.id)
    return KnowledgeUploadResponse(
        document=KnowledgeDocumentResponse(**rag_service.document_to_dict(refreshed)),
        job_id=f"bg-{doc.id[:8]}",
        status=refreshed.status,
    )


@router.get("/documents", response_model=KnowledgeDocumentListResponse)
def list_documents(
    ctx: AuthContext = Depends(ANY_MEMBER),
    db: Session = Depends(get_db),
):
    items = rag_service.list_documents(db, ctx.company.id)
    return KnowledgeDocumentListResponse(
        items=[
            KnowledgeDocumentResponse(**rag_service.document_to_dict(item))
            for item in items
        ],
        total=len(items),
    )


@router.get("/documents/{document_id}", response_model=KnowledgeDocumentResponse)
def get_document(
    document_id: str,
    ctx: AuthContext = Depends(ANY_MEMBER),
    db: Session = Depends(get_db),
):
    doc = rag_service.get_document(db, ctx.company.id, document_id)
    return KnowledgeDocumentResponse(**rag_service.document_to_dict(doc))


@router.delete("/documents/{document_id}", response_model=MessageResponse)
def delete_document(
    document_id: str,
    ctx: AuthContext = Depends(ANY_MEMBER),
    db: Session = Depends(get_db),
):
    doc = rag_service.get_document(db, ctx.company.id, document_id)
    rag_service.delete_document(db, ctx.user, ctx.role, doc)
    return MessageResponse(message="Document deleted")


@router.post("/documents/{document_id}/reprocess", response_model=KnowledgeDocumentResponse)
def reprocess_document(
    document_id: str,
    background_tasks: BackgroundTasks,
    ctx: AuthContext = Depends(ANY_MEMBER),
    db: Session = Depends(get_db),
):
    doc = rag_service.get_document(db, ctx.company.id, document_id)
    if doc.status == KnowledgeDocStatus.READY.value and doc.chunk_count > 0:
        raise bad_request("Document is already ready. Delete it first to ingest again.")
    rag_service.mark_processing(db, doc)
    background_tasks.add_task(rag_service.run_ingest_job, doc.id)
    refreshed = rag_service.get_document(db, ctx.company.id, doc.id)
    return KnowledgeDocumentResponse(**rag_service.document_to_dict(refreshed))


@router.get("/jobs/{job_id}")
def get_ingest_job(
    job_id: str,
    ctx: AuthContext = Depends(ANY_MEMBER),
):
    payload = get_job_status(job_id)
    return {"job_id": job_id, **payload}


@router.post("/ask", response_model=KnowledgeAskResponse)
def ask_knowledge_base(
    payload: KnowledgeAskRequest,
    ctx: AuthContext = Depends(ANY_MEMBER),
    db: Session = Depends(get_db),
):
    question = payload.question.strip()
    if not question:
        raise bad_request("Question is required")
    result = rag_service.ask(db, ctx.company.id, question, payload.top_k)
    return KnowledgeAskResponse(**result)
