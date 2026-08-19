"""Runtime settings that extend Step 1 config without replacing it."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


BACKEND_ROOT = Path(__file__).resolve().parents[2]


@dataclass(slots=True)
class ExtendedSettings:
    algorithm: str = "HS256"
    access_token_expire_minutes: int = field(
        default_factory=lambda: int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
    )
    refresh_token_expire_days: int = field(
        default_factory=lambda: int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    )
    frontend_url: str = field(
        default_factory=lambda: os.getenv("FRONTEND_URL", "http://localhost:5173")
    )
    upload_dir: str = field(
        default_factory=lambda: os.getenv(
            "UPLOAD_DIR",
            str(BACKEND_ROOT / "uploads"),
        )
    )
    max_upload_bytes: int = field(
        default_factory=lambda: int(os.getenv("MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))
    )
    smtp_host: str = field(default_factory=lambda: os.getenv("SMTP_HOST", ""))
    smtp_port: int = field(
        default_factory=lambda: int(os.getenv("SMTP_PORT", "587"))
    )
    smtp_user: str = field(default_factory=lambda: os.getenv("SMTP_USER", ""))
    smtp_password: str = field(
        default_factory=lambda: os.getenv("SMTP_PASSWORD")
        or os.getenv("SMTP_PASS", "")
    )
    smtp_from_name: str = field(
        default_factory=lambda: os.getenv("SMTP_FROM_NAME", "TaskFlow AI")
    )
    smtp_from_email: str = field(
        default_factory=lambda: os.getenv("SMTP_FROM_EMAIL")
        or os.getenv("SMTP_FROM", "")
    )
    smtp_use_tls: bool = field(
        default_factory=lambda: os.getenv("SMTP_USE_TLS", "true").lower()
        in {"1", "true", "yes"}
    )
    smtp_use_ssl: bool = field(
        default_factory=lambda: os.getenv("SMTP_USE_SSL", "false").lower()
        in {"1", "true", "yes"}
    )
    openai_api_key: str = field(
        default_factory=lambda: os.getenv("OPENAI_API_KEY", "")
    )
    openai_model: str = field(
        default_factory=lambda: os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    )
    openai_whisper_model: str = field(
        default_factory=lambda: os.getenv("OPENAI_WHISPER_MODEL", "whisper-1")
    )
    openai_embedding_model: str = field(
        default_factory=lambda: os.getenv(
            "OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"
        )
    )
    embedding_provider: str = field(
        default_factory=lambda: os.getenv("EMBEDDING_PROVIDER", "local").strip().lower()
    )
    rag_use_llm: bool = field(
        default_factory=lambda: os.getenv("RAG_USE_LLM", "false").lower()
        in {"1", "true", "yes"}
    )
    rag_chunk_size: int = field(
        default_factory=lambda: int(os.getenv("RAG_CHUNK_SIZE", "2000"))
    )
    rag_chunk_overlap: int = field(
        default_factory=lambda: int(os.getenv("RAG_CHUNK_OVERLAP", "200"))
    )
    rag_top_k: int = field(
        default_factory=lambda: int(os.getenv("RAG_TOP_K", "5"))
    )


extended_settings = ExtendedSettings()
