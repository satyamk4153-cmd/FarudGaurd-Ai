from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.api.dependencies.auth import get_current_user
from backend.app.models.user import User
from backend.app.schemas.dashboard import (
    DashboardSummaryResponse,
    DashboardTrendsResponse,
    RiskDistributionPoint,
    GeographyPoint,
)
from backend.app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard & Analytics"])

@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve operational financial intelligence summary KPI cards."""
    return DashboardService.get_summary_kpis(db=db, days=days)

@router.get("/trends", response_model=DashboardTrendsResponse)
def get_dashboard_trends(
    days: int = Query(30, ge=1, le=90),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve daily volume, fraud trend, merchant categories, and transaction types."""
    return DashboardService.get_trends(db=db, days=days)

@router.get("/risk-distribution", response_model=List[RiskDistributionPoint])
def get_risk_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve distribution breakdown across LOW, MEDIUM, HIGH, and CRITICAL risk tiers."""
    return DashboardService.get_risk_distribution(db=db)

@router.get("/geography", response_model=List[GeographyPoint])
def get_geography_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve geographic breakdown of transaction volume and fraud rates by city/country."""
    return DashboardService.get_geography_distribution(db=db)
