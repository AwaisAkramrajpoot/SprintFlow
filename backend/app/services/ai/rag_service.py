from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import delete
from sqlalchemy.orm import Session, contains_eager, joinedload

from app.core.enums import KnowledgeDocStatus, MemberRole
from app.core.exceptions import AppException, bad_request, forbidden, not_found, service_unavailable
from app.core.extended_settings import extended_settings
from app.models.entities import DocumentChunk, KnowledgeDocument, User
from app.services.ai.llm_client import embed_query, embed_texts, invoke_text

logger = logging.getLogger("taskflow.rag")

ALLOWED_SUFFIXES = {".pdf", ".docx", ".txt", ".md"}
ALLOWED_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/markdown",
}
RAG_SYSTEM_PROMPT = (
    "You are TaskFlow's company knowledge assistant. Answer using ONLY the "
    "provided document excerpts. If the excerpts do not contain the answer, "
    "say you do not know and do not invent facts. Reply in 1-3 short sentences. "
    "Never paste whole pages or long CV sections. Mention the source filename briefly."
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def document_to_dict(doc: KnowledgeDocument) -> dict:
    return {
        "id": doc.id,
        "original_name": doc.original_name,
        "content_type": doc.content_type,
        "size_bytes": doc.size_bytes,
        "status": doc.status,
        "error_message": doc.error_message,
        "chunk_count": doc.chunk_count,
        "uploaded_by": doc.uploaded_by,
        "uploaded_by_name": doc.uploader.full_name if doc.uploader else None,
        "created_at": doc.created_at,
        "updated_at": doc.updated_at,
    }


def _knowledge_dir() -> Path:
    path = Path(extended_settings.upload_dir) / "knowledge"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _validate_upload(filename: str, content_type: str | None) -> str:
    suffix = Path(filename or "document.bin").suffix.lower()
    ctype = (content_type or "").lower()
    if suffix not in ALLOWED_SUFFIXES and ctype not in ALLOWED_TYPES:
        raise bad_request("Upload a PDF, DOCX, TXT, or Markdown file")
    if suffix not in ALLOWED_SUFFIXES:
        if ctype == "application/pdf":
            suffix = ".pdf"
        elif "wordprocessingml" in ctype:
            suffix = ".docx"
        elif ctype == "text/markdown":
            suffix = ".md"
        else:
            suffix = ".txt"
    return suffix


def create_document(
    db: Session,
    company_id: str,
    actor: User,
    file: UploadFile,
) -> KnowledgeDocument:
    suffix = _validate_upload(file.filename or "", file.content_type)
    data = file.file.read()
    if not data:
        raise bad_request("Empty file")
    if len(data) > extended_settings.max_upload_bytes:
        raise bad_request("File exceeds the upload limit")

    safe_name = Path(file.filename or f"document{suffix}").name
    doc = KnowledgeDocument(
        company_id=company_id,
        original_name=safe_name,
        stored_path="",
        content_type=file.content_type,
        size_bytes=len(data),
        status=KnowledgeDocStatus.PENDING.value,
        uploaded_by=actor.id,
        updated_at=_now(),
    )
    db.add(doc)
    db.flush()

    destination = _knowledge_dir() / f"{doc.id}{suffix}"
    destination.write_bytes(data)
    doc.stored_path = str(destination)
    doc.status = KnowledgeDocStatus.PROCESSING.value
    db.commit()
    return (
        db.query(KnowledgeDocument)
        .options(joinedload(KnowledgeDocument.uploader))
        .filter(KnowledgeDocument.id == doc.id)
        .first()
    )


def mark_processing(db: Session, doc: KnowledgeDocument) -> None:
    doc.status = KnowledgeDocStatus.PROCESSING.value
    doc.error_message = None
    doc.updated_at = _now()
    db.commit()


def run_ingest_job(document_id: str) -> dict:
    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        return ingest_document(db, document_id)
    except Exception:
        logger.exception("Background knowledge ingest failed for %s", document_id)
        return {"document_id": document_id, "status": "failed"}
    finally:
        db.close()


def list_documents(db: Session, company_id: str) -> list[KnowledgeDocument]:
    return (
        db.query(KnowledgeDocument)
        .options(joinedload(KnowledgeDocument.uploader))
        .filter(KnowledgeDocument.company_id == company_id)
        .order_by(KnowledgeDocument.created_at.desc())
        .all()
    )


def get_document(db: Session, company_id: str, document_id: str) -> KnowledgeDocument:
    doc = (
        db.query(KnowledgeDocument)
        .options(joinedload(KnowledgeDocument.uploader))
        .filter(
            KnowledgeDocument.id == document_id,
            KnowledgeDocument.company_id == company_id,
        )
        .first()
    )
    if doc is None:
        raise not_found("Document")
    return doc


def delete_document(
    db: Session, actor: User, role: str, doc: KnowledgeDocument
) -> None:
    is_admin = role in {MemberRole.OWNER.value, MemberRole.ADMIN.value}
    if doc.uploaded_by != actor.id and not is_admin:
        raise forbidden("You can only delete documents you uploaded")

    stored = Path(doc.stored_path) if doc.stored_path else None
    db.delete(doc)
    db.commit()
    if stored and stored.exists():
        stored.unlink()


def _load_pages(path: Path, original_name: str) -> list[dict]:
    suffix = Path(original_name).suffix.lower() or path.suffix.lower()
    try:
        if suffix == ".pdf":
            from langchain_community.document_loaders import PyPDFLoader

            docs = PyPDFLoader(str(path)).load()
        elif suffix == ".docx":
            from langchain_community.document_loaders import Docx2txtLoader

            docs = Docx2txtLoader(str(path)).load()
        else:
            from langchain_community.document_loaders import TextLoader

            docs = TextLoader(str(path), encoding="utf-8").load()
    except ImportError as exc:
        raise service_unavailable(
            "Document loaders are not installed. Run: pip install langchain-community pypdf docx2txt"
        ) from exc
    except Exception as exc:
        raise bad_request(f"Could not read document: {exc}") from exc

    pages = []
    for index, item in enumerate(docs):
        text = (getattr(item, "page_content", "") or "").strip()
        if not text:
            continue
        meta = dict(getattr(item, "metadata", None) or {})
        page = meta.get("page")
        if page is not None:
            try:
                page = int(page) + 1
            except (TypeError, ValueError):
                page = None
        pages.append({"text": text, "page": page, "source_index": index})
    if not pages:
        raise bad_request("The document did not contain extractable text")
    return pages


def _split_pages(pages: list[dict], filename: str) -> list[dict]:
    try:
        from langchain_text_splitters import RecursiveCharacterTextSplitter
    except ImportError as exc:
        raise service_unavailable(
            "langchain-text-splitters is not installed"
        ) from exc

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=extended_settings.rag_chunk_size,
        chunk_overlap=extended_settings.rag_chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks: list[dict] = []
    for page in pages:
        pieces = splitter.split_text(page["text"])
        for piece in pieces:
            text = piece.strip()
            if len(text) < 20:
                continue
            chunks.append(
                {
                    "content": text,
                    "metadata": {
                        "source": filename,
                        "page": page["page"],
                        "source_index": page["source_index"],
                    },
                }
            )
    if not chunks:
        raise bad_request("No usable text chunks were produced")
    return chunks


def ingest_document(db: Session, document_id: str) -> dict:
    doc = (
        db.query(KnowledgeDocument)
        .filter(KnowledgeDocument.id == document_id)
        .first()
    )
    if doc is None:
        raise ValueError("Document not found")

    doc.status = KnowledgeDocStatus.PROCESSING.value
    doc.error_message = None
    doc.updated_at = _now()
    db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == doc.id))
    db.commit()

    try:
        path = Path(doc.stored_path)
        if not path.exists():
            raise bad_request("Uploaded file is missing from disk")

        pages = _load_pages(path, doc.original_name)
        pieces = _split_pages(pages, doc.original_name)
        embeddings = embed_texts([item["content"] for item in pieces])
        if len(embeddings) != len(pieces):
            raise service_unavailable("Embedding count did not match chunk count")

        rows = []
        for index, (piece, vector) in enumerate(zip(pieces, embeddings)):
            rows.append(
                DocumentChunk(
                    document_id=doc.id,
                    company_id=doc.company_id,
                    chunk_index=index,
                    content=piece["content"],
                    embedding=vector,
                    chunk_metadata=piece["metadata"],
                )
            )
        db.add_all(rows)
        doc.chunk_count = len(rows)
        doc.status = KnowledgeDocStatus.READY.value
        doc.error_message = None
        doc.updated_at = _now()
        db.commit()
        logger.info("Ingested %s chunks for document %s", len(rows), doc.id)
        return {"document_id": doc.id, "chunk_count": len(rows), "status": doc.status}
    except Exception as exc:
        db.rollback()
        failed = db.get(KnowledgeDocument, document_id)
        if failed is not None:
            failed.status = KnowledgeDocStatus.FAILED.value
            failed.error_message = str(exc)[:1000]
            failed.updated_at = _now()
            db.commit()
        logger.exception("Knowledge ingest failed for %s", document_id)
        raise


