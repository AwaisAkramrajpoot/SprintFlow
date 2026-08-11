import os
from dataclasses import dataclass, field


@dataclass(slots=True)
class Settings:
    app_name: str = "TaskFlow AI"
    api_v1_prefix: str = "/api/v1"
    database_url: str = field(
        default_factory=lambda: os.getenv(
            "DATABASE_URL",
            "sqlite:///./taskflow.db",
        )
    )
    secret_key: str = field(
        default_factory=lambda: os.getenv("SECRET_KEY", "change-me")
    )
    redis_url: str = field(
        default_factory=lambda: os.getenv(
            "REDIS_URL",
            "redis://localhost:6379/0",
        )
    )
    cors_origins: list[str] = field(
        default_factory=lambda: ["http://localhost:5173"]
    )


settings = Settings()
