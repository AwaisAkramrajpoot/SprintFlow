"""RAG knowledge base: local 384-d embeddings (no OpenAI billing)

Revision ID: 0003_local_embeddings
Revises: 0002_rag_knowledge_base
Create Date: 2026-08-14
"""
from alembic import op


revision = "0003_local_embeddings"
down_revision = "0002_rag_knowledge_base"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("DELETE FROM document_chunks")
    op.execute("DROP INDEX IF EXISTS ix_document_chunks_embedding")
    op.execute("ALTER TABLE document_chunks DROP COLUMN IF EXISTS embedding")
    op.execute("ALTER TABLE document_chunks ADD COLUMN embedding vector(384) NOT NULL")
    op.execute(
        """
        CREATE INDEX ix_document_chunks_embedding
        ON document_chunks
        USING hnsw (embedding vector_cosine_ops)
        """
    )
    op.execute(
        """
        UPDATE knowledge_documents
        SET status = 'pending',
            chunk_count = 0,
            error_message = NULL,
            updated_at = now()
        """
    )


def downgrade() -> None:
    op.execute("DELETE FROM document_chunks")
    op.execute("DROP INDEX IF EXISTS ix_document_chunks_embedding")
    op.execute("ALTER TABLE document_chunks DROP COLUMN IF EXISTS embedding")
    op.execute("ALTER TABLE document_chunks ADD COLUMN embedding vector(1536) NOT NULL")
    op.execute(
        """
        CREATE INDEX ix_document_chunks_embedding
        ON document_chunks
        USING hnsw (embedding vector_cosine_ops)
        """
    )
