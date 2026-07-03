from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base
from config import settings

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    import models.database_models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    ensure_lightweight_migrations()


def ensure_lightweight_migrations():
    inspector = inspect(engine)
    if "documents" in inspector.get_table_names():
        columns = {column["name"] for column in inspector.get_columns("documents")}
        if "workspace_id" not in columns:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE documents ADD COLUMN workspace_id INTEGER"))
