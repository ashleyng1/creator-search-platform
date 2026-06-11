import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

_default_db = "/tmp/creator_search.db" if os.getenv("VERCEL") else "./creator_search.db"
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{_default_db}")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
