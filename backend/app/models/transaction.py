from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, Index
from sqlalchemy.orm import relationship
from backend.app.db.session import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    external_transaction_id = Column(String(64), unique=True, index=True, nullable=False)
    customer_id = Column(String(64), index=True, nullable=False)
    card_id = Column(String(64), index=True, nullable=True)
    amount = Column(Float, nullable=False, index=True)
    currency = Column(String(10), default="INR", nullable=False)
    transaction_type = Column(String(32), index=True, nullable=False)  # PAYMENT, TRANSFER, CASH_OUT, etc.
    merchant_id = Column(String(64), index=True, nullable=False)
    merchant_category = Column(String(64), index=True, nullable=False)
    location = Column(String(100), nullable=False)
    country = Column(String(10), default="IN", nullable=False)
    device_id = Column(String(64), index=True, nullable=False)
    ip_address = Column(String(64), nullable=False)
    channel = Column(String(20), default="ONLINE", nullable=False)  # ONLINE, MOBILE, POS, ATM
    timestamp = Column(DateTime, index=True, nullable=False)
    
    # Behavioral & Risk Context Features
    account_age_days = Column(Integer, default=30, nullable=False)
    transaction_frequency = Column(Integer, default=1, nullable=False)  # past 24h count
    previous_transaction_amount = Column(Float, default=0.0, nullable=False)
    balance_before = Column(Float, default=0.0, nullable=False)
    balance_after = Column(Float, default=0.0, nullable=False)
    distance_from_previous_transaction = Column(Float, default=0.0, nullable=False)  # in km
    ip_risk = Column(Float, default=0.0, nullable=False)  # 0.0 - 1.0
    device_risk = Column(Float, default=0.0, nullable=False)  # 0.0 - 1.0
    
    # Ground Truth Label (for evaluation/training datasets)
    is_fraud = Column(Boolean, nullable=True, default=None, index=True)
    
    extra_metadata = Column(Text, nullable=True)  # JSON text
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    prediction = relationship("Prediction", back_populates="transaction", uselist=False, cascade="all, delete-orphan")
    alert = relationship("FraudAlert", back_populates="transaction", uselist=False, cascade="all, delete-orphan")
    case = relationship("InvestigationCase", back_populates="transaction", uselist=False, cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_transactions_timestamp_amount", "timestamp", "amount"),
        Index("ix_transactions_customer_timestamp", "customer_id", "timestamp"),
    )
