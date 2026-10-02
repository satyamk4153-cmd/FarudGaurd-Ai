from datetime import datetime, timezone
import enum
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Enum, Index
from sqlalchemy.orm import relationship
from backend.app.db.session import Base

class RiskLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class PredictionLabel(str, enum.Enum):
    LEGITIMATE = "Legitimate"
    POTENTIAL_FRAUD = "Potential Fraud"

class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    model_version_id = Column(Integer, ForeignKey("model_versions.id", ondelete="SET NULL"), nullable=True, index=True)
    
    fraud_probability = Column(Float, nullable=False, index=True)  # Model computed probability [0, 1]
    risk_score = Column(Float, nullable=False, index=True)         # Multi-signal composite score [0, 100]
    risk_level = Column(Enum(RiskLevel), nullable=False, index=True)
    prediction = Column(Enum(PredictionLabel), nullable=False, index=True)
    anomaly_score = Column(Float, nullable=False, default=0.0)     # Isolation forest normalized anomaly [0, 1]
    
    explanation_json = Column(Text, nullable=True)                 # JSON of SHAP contributors
    rule_flags_json = Column(Text, nullable=True)                  # JSON of rule signals triggered
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    # Relationships
    transaction = relationship("Transaction", back_populates="prediction")
    model_version = relationship("ModelVersion", back_populates="predictions")

    __table_args__ = (
        Index("ix_predictions_risk_created", "risk_score", "created_at"),
    )
