import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Union, Optional
import pandas as pd
import numpy as np
import joblib

from backend.app.core.config import settings
from backend.app.models.prediction import RiskLevel, PredictionLabel
from ml.features.engineer import FeatureEngineer
from ml.models.xgboost_model import FraudXGBoost
from ml.models.anomaly import FraudIsolationForest
from ml.explainability.shap_explainer import FraudShapExplainer
from ml.risk.engine import RiskEngine

logger = logging.getLogger(__name__)

class InferenceEngine:
    """
    High-Performance Production Inference Service for FraudGuard AI.
    Pre-caches models in memory to serve single and vectorized batch transactions with sub-10ms latency.
    """
    _instance: Optional["InferenceEngine"] = None

    def __init__(self, artifacts_dir: Optional[str] = None):
        self.artifacts_dir = Path(artifacts_dir or settings.MODEL_DIRECTORY)
        self.feature_engineer: Optional[FeatureEngineer] = None
        self.active_model: Optional[Any] = None
        self.anomaly_detector: Optional[FraudIsolationForest] = None
        self.shap_explainer: Optional[FraudShapExplainer] = None
        self.risk_engine: RiskEngine = RiskEngine()
        self.model_info: Dict[str, Any] = {}
        self.is_loaded: bool = False
        
        self.load_artifacts()

    @classmethod
    def get_instance(cls) -> "InferenceEngine":
        """Singleton accessor for fast memory re-use across FastAPI requests."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def load_artifacts(self) -> None:
        """Load and cache all serialized models and explainers."""
        try:
            # 1. Feature Engineer
            scaler_path = self.artifacts_dir / "scaler.joblib"
            if scaler_path.exists():
                self.feature_engineer = FeatureEngineer.load(str(scaler_path))
            else:
                logger.warning(f"Scaler not found at {scaler_path}")

            # 2. Model Registry Manifest to find Active Model
            manifest_path = self.artifacts_dir / "model_registry.json"
            active_file = "xgboost_v1.joblib"
            if manifest_path.exists():
                with open(manifest_path, "r") as f:
                    manifest = json.load(f)
                    self.model_info = manifest.get("active_model", {})
                    active_file = self.model_info.get("artifact_file", active_file)

            # 3. Active Supervised Model
            model_path = self.artifacts_dir / active_file
            if not model_path.exists():
                model_path = self.artifacts_dir / "xgboost_v1.joblib"
            
            if model_path.exists():
                self.active_model = FraudXGBoost.load(str(model_path))
            else:
                logger.warning(f"Active model not found at {model_path}")

            # 4. Anomaly Detector
            anom_path = self.artifacts_dir / "isolation_forest_v1.joblib"
            if anom_path.exists():
                self.anomaly_detector = FraudIsolationForest.load(str(anom_path))
            else:
                logger.warning(f"Anomaly detector not found at {anom_path}")

            # 5. SHAP Explainer
            shap_path = self.artifacts_dir / "shap_explainer.joblib"
            if shap_path.exists() and self.active_model is not None:
                underlying = getattr(self.active_model, "model", self.active_model)
                self.shap_explainer = FraudShapExplainer.load(str(shap_path), model=underlying)
            else:
                logger.warning(f"SHAP explainer not found at {shap_path}")

            self.is_loaded = True
            logger.info("InferenceEngine artifacts successfully loaded into memory.")
        except Exception as e:
            logger.error(f"Error loading InferenceEngine artifacts: {e}", exc_info=True)
            self.is_loaded = False

    def predict_single(self, txn_dict: Dict[str, Any], compute_shap: bool = True) -> Dict[str, Any]:
        """
        Conduct full multi-signal prediction, anomaly scoring, risk scoring, and explainability on a single transaction.
        Measures authentic execution latency across pipeline stages.
        """
        import time
        if not self.is_loaded or self.feature_engineer is None or self.active_model is None:
            raise RuntimeError("InferenceEngine artifacts are not loaded.")

        t_total_start = time.perf_counter()

        if "timestamp" not in txn_dict or not txn_dict["timestamp"]:
            from datetime import datetime, timezone
            txn_dict = dict(txn_dict)
            txn_dict["timestamp"] = datetime.now(timezone.utc)

        # 1. Feature Engineering
        t_feat_start = time.perf_counter()
        X_features = self.feature_engineer.transform(txn_dict)
        preprocessing_ms = round((time.perf_counter() - t_feat_start) * 1000.0, 2)

        # 2. Supervised Fraud Probability
        t_infer_start = time.perf_counter()
        probs = self.active_model.predict_proba(X_features)
        fraud_prob = float(probs[0, 1] if probs.ndim == 2 else probs[0])

        # 3. Anomaly Score
        anomaly_score = 0.0
        is_anomaly = False
        if self.anomaly_detector is not None:
            anom_scores, anom_flags = self.anomaly_detector.score_anomaly(X_features)
            anomaly_score = float(anom_scores[0])
            is_anomaly = bool(anom_flags[0])

        # 4. Multi-Signal Composite Risk Engine
        risk_res = self.risk_engine.evaluate_transaction(
            supervised_prob=fraud_prob,
            anomaly_score=anomaly_score,
            raw_txn=txn_dict,
        )
        inference_ms = round((time.perf_counter() - t_infer_start) * 1000.0, 2)

        risk_score = risk_res["risk_score"]
        risk_level = risk_res["risk_level"]
        triggered_rules = risk_res["triggered_rules"]

        # 5. Decision Threshold Classification
        threshold = self.active_model.optimal_threshold
        prediction_label = (
            PredictionLabel.POTENTIAL_FRAUD
            if (fraud_prob >= threshold or risk_level in [RiskLevel.CRITICAL, RiskLevel.HIGH])
            else PredictionLabel.LEGITIMATE
        )

        # 6. Recommended Review Priority
        if risk_level == RiskLevel.CRITICAL:
            priority = "URGENT"
        elif risk_level == RiskLevel.HIGH:
            priority = "ELEVATED"
        elif risk_level == RiskLevel.MEDIUM:
            priority = "ROUTINE"
        else:
            priority = "NONE"

        # 7. Explainable AI (SHAP attributions)
        t_shap_start = time.perf_counter()
        explanation: Dict[str, Any] = {}
        if compute_shap and self.shap_explainer is not None:
            explanation = self.shap_explainer.explain_instance(X_features)
        shap_ms = round((time.perf_counter() - t_shap_start) * 1000.0, 2)

        total_ms = round((time.perf_counter() - t_total_start) * 1000.0, 2)

        # Calibrated decision confidence based on distance from optimal decision threshold
        # and class probability extremity
        dist_from_threshold = abs(fraud_prob - threshold)
        max_dist = max(threshold, 1.0 - threshold)
        confidence = round(float(np.clip(0.5 + 0.5 * (dist_from_threshold / max_dist), 0.5, 0.99)), 4)

        return {
            "prediction": prediction_label.value,
            "fraud_probability": round(fraud_prob, 4),
            "risk_score": risk_score,
            "risk_level": risk_level.value,
            "anomaly_score": round(anomaly_score, 4),
            "is_anomaly": is_anomaly,
            "threshold_used": round(threshold, 2),
            "confidence_score": confidence,
            "model_name": self.active_model.name,
            "model_version": self.active_model.version,
            "algorithm": self.active_model.algorithm,
            "behavioral_score": risk_res["behavioral_score"],
            "triggered_rules": triggered_rules,
            "recommended_review_priority": priority,
            "explanation": explanation,
            "prediction_time_ms": total_ms,
            "timing": {
                "preprocessing_ms": preprocessing_ms,
                "inference_ms": inference_ms,
                "shap_ms": shap_ms,
                "total_ms": total_ms,
            },
        }

    def predict_batch(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        High-throughput vectorized batch prediction on a DataFrame of transactions.
        """
        if not self.is_loaded or self.feature_engineer is None or self.active_model is None:
            raise RuntimeError("InferenceEngine artifacts are not loaded.")

        X_features = self.feature_engineer.transform(df)
        
        # Vectorized probability
        probs = self.active_model.predict_proba(X_features)[:, 1]
        
        # Vectorized anomaly
        anom_scores = np.zeros(len(df))
        anom_flags = np.zeros(len(df), dtype=bool)
        if self.anomaly_detector is not None:
            anom_scores, anom_flags = self.anomaly_detector.score_anomaly(X_features)

        result_rows = []
        threshold = self.active_model.optimal_threshold
        
        for idx in range(len(df)):
            raw_row = df.iloc[idx].to_dict()
            prob = float(probs[idx])
            anom = float(anom_scores[idx])

            risk_eval = self.risk_engine.evaluate_transaction(
                supervised_prob=prob,
                anomaly_score=anom,
                raw_txn=raw_row,
            )
            r_level = risk_eval["risk_level"]
            pred_label = (
                PredictionLabel.POTENTIAL_FRAUD
                if (prob >= threshold or r_level in [RiskLevel.CRITICAL, RiskLevel.HIGH])
                else PredictionLabel.LEGITIMATE
            )

            result_rows.append({
                "fraud_probability": round(prob, 4),
                "risk_score": risk_eval["risk_score"],
                "risk_level": r_level.value,
                "prediction": pred_label.value,
                "anomaly_score": round(anom, 4),
                "is_anomaly": bool(anom_flags[idx]),
                "triggered_rules": "; ".join(risk_eval["triggered_rules"]),
            })

        res_df = pd.DataFrame(result_rows, index=df.index)
        return pd.concat([df, res_df], axis=1)
