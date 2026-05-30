from datetime import datetime
from sqlalchemy import Column, String, DateTime
from backend.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    ###I would change this as soon as multiuser. Unauthenticated should be default, i might even want a separate kind of auth to even make an owner account
    role = Column(String, default="owner")

