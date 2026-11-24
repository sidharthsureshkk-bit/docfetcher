from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from .database import Base

def utc_now():
    return datetime.now(timezone.utc)

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=utc_now)

    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="organization", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="organization", cascade="all, delete-orphan")
    audit_events = relationship("AuditEvent", back_populates="organization", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="Employee", nullable=False)  # Admin, Manager, Employee

    organization = relationship("Organization", back_populates="users")
    tasks = relationship("Task", back_populates="assignee")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    assignee_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    status = Column(String(50), default="Todo", nullable=False)      # Todo, In Progress, Done
    priority = Column(String(50), default="Medium", nullable=False)  # Low, Medium, High
    est_hours = Column(Float, default=4.0, nullable=False)
    due_date = Column(String(50), nullable=True)

    organization = relationship("Organization", back_populates="tasks")
    assignee = relationship("User", back_populates="tasks")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    uploaded_by = Column(String(100), nullable=False)
    page_count = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=utc_now)

    organization = relationship("Organization", back_populates="documents")


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_name = Column(String(100), nullable=False)
    action_text = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=utc_now)

    organization = relationship("Organization", back_populates="audit_events")