def _similarity_search(
    db: Session,
    company_id: str,
    query_vector: list[float],
    top_k: int,
) -> list[tuple[DocumentChunk, float]]:
    distance = DocumentChunk.embedding.cosine_distance(query_vector)
    rows = (
        db.query(DocumentChunk, distance.label("distance"))
        .join(KnowledgeDocument, KnowledgeDocument.id == DocumentChunk.document_id)
        .options(contains_eager(DocumentChunk.document))
        .filter(
            DocumentChunk.company_id == company_id,
            KnowledgeDocument.status == KnowledgeDocStatus.READY.value,
        )
        .order_by(distance)
        .limit(top_k)
        .all()
    )
    return [(chunk, float(dist)) for chunk, dist in rows]


_STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "does",
    "for",
    "from",
    "has",
    "have",
    "how",
    "in",
    "is",
    "it",
    "much",
    "of",
    "on",
    "or",
    "our",
    "the",
    "their",
    "to",
    "total",
    "what",
    "when",
    "where",
    "which",
    "who",
    "with",
}


def _question_terms(question: str) -> set[str]:
    return {
        token
        for token in re.findall(r"[a-z0-9]+", (question or "").lower())
        if len(token) > 2 and token not in _STOPWORDS
    }


def _lexical_score(text: str, terms: set[str]) -> float:
    if not terms:
        return 0.0
    words = set(re.findall(r"[a-z0-9]+", (text or "").lower()))
    hits = sum(1 for term in terms if term in words or any(term in word for word in words))
    return hits / max(len(terms), 1)


