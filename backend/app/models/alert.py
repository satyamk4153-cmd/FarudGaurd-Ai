from datetime import datetime, timezone
import enum
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum, Index
from sqlalchemy.orm import relationship
from backend.app.db.session import Base
from backend.app.models.prediction import RiskLevel

class AlertStatus(str, enum.Enum):
    NEW = "NEW"
    UNDER_REVIEW = "UNDER_REVIEW"
    RESOLVED = "RESOLVED"
    FALSE_POSITIVE = "FALSE_POSITIVE"

class FraudAlert(Base):
    __tablename__ = "fraud_alerts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    severity = Column(Enum(RiskLevel), nullable=False, index=True)
    status = Column(Enum(AlertStatus), default=AlertStatus.NEW, nullable=False, index=True)
    alert_reason = Column(Text, nullable=False)
    
    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    # Relationships
    transaction = relationship("Transaction", back_populates="alert")
    reviewer = relationship("User", foreign_keys=[reviewed_by], back_populates="reviewed_alerts")

    __table_args__ = (
        Index("ix_fraud_alerts_status_created", "status", "created_at"),
    )
