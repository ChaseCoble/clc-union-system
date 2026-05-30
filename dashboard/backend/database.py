from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from backend.config import get_config


class Base(DeclarativeBase):
    pass


def get_engine():
    config = get_config()
    return create_engine(
        config.database_url,
        connect_args={"check_same_thread": False},
    )


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=get_engine())


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
