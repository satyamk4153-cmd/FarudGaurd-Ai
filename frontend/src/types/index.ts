// ============================================================================
// FraudGuard AI - Comprehensive TypeScript Interfaces
// ============================================================================

export type UserRole = 'ADMIN' | 'ANALYST' | 'USER';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  last_login?: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type DecisionType = 'APPROVE' | 'REVIEW' | 'BLOCK';
export type AlertStatus = 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED' | 'ESCALATED' | 'FALSE_POSITIVE';
export type CaseStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type CasePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Transaction {
  id: number;
  transaction_id: string;
  external_transaction_id?: string;
  customer_id?: string;
  card_id?: string | null;
  merchant_id?: string;
  user_id: string;
  amount: number;
  currency: string;
  timestamp: string;
  transaction_type: string;
  merchant_category: string;
  channel: string;
  city: string;
  country: string;
  location?: string;
  is_international: boolean;
  ip_address: string;
  device_id?: string;
  device_type: string;
  device_risk?: number;
  ip_risk?: number;
  account_age_days?: number;
  transaction_frequency?: number;
  previous_transaction_amount?: number;
  balance_before?: number;
  balance_after?: number;
  distance_from_previous_transaction?: number;
  device_risk_score: number;
  ip_risk_score: number;
  velocity_1h: number;
  velocity_24h: number;
  avg_amount_ratio: number;
  distance_from_home: number;
  is_first_time_merchant: boolean;
  is_failed_attempt_prior: boolean;
  is_fraud?: boolean | null;
  prediction?: PredictionSummary | null;
}

export interface PredictionSummary {
  risk_score: number;
  risk_level: RiskLevel;
  decision: DecisionType;
  fraud_probability: number;
  anomaly_score: number;
  model_version: string;
  prediction_time_ms: number;
}

export interface ShapContribution {
  feature: string;
  feature_label: string;
  feature_value: number | string | boolean;
  shap_value: number;
  impact_direction: 'increases_risk' | 'decreases_risk' | 'neutral';
  percentage_contribution: number;
}

export interface TriggeredRule {
  rule_id: string;
  rule_name: string;
  severity: RiskLevel;
  description: string;
}

export interface PredictionDetail {
  id: number;
  transaction_id: string;
  risk_score: number;
  risk_level: RiskLevel;
  decision: DecisionType;
  fraud_probability: number;
  anomaly_score: number;
  model_version: string;
  prediction_time_ms: number;
  confidence_score: number;
  top_risk_factors: ShapContribution[];
  triggered_rules: TriggeredRule[];
  created_at: string;
}

export interface TransactionDetail extends Transaction {
  prediction?: PredictionDetail | null;
  alerts?: FraudAlertSummary[];
}

export interface TransactionListResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: Transaction[];
}

export interface FraudAlertSummary {
  id: number;
  alert_id: string;
  severity: RiskLevel;
  status: AlertStatus;
  rule_triggered: string;
  risk_score: number;
  assigned_to?: string | null;
  created_at: string;
}

export interface FraudAlert extends FraudAlertSummary {
  transaction_id: string;
  notes?: string | null;
  resolved_at?: string | null;
  resolved_by?: string | null;
  transaction?: Transaction | null;
}

export interface AlertListResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: FraudAlert[];
}

export interface InvestigationNote {
  id: number;
  case_id: number;
  author_id: number;
  author_name: string;
  note: string;
  is_automated: boolean;
  created_at: string;
}

export interface InvestigationCase {
  id: number;
  case_number: string;
  title: string;
  summary?: string;
  description?: string | null;
  status: CaseStatus;
  priority: CasePriority;
  assigned_to_id?: number | null;
  assigned_to_name?: string | null;
  creator_id: number;
  creator_name?: string | null;
  transaction_count: number;
  total_amount_at_risk: number;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
}

export interface InvestigationCaseDetail extends InvestigationCase {
  notes: InvestigationNote[];
  transaction_ids: string[];
}

export interface CaseListResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: InvestigationCase[];
}

// Dashboard KPIs & Analytics
export interface DashboardKPIs {
  total_transactions: number;
  potential_fraud: number;
  fraud_rate: number;
  average_risk_score: number;
  critical_alerts: number;
  anomalies: number;
  under_review: number;
  resolved_cases: number;
  // Aliases for compatibility
  fraud_count?: number;
  fraud_rate_pct?: number;
  total_volume_usd?: number;
  total_amount?: number;
  fraud_volume_usd?: number;
  total_alerts?: number;
  pending_alerts?: number;
  active_cases?: number;
  blocked_volume_usd?: number;
  avg_latency_ms?: number;
  risk_tier_counts?: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
}

