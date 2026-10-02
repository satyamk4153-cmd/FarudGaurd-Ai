import os
import sys
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Tuple
import pandas as pd
import numpy as np

# Ensure project root in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from ml.features.engineer import FeatureEngineer
from ml.preprocessing.validator import DatasetValidator
from ml.models.logistic_regression import FraudLogisticRegression
from ml.models.random_forest import FraudRandomForest
from ml.models.xgboost_model import FraudXGBoost
from ml.models.lightgbm_model import FraudLightGBM
from ml.models.anomaly import FraudIsolationForest
from ml.evaluation.metrics import evaluate_model_performance
from ml.evaluation.threshold import ThresholdOptimizer
from ml.explainability.shap_explainer import FraudShapExplainer
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

class ModelTrainingPipeline:
    """
    End-to-End Enterprise ML Training & Experimentation Pipeline.
    Manages leakage-free time-based data splitting, multi-model training,
    threshold optimization, test evaluation, and artifact registration.
    """
    def __init__(self, dataset_path: str = "ml/datasets/synthetic_transactions.csv"):
        self.dataset_path = Path(dataset_path)
        if not self.dataset_path.is_absolute():
            self.dataset_path = BASE_DIR / self.dataset_path
            
        self.artifacts_dir = Path(settings.MODEL_DIRECTORY)
        os.makedirs(self.artifacts_dir, exist_ok=True)

    def run(self, register_in_db: bool = True) -> Dict[str, Any]:
        """Execute complete training pipeline and return experiment comparison."""
        print(f"\n=======================================================")
        print(f"FRAUDGUARD AI — ML TRAINING PIPELINE EXECUTION")
        print(f"=======================================================")
        
        # 1. Load Data
        print(f"1. Loading dataset from: {self.dataset_path}")
        df = pd.read_csv(self.dataset_path)
        print(f"   Loaded {len(df)} rows, {len(df.columns)} columns.")

        # 2. Validate Data
        val_res = DatasetValidator.validate_dataset(df, require_target=True)
        if not val_res["is_valid"]:
            raise ValueError(f"Dataset validation failed: {val_res['errors']}")
        print(f"2. Validation passed cleanly. Fraud count: {val_res['profile']['class_distribution']['fraud']} ({val_res['profile']['class_distribution']['fraud_rate']:.2%})")

        # 3. Time-Aware Chronological Splitting (Prevents Lookahead Leakage)
        print("3. Executing chronological train/validation/test split...")
        df["timestamp"] = pd.to_datetime(df["timestamp"])
        df = df.sort_values(by="timestamp").reset_index(drop=True)
        
        n = len(df)
        train_idx = int(n * 0.70)
        val_idx = int(n * 0.85)

        train_df = df.iloc[:train_idx].copy()
        val_df = df.iloc[train_idx:val_idx].copy()
        test_df = df.iloc[val_idx:].copy()

        print(f"   Train set: {len(train_df)} rows | Val set: {len(val_df)} rows | Test set: {len(test_df)} rows")

        # 4. Leakage-Free Feature Engineering (Fit on Train ONLY)
        print("4. Fitting FeatureEngineer scaler strictly on Train split...")
        feature_engineer = FeatureEngineer()
        feature_engineer.fit(train_df)
        
        X_train = feature_engineer.transform(train_df)
        y_train = train_df["is_fraud"].values

        X_val = feature_engineer.transform(val_df)
        y_val = val_df["is_fraud"].values

        X_test = feature_engineer.transform(test_df)
        y_test = test_df["is_fraud"].values

        # Save feature engineer
        scaler_path = self.artifacts_dir / "scaler.joblib"
        feature_engineer.save(str(scaler_path))
        print(f"   Saved fitted scaler to: {scaler_path}")

        # 5. Train Isolation Forest (Unsupervised Anomaly Detector)
        print("5. Training Isolation Forest anomaly detector...")
        iso_forest = FraudIsolationForest(contamination=0.035)
        iso_forest.fit(X_train)
        iso_path = self.artifacts_dir / "isolation_forest_v1.joblib"
        iso_forest.save(str(iso_path))
        print(f"   Saved anomaly model to: {iso_path}")

        # 6. Candidate Supervised Models
        models = [
            FraudLogisticRegression(version="v1.0"),
            FraudRandomForest(n_estimators=100, max_depth=10, version="v1.0"),
            FraudXGBoost(n_estimators=120, max_depth=5, learning_rate=0.08, version="v1.0"),
            FraudLightGBM(n_estimators=120, max_depth=5, learning_rate=0.08, version="v1.0"),
        ]

        optimizer = ThresholdOptimizer(cost_fn=500.0, cost_fp=25.0)
        experiment_results = []
        best_model = None
        best_f1 = -1.0

        print("\n6. Training, optimizing threshold, and evaluating candidate models:")
        for model in models:
            print(f"\n   -> Training {model.name}...")
            model.fit(X_train, y_train)

            # Validation Threshold Optimization
            val_probs = model.predict_proba(X_val)[:, 1]
            thresh_analysis = optimizer.analyze_thresholds(y_val, val_probs)
            opt_thresh = thresh_analysis["optimal_f1_threshold"]
            model.optimal_threshold = opt_thresh

            # Test Evaluation with Optimal Threshold
            test_probs = model.predict_proba(X_test)[:, 1]
            metrics = evaluate_model_performance(y_test, test_probs, threshold=opt_thresh)
            model.metrics = metrics

            # Save Model Artifact
            artifact_name = f"{model.algorithm.lower()}_v1.joblib"
            artifact_path = self.artifacts_dir / artifact_name
            model.save(str(artifact_path))

            print(f"      Validation Optimal Threshold: {opt_thresh:.2f}")
            print(f"      Test Metrics -> Accuracy: {metrics['accuracy']:.4f} | Precision: {metrics['precision']:.4f} | Recall: {metrics['recall']:.4f} | F1: {metrics['f1']:.4f} | ROC-AUC: {metrics['roc_auc']:.4f} | PR-AUC: {metrics['pr_auc']:.4f}")
            print(f"      Confusion Matrix: {metrics['confusion_matrix']}")

            result_entry = {
                "name": model.name,
                "algorithm": model.algorithm,
                "version": model.version,
                "artifact_path": str(artifact_path),
                "threshold": opt_thresh,
                "metrics": metrics,
                "threshold_curve": thresh_analysis["threshold_curve"],
                "model_instance": model,
            }
            experiment_results.append(result_entry)

            # Champion Model Selection: Prioritize F1; if tied, prioritize XGBoost / Tree models over linear baseline
            is_better = False
            if best_model is None:
                is_better = True
            elif metrics["f1"] > best_f1:
                is_better = True
            elif abs(metrics["f1"] - best_f1) < 1e-4:
                # Tied on F1 - prioritize XGBoost or LightGBM
                if model.algorithm == "XGBoost":
                    is_better = True
                elif model.algorithm == "LightGBM" and getattr(best_model, "algorithm", "") not in ["XGBoost"]:
                    is_better = True
                elif model.algorithm == "RandomForest" and getattr(best_model, "algorithm", "") == "LogisticRegression":
                    is_better = True

            if is_better:
                best_f1 = metrics["f1"]
                best_model = model
                best_artifact_path = artifact_path

        # 7. Fit & Serialize SHAP Explainer on Champion Model
        print(f"\n7. Building SHAP Explainer for Champion Model: {best_model.name}...")
        underlying = getattr(best_model, "model", best_model)
        shap_explainer = FraudShapExplainer(underlying, list(X_train.columns), background_data=X_train)
        shap_path = self.artifacts_dir / "shap_explainer.joblib"
        shap_explainer.save(str(shap_path))
        print(f"   Saved SHAP explainer to: {shap_path}")

        # Compute global feature importance
        global_importance = shap_explainer.explain_global(X_test)
        print("   Top 5 Most Influential Features:")
        for feat in global_importance[:5]:
            print(f"    - {feat['label']} ({feat['feature']}): {feat['importance']:.4f}")

        # 8. Save Model Registry Manifest
        registry_manifest = {
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "active_model": {
                "name": best_model.name,
                "algorithm": best_model.algorithm,
                "version": best_model.version,
                "artifact_file": str(best_artifact_path.name),
                "threshold": best_model.optimal_threshold,
                "metrics": best_model.metrics,
            },
            "models": [
                {
                    "name": r["name"],
                    "algorithm": r["algorithm"],
                    "version": r["version"],
                    "artifact_file": Path(r["artifact_path"]).name,
                    "threshold": r["threshold"],
                    "metrics": r["metrics"],
                }
                for r in experiment_results
            ],
            "global_feature_importance": global_importance,
        }

        registry_path = self.artifacts_dir / "model_registry.json"
        with open(registry_path, "w") as f:
            json.dump(registry_manifest, f, indent=2)
        print(f"\n8. Saved model registry manifest to: {registry_path}")

        # 9. Register in Database if requested
        if register_in_db:
            print("9. Registering model versions & evaluations into database...")
            self._register_in_database(experiment_results, best_model)

        print("\n=======================================================")
        print(f"TRAINING COMPLETED SUCCESSFULLY. CHAMPION: {best_model.name}")
        print(f"=======================================================\n")
        return registry_manifest

    def _register_in_database(self, experiment_results: List[Dict[str, Any]], best_model: Any):
        """Persist model versions and evaluations into SQLite/PostgreSQL."""
        from backend.app.db.session import SessionLocal
        from backend.app.models.ml_models import ModelVersion, ModelEvaluation, ModelStatus

        db = SessionLocal()
        try:
            for exp in experiment_results:
                m_inst = exp["model_instance"]
                metrics = exp["metrics"]
                is_active = (m_inst.algorithm == best_model.algorithm)
                status = ModelStatus.ACTIVE if is_active else ModelStatus.APPROVED

                # Check if exists
                existing = db.query(ModelVersion).filter(
                    ModelVersion.algorithm == m_inst.algorithm,
                    ModelVersion.version == m_inst.version
                ).first()

                if existing:
                    existing.status = status
                    existing.threshold = m_inst.optimal_threshold
                    existing.artifact_path = exp["artifact_path"]
                    existing.updated_at = datetime.now(timezone.utc)
                    mv = existing
                else:
                    mv = ModelVersion(
                        name=m_inst.name,
                        algorithm=m_inst.algorithm,
                        version=m_inst.version,
                        status=status,
                        artifact_path=exp["artifact_path"],
                        threshold=m_inst.optimal_threshold,
                        hyperparameters_json=json.dumps(getattr(m_inst, "model", {}).get_params() if hasattr(getattr(m_inst, "model", None), "get_params") else {}),
                    )
                    db.add(mv)
                    db.commit()
                    db.refresh(mv)

                # Add evaluation record
                eval_rec = ModelEvaluation(
                    model_version_id=mv.id,
                    accuracy=metrics["accuracy"],
                    precision=metrics["precision"],
                    recall=metrics["recall"],
                    f1=metrics["f1"],
                    roc_auc=metrics["roc_auc"],
                    pr_auc=metrics["pr_auc"],
                    precision_at_k=metrics.get("precision_at_5pct"),
                    recall_at_k=metrics.get("recall_at_5pct"),
                    threshold=m_inst.optimal_threshold,
                    confusion_matrix_json=json.dumps(metrics["confusion_matrix"]),
                    roc_curve_json=json.dumps(metrics["roc_curve"]),
                    pr_curve_json=json.dumps(metrics["pr_curve"]),
                )
                db.add(eval_rec)
                db.commit()
            print("   Successfully recorded all model versions and evaluations into database.")
        finally:
            db.close()

if __name__ == "__main__":
    pipeline = ModelTrainingPipeline()
    pipeline.run(register_in_db=True)
