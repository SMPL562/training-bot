from sqlalchemy import Column, Integer, String, JSON, DateTime
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class Template(Base):
    __tablename__ = "templates"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    call_context = Column(String)
    goals = Column(JSON)
    objections = Column(JSON)
    persona = Column(JSON)
    version = Column(Integer, default=1)

class Session(Base):
    __tablename__ = "sessions"
    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer)
    transcript = Column(JSON)
    feedback = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

class Team(Base):
    __tablename__ = "teams"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    members = Column(JSON)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    role = Column(String)  # admin, manager, sales_rep
    team_id = Column(Integer)