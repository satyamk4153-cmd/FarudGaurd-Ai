from datetime import datetime, timezone
import enum
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from backend.app.db.session import Base
from backend.app.models.prediction import RiskLevel

class CaseStatus(str, enum.Enum):
    OPEN = "OPEN"
    UNDER_REVIEW = "UNDER_REVIEW"
    ESCALATED = "ESCALATED"
    RESOLVED = "RESOLVED"
    FALSE_POSITIVE = "FALSE_POSITIVE"

class InvestigationCase(Base):
    __tablename__ = "investigation_cases"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    case_number = Column(String(32), unique=True, index=True, nullable=False)
    transaction_id = Column(Integer, ForeignKey("transactions.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    assigned_to = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    priority = Column(Enum(RiskLevel), default=RiskLevel.MEDIUM, nullable=False, index=True)
    status = Column(Enum(CaseStatus), default=CaseStatus.OPEN, nullable=False, index=True)
    summary = Column(Text, nullable=False)
    resolution_summary = Column(Text, nullable=True)
    
    opened_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    closed_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    transaction = relationship("Transaction", back_populates="case")
    assignee = relationship("User", foreign_keys=[assigned_to], back_populates="assigned_cases")
    notes = relationship("InvestigationNote", back_populates="case", cascade="all, delete-orphan", order_by="InvestigationNote.created_at.desc()")

class InvestigationNote(Base):
    __tablename__ = "investigation_notes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    case_id = Column(Integer, ForeignKey("investigation_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    note = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    case = relationship("InvestigationCase", back_populates="notes")
    author = relationship("User", back_populates="investigation_notes")