def _split_sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+|\n+", text or "")
    return [part.strip(" -•\t") for part in parts if len(part.strip(" -•\t")) > 25]


def ask(
    db: Session,
    company_id: str,
    question: str,
    top_k: int | None = None,
) -> dict:
    k = top_k or extended_settings.rag_top_k
    ready_count = (
        db.query(KnowledgeDocument)
        .filter(
            KnowledgeDocument.company_id == company_id,
            KnowledgeDocument.status == KnowledgeDocStatus.READY.value,
        )
        .count()
    )
    if ready_count == 0:
        return {
            "answer": (
                "The knowledge base is empty. Upload a PDF or DOCX on the "
                "Knowledge Base page, wait until it is ready, then ask again."
            ),
            "sources": [],
            "used_chunk_count": 0,
        }

    query_vector = embed_query(question)
    # Fetch extra candidates, then rerank with keyword overlap so short
    # factual questions land on the right sentence instead of dumping pages.
    matches = _similarity_search(db, company_id, query_vector, max(k * 3, 8))
    if not matches:
        return {
            "answer": "No relevant passages were found in the company knowledge base.",
            "sources": [],
            "used_chunk_count": 0,
        }

    terms = _question_terms(question)
    ranked: list[tuple[DocumentChunk, float, float]] = []
    for chunk, distance in matches:
        vector_score = max(0.0, 1.0 - float(distance))
        lexical = _lexical_score(chunk.content, terms)
        combined = (0.35 * vector_score) + (0.65 * lexical)
        ranked.append((chunk, vector_score, combined))
    ranked.sort(key=lambda item: item[2], reverse=True)
    top = ranked[: min(k, 3)]

    passages = [chunk.content.strip() for chunk, _, _ in top]
    context_blocks = []
    sources = []
    for index, (chunk, vector_score, combined) in enumerate(top, start=1):
        filename = chunk.document.original_name if chunk.document else "document"
        page = (chunk.chunk_metadata or {}).get("page")
        page_label = f", page {page}" if page else ""
        excerpt = chunk.content.strip()
        context_blocks.append(f"[{index}] {filename}{page_label}\n{excerpt}")
        sources.append(
            {
                "document_id": chunk.document_id,
                "chunk_id": chunk.id,
                "filename": filename,
                "score": round(combined, 4),
                "excerpt": excerpt[:220],
                "page": page,
                "metadata": chunk.chunk_metadata or {},
            }
        )

    answer = _answer_from_context(question, passages, context_blocks)
    return {
        "answer": answer,
        "sources": sources,
        "used_chunk_count": len(sources),
    }


