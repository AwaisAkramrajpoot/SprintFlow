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


extended_settings = ExtendedSettings()
