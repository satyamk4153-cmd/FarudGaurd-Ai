from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, case
from backend.app.models.transaction import Transaction
from backend.app.models.prediction import Prediction, RiskLevel, PredictionLabel
from backend.app.models.alert import FraudAlert, AlertStatus
from backend.app.models.investigation import InvestigationCase, CaseStatus
from backend.app.schemas.dashboard import (
    DashboardSummaryResponse,
    TrendPoint,
    RiskDistributionPoint,
    CategoryRiskPoint,
    TypeRiskPoint,
    GeographyPoint,
    DashboardTrendsResponse,
)

class DashboardService:
    @staticmethod
    def get_summary_kpis(db: Session, days: int = 30) -> DashboardSummaryResponse:
        """Calculate real aggregated financial KPIs directly from the database."""
        since = datetime.now(timezone.utc) - timedelta(days=days)

        # 1. Total Transactions & Financial Volume
        total_txns = db.query(Transaction).count()
        total_amount = float(db.query(func.sum(Transaction.amount)).scalar() or 0.0)

        # 2. Potential Fraud Predictions & Amount at Risk
        potential_fraud = db.query(Prediction).filter(Prediction.prediction == PredictionLabel.POTENTIAL_FRAUD).count()
        fraud_rate = round(float(potential_fraud / max(1, total_txns)), 4)
        amount_at_risk = float(
            db.query(func.sum(Transaction.amount))
            .join(Prediction, Prediction.transaction_id == Transaction.id)
            .filter(Prediction.prediction == PredictionLabel.POTENTIAL_FRAUD)
            .scalar()
            or 0.0
        )

        # 3. Average Risk Score
        avg_risk = db.query(func.avg(Prediction.risk_score)).scalar() or 0.0

        # 4. Critical Alerts
        critical_alerts = db.query(FraudAlert).filter(FraudAlert.severity == RiskLevel.CRITICAL).count()

        # 5. Anomalies Detected
        anomalies = db.query(Prediction).filter(Prediction.anomaly_score >= 0.65).count()

        # 6. Under Review Cases & Alerts
        under_review = db.query(InvestigationCase).filter(InvestigationCase.status.in_([CaseStatus.OPEN, CaseStatus.UNDER_REVIEW])).count()

        # 7. Resolved / False Positives
        resolved_cases = db.query(InvestigationCase).filter(InvestigationCase.status.in_([CaseStatus.RESOLVED, CaseStatus.FALSE_POSITIVE])).count()

        return DashboardSummaryResponse(
            total_transactions=total_txns,
            potential_fraud=potential_fraud,
            fraud_rate=fraud_rate,
            average_risk_score=round(float(avg_risk), 1),
            critical_alerts=critical_alerts,
            anomalies=anomalies,
            under_review=under_review,
            resolved_cases=resolved_cases,
            total_amount=round(total_amount, 2),
            amount_at_risk=round(amount_at_risk, 2),
        )

    @staticmethod
    def get_trends(db: Session, days: int = 30) -> DashboardTrendsResponse:
        """Calculate volume, amount and fraud rate timeline aggregated by transaction date."""
        dialect = db.bind.dialect.name if db.bind else "sqlite"
        if dialect == "postgresql":
            date_expr = func.to_char(Transaction.timestamp, "YYYY-MM-DD")
        else:
            date_expr = func.strftime("%Y-%m-%d", Transaction.timestamp)

        # Query transactions joined with predictions
        records = (
            db.query(
                date_expr.label("day"),
                func.count(Transaction.id).label("vol"),
                func.sum(case((Prediction.prediction == PredictionLabel.POTENTIAL_FRAUD, 1), else_=0)).label("fraud_cnt"),
                func.avg(Prediction.risk_score).label("avg_r"),
                func.sum(Transaction.amount).label("tot_amt"),
                func.sum(case((Prediction.prediction == PredictionLabel.POTENTIAL_FRAUD, Transaction.amount), else_=0.0)).label("fraud_amt"),
            )
            .outerjoin(Prediction, Prediction.transaction_id == Transaction.id)
            .group_by("day")
            .order_by("day")
            .limit(days)
            .all()
        )

        trend_points = []
        for r in records:
            day_str = str(r[0])
            vol = int(r[1] or 0)
            f_cnt = int(r[2] or 0)
            rate = round(float(f_cnt / max(1, vol)), 4)
            avg_r = round(float(r[3] or 0.0), 1)
            tot_amt = round(float(r[4] or 0.0), 2)
            f_amt = round(float(r[5] or 0.0), 2)
            trend_points.append(
                TrendPoint(
                    date=day_str,
                    total_volume=vol,
                    fraud_count=f_cnt,
                    fraud_rate=rate,
                    avg_risk=avg_r,
                    total_amount=tot_amt,
                    fraud_amount=f_amt,
                )
            )

        # Category Breakdown
        cat_records = (
            db.query(
                Transaction.merchant_category,
                func.count(Transaction.id).label("vol"),
                func.sum(case((Prediction.prediction == PredictionLabel.POTENTIAL_FRAUD, 1), else_=0)).label("fraud_cnt"),
                func.sum(Transaction.amount).label("tot_amt"),
                func.sum(case((Prediction.prediction == PredictionLabel.POTENTIAL_FRAUD, Transaction.amount), else_=0.0)).label("fraud_amt"),
            )
            .outerjoin(Prediction, Prediction.transaction_id == Transaction.id)
            .group_by(Transaction.merchant_category)
            .all()
        )
        cat_points = [
            CategoryRiskPoint(
                category=str(c[0]),
                total=int(c[1] or 0),
                fraud_count=int(c[2] or 0),
                fraud_rate=round(float((c[2] or 0) / max(1, c[1])), 4),
                total_amount=round(float(c[3] or 0.0), 2),
                fraud_amount=round(float(c[4] or 0.0), 2),
            )
            for c in cat_records
        ]

        # Type Breakdown
        type_records = (
            db.query(
                Transaction.transaction_type,
                func.count(Transaction.id).label("vol"),
                func.sum(case((Prediction.prediction == PredictionLabel.POTENTIAL_FRAUD, 1), else_=0)).label("fraud_cnt"),
                func.sum(Transaction.amount).label("tot_amt"),
                func.sum(case((Prediction.prediction == PredictionLabel.POTENTIAL_FRAUD, Transaction.amount), else_=0.0)).label("fraud_amt"),
            )
            .outerjoin(Prediction, Prediction.transaction_id == Transaction.id)
            .group_by(Transaction.transaction_type)
            .all()
        )
        type_points = [
            TypeRiskPoint(
                type=str(t[0]),
                total=int(t[1] or 0),
                fraud_count=int(t[2] or 0),
                fraud_rate=round(float((t[2] or 0) / max(1, t[1])), 4),
                total_amount=round(float(t[3] or 0.0), 2),
                fraud_amount=round(float(t[4] or 0.0), 2),
            )
            for t in type_records
        ]

        return DashboardTrendsResponse(
            timeframe=f"Last {days} days",
            trends=trend_points,
            category_distribution=cat_points,
            type_distribution=type_points,
        )

    @staticmethod
    def get_risk_distribution(db: Session) -> List[RiskDistributionPoint]:
        """Distribution of scored transactions across LOW, MEDIUM, HIGH, CRITICAL levels."""
        total = db.query(Prediction).count()
        records = (
            db.query(Prediction.risk_level, func.count(Prediction.id))
            .group_by(Prediction.risk_level)
            .all()
        )
        points = []
        for level, count in records:
            pct = round(float(count / max(1, total)) * 100.0, 1)
            points.append(
                RiskDistributionPoint(
                    level=level.value,
                    count=count,
                    percentage=pct,
                )
            )
        # Ensure all four levels appear
        existing_levels = {p.level for p in points}
        for req_level in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]:
            if req_level not in existing_levels:
                points.append(RiskDistributionPoint(level=req_level, count=0, percentage=0.0))

        # Order by severity
        order = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}
        return sorted(points, key=lambda p: order.get(p.level, 99))

    @staticmethod
    def get_geography_distribution(db: Session) -> List[GeographyPoint]:
        """Distribution of transaction volume and fraud by city."""
        records = (
            db.query(
                Transaction.location,
                Transaction.country,
                func.count(Transaction.id).label("vol"),
                func.sum(case((Prediction.prediction == PredictionLabel.POTENTIAL_FRAUD, 1), else_=0)).label("fraud_cnt"),
                func.avg(Prediction.risk_score).label("avg_risk"),
                func.sum(Transaction.amount).label("tot_amt"),
                func.sum(case((Prediction.prediction == PredictionLabel.POTENTIAL_FRAUD, Transaction.amount), else_=0.0)).label("fraud_amt"),
            )
            .outerjoin(Prediction, Prediction.transaction_id == Transaction.id)
            .group_by(Transaction.location, Transaction.country)
            .order_by(desc("vol"))
            .all()
        )
        points = []
        for r in records:
            vol = int(r[2] or 0)
            f_cnt = int(r[3] or 0)
            points.append(
                GeographyPoint(
                    location=str(r[0]),
                    country=str(r[1]),
                    total=vol,
                    fraud_count=f_cnt,
                    fraud_rate=round(float(f_cnt / max(1, vol)), 4),
                    avg_risk=round(float(r[4] or 0.0), 1),
                    total_amount=round(float(r[5] or 0.0), 2),
                    fraud_amount=round(float(r[6] or 0.0), 2),
                )
            )
        return points