export interface VolumeTrendPoint {
  date: string;
  total_volume: number;
  fraud_volume: number;
  transaction_count: number;
  fraud_count: number;
  block_count: number;
}

export interface MerchantCategoryRisk {
  category: string;
  total_count: number;
  fraud_count: number;
  fraud_rate: number;
  total_amount: number;
}

export interface GeoRiskPoint {
  city: string;
  country: string;
  transaction_count: number;
  fraud_count: number;
  total_amount: number;
  avg_risk_score: number;
}

// Single Transaction Scoring Request
export interface AnalyzeRequest {
  amount: number;
  currency?: string;
  transaction_type: string;
  merchant_category: string;
  channel: string;
  city: string;
  country: string;
  is_international?: boolean;
  ip_address?: string;
  device_type?: string;
  device_risk_score?: number;
  ip_risk_score?: number;
  velocity_1h?: number;
  velocity_24h?: number;
  avg_amount_ratio?: number;
  distance_from_home?: number;
  is_first_time_merchant?: boolean;
  is_failed_attempt_prior?: boolean;
  user_id?: string;
}

export interface AnalyzeResponse {
  transaction_id: string;
  risk_score: number;
  risk_level: RiskLevel;
  decision: DecisionType;
  fraud_probability: number;
  anomaly_score: number;
  confidence_score: number;
  model_version: string;
  prediction_time_ms: number;
  breakdown: {
    supervised_component: number;
    anomaly_component: number;
    behavioral_component: number;
  };
  top_risk_factors: ShapContribution[];
  triggered_rules: TriggeredRule[];
  recommended_actions: string[];
}

export interface BatchAnalysisResult {
  total_processed: number;
  approved_count: number;
  review_count: number;
  blocked_count: number;
  total_fraud_detected: number;
  total_amount_at_risk: number;
  avg_latency_ms: number;
  results: {
    row_index: number;
    transaction_id: string;
    amount: number;
    decision: DecisionType;
    risk_score: number;
    risk_level: RiskLevel;
    fraud_probability: number;
    anomaly_score: number;
    top_factors: string[];
    triggered_rules: string[];
  }[];
}

// Models & MLOps
export interface ModelVersion {
  id: number;
  model_name: string;
  model_version: string;
  algorithm: string;
  is_champion: boolean;
  is_active: boolean;
  f1_score?: number | null;
  roc_auc?: number | null;
  pr_auc?: number | null;
  precision?: number | null;
  recall?: number | null;
  accuracy?: number | null;
  optimal_threshold?: number | null;
  inference_latency_p95_ms?: number | null;
  training_sample_count?: number | null;
  created_at: string;
  parameters?: Record<string, any>;
  confusion_matrix?: {
    tn: number;
    fp: number;
    fn: number;
    tp: number;
  };
}

export interface ModelComparison {
  models: ModelVersion[];
  champion_version: string;
}

// Monitoring & Drift
export interface PSICalculation {
  feature_name: string;
  psi_value: number;
  drift_status: 'STABLE' | 'MODERATE_DRIFT' | 'SEVERE_DRIFT';
  baseline_mean: number;
  current_mean: number;
}

export interface MonitoringTelemetry {
  uptime_seconds: number;
  total_inferences: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  active_model: string;
  memory_usage_mb: number;
  cpu_percent: number;
  features_monitored: number;
  drift_detected_count: number;
  feature_psi_scores: PSICalculation[];
  drift_metrics?: {
    feature_name: string;
    baseline_mean: number;
    current_mean: number;
    psi_score: number;
    drift_status?: string;
  }[];
  recent_prediction_distribution: {
    APPROVE: number;
    REVIEW: number;
    BLOCK: number;
  };
}

// Dataset Catalog
export interface DatasetCatalogItem {
  id: number;
  name: string;
  description: string;
  dataset_type: string;
  row_count: number;
  feature_count: number;
  fraud_rate: number;
  file_size_mb: number;
  created_at: string;
}

export interface DatasetFeatureStat {
  name: string;
  type: string;
  null_pct: number;
  min: number;
  max: number;
  mean: number;
  std: number;
  distinct_values: number;
}

export interface DatasetProfile {
  dataset: DatasetCatalogItem;
  feature_stats: DatasetFeatureStat[];
  correlations_with_target: { feature: string; correlation: number }[];
}

// Copilot
export interface CopilotMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: string[];
  suggested_followups?: string[];
}

// Admin
export interface AdminUser {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  last_login?: string | null;
}

export interface AuditLog {
  id: number;
  user_email: string;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  details?: Record<string, any> | null;
  ip_address?: string | null;
  timestamp: string;
}

export interface AdminStats {
  total_users: number;
  active_users: number;
  admin_count: number;
  analyst_count: number;
  user_count: number;
  total_audit_logs: number;
  database_size_bytes: number;
}
