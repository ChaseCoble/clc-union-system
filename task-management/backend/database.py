from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from backend.config import get_config


class Base(DeclarativeBase):
    pass


def get_engine():
    config = get_config()
    return create_engine(
        config.database_url,
        connect_args={"check_same_thread": False},  # SQLite only
    )


def get_session_factory():
    engine = get_engine()
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)


SessionLocal = get_session_factory()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
