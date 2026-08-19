from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.core.config import settings


engine_kwargs = {}

if settings.database_url.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(settings.database_url, **engine_kwargs)


@event.listens_for(engine, "connect")
def _register_pgvector(dbapi_connection, _connection_record):
    if not settings.database_url.startswith("postgresql"):
        return
    try:
        from pgvector.psycopg2 import register_vector

        register_vector(dbapi_connection)
    except Exception:
        return


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