def _answer_from_context(
    question: str,
    passages: list[str],
    context_blocks: list[str],
) -> str:
    if not extended_settings.rag_use_llm:
        return _extractive_answer(question, passages)
    user_prompt = (
        "Document excerpts:\n\n"
        + "\n\n".join(context_blocks)
        + f"\n\nQuestion: {question}\n\n"
        "Write a short direct answer in 1-3 sentences. Do not paste whole pages."
    )
    try:
        return invoke_text(RAG_SYSTEM_PROMPT, user_prompt, temperature=0.1)
    except AppException as exc:
        logger.warning("LLM answer unavailable (%s); using extracted passages", exc.detail)
        return _extractive_answer(question, passages)


def _experience_answer(passages: list[str]) -> str | None:
    """Pull a direct experience line from CV-style text when asked."""
    joined = "\n".join(passages)
    patterns = [
        r"(?:with|has|have)\s+(\d+(?:\.\d+)?\+?)\s*(?:year|years|yr|yrs)\s+of\s+(?:professional\s+)?experience[^.]*\.?",
        r"(\d+(?:\.\d+)?\+?)\s*(?:year|years|yr|yrs)\s+of\s+(?:professional\s+)?experience[^.]*\.?",
        r"professional experience[^.]*?(\d+(?:\.\d+)?\+?)\s*(?:year|years)[^.]*\.?",
    ]
    for pattern in patterns:
        match = re.search(pattern, joined, flags=re.IGNORECASE)
        if not match:
            continue
        years = match.group(1)
        label = "year" if years == "1" else "years"
        return (
            f"Based on the uploaded document: {years} {label} of professional experience."
        )
    return None


def _extractive_answer(question: str, passages: list[str]) -> str:
    lower_q = question.lower()
    if any(word in lower_q for word in ("experience", "exp", "year", "years")):
        experience = _experience_answer(passages)
        if experience:
            return experience

    terms = _question_terms(question)
    scored: list[tuple[float, str]] = []
    for passage in passages:
        for sentence in _split_sentences(passage):
            score = _lexical_score(sentence, terms)
            lower_s = sentence.lower()
            if any(word in lower_q for word in ("experience", "year", "years", "exp")):
                if any(token in lower_s for token in ("year", "years", "experience", "intern")):
                    score += 0.35
            if re.search(r"\b\d+(\.\d+)?\+?\s*(year|years|yr|yrs)\b", lower_s):
                score += 0.4
            scored.append((score, sentence))

    scored.sort(key=lambda item: item[0], reverse=True)
    best = [sentence for score, sentence in scored if score > 0][:2]
    if not best and passages:
        # Fallback: first short slice of the best passage, not the whole page.
        best = [passages[0][:220].rsplit(" ", 1)[0] + "…"]

    if not best:
        return "I could not find a clear answer in the uploaded documents."

    return " ".join(best)[:420]
