from datetime import datetime, timezone
import enum
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from backend.app.db.session import Base

class ModelStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    TRAINING = "TRAINING"
    EVALUATED = "EVALUATED"
    APPROVED = "APPROVED"
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"

class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(128), unique=True, index=True, nullable=False)
    source = Column(String(64), default="SYNTHETIC", nullable=False)  # SYNTHETIC, PUBLIC, UPLOADED
    description = Column(Text, nullable=True)
    filename = Column(String(255), nullable=False)
    row_count = Column(Integer, default=0, nullable=False)
    column_count = Column(Integer, default=0, nullable=False)
    fraud_count = Column(Integer, default=0, nullable=False)
    legitimate_count = Column(Integer, default=0, nullable=False)
    feature_summary_json = Column(Text, nullable=True)
    status = Column(String(32), default="READY", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    versions = relationship("DatasetVersion", back_populates="dataset", cascade="all, delete-orphan")

class DatasetVersion(Base):
    __tablename__ = "dataset_versions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    version = Column(String(32), nullable=False)
    row_count = Column(Integer, nullable=False)
    file_path = Column(String(512), nullable=False)
    checksum = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    dataset = relationship("Dataset", back_populates="versions")

class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(128), index=True, nullable=False)  # e.g. "FraudGuard XGBoost"
    algorithm = Column(String(64), index=True, nullable=False)  # "XGBoost", "LightGBM", "RandomForest", "LogisticRegression"
    version = Column(String(32), index=True, nullable=False)  # e.g. "v1.0"
    status = Column(Enum(ModelStatus), default=ModelStatus.DRAFT, nullable=False, index=True)
    artifact_path = Column(String(512), nullable=False)
    threshold = Column(Float, default=0.50, nullable=False)
    hyperparameters_json = Column(Text, nullable=True)
    feature_schema_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    evaluations = relationship("ModelEvaluation", back_populates="model_version", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="model_version")
    drift_reports = relationship("DriftReport", back_populates="model_version", cascade="all, delete-orphan")

class ModelEvaluation(Base):
    __tablename__ = "model_evaluations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    model_version_id = Column(Integer, ForeignKey("model_versions.id", ondelete="CASCADE"), nullable=False, index=True)
    accuracy = Column(Float, nullable=False)
    precision = Column(Float, nullable=False)
    recall = Column(Float, nullable=False)
    f1 = Column(Float, nullable=False)
    roc_auc = Column(Float, nullable=False)
    pr_auc = Column(Float, nullable=False)
    precision_at_k = Column(Float, nullable=True)
    recall_at_k = Column(Float, nullable=True)
    threshold = Column(Float, default=0.50, nullable=False)
    confusion_matrix_json = Column(Text, nullable=False)  # [[TN, FP], [FN, TP]]
    roc_curve_json = Column(Text, nullable=True)
    pr_curve_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    model_version = relationship("ModelVersion", back_populates="evaluations")

class FeatureMetadata(Base):
    __tablename__ = "feature_metadata"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(64), unique=True, index=True, nullable=False)
    data_type = Column(String(32), nullable=False)
    category = Column(String(64), nullable=False)  # Temporal, Behavioral, Velocity, Geographic, Entity
    description = Column(Text, nullable=True)
    is_derived = Column(Boolean, default=False, nullable=False)
    importance_score = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

class DriftReport(Base):
    __tablename__ = "drift_reports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    model_version_id = Column(Integer, ForeignKey("model_versions.id", ondelete="CASCADE"), nullable=False, index=True)
    feature = Column(String(64), index=True, nullable=False)
    drift_metric = Column(String(32), default="PSI", nullable=False)  # PSI, KS
    drift_score = Column(Float, nullable=False)
    p_value = Column(Float, nullable=True)
    is_drift_detected = Column(Boolean, default=False, nullable=False, index=True)
    baseline_stats_json = Column(Text, nullable=True)
    current_stats_json = Column(Text, nullable=True)
    detected_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    # Relationships
    model_version = relationship("ModelVersion", back_populates="drift_reports")
