from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.exception_handlers import register_exception_handlers
from app.core.extended_settings import extended_settings
from app.core.logging_config import configure_logging
from app.core.middleware import RequestLoggingMiddleware
from app.websocket.routes import router as ws_router

configure_logging()

app = FastAPI(
    title="TaskFlow AI",
    version="0.1.0",
)

register_exception_handlers(app)
app.add_middleware(RequestLoggingMiddleware)

cors_origins = list(settings.cors_origins)
if extended_settings.frontend_url and extended_settings.frontend_url not in cors_origins:
    cors_origins.append(extended_settings.frontend_url.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.api_v1_prefix)
app.include_router(ws_router)

upload_path = Path(extended_settings.upload_dir)
upload_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(upload_path)), name="uploads")


@app.get("/health")
def health_check():
    return {"status": "ok"}
