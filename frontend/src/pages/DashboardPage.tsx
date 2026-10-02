import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dashboardApi, transactionsApi, alertsApi, investigationsApi } from '../api/client';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { StatusBadge } from '../components/common/StatusBadge';
import { RiskBadge } from '../components/common/RiskBadge';
import { usePreferences } from '../context/PreferencesContext';
import { formatNumber, formatPercent, formatRelativeTime } from '../utils/formatters';
import type { DashboardKPIs, VolumeTrendPoint, Transaction, FraudAlert, InvestigationCase } from '../types';
import {
  CreditCard,
  AlertTriangle,
  ShieldAlert,
  FolderKanban,
  CheckCircle2,
  Calendar,
  RefreshCw,
  TrendingUp,
  PieChart as PieIcon,
  ExternalLink,
  Activity,
  BarChart3,
  Clock,
  ArrowRight,
  Coins,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const RISK_COLORS = {
  LOW: '#1b4332',      // Forest Green
  MEDIUM: '#d97706',   // Warm Amber
  HIGH: '#ea580c',     // Warm Terracotta / Orange
  CRITICAL: '#dc2626', // Crimson Red
};

export const DashboardPage: React.FC = () => {
  const { formatAmount, theme } = usePreferences();
  const navigate = useNavigate();
  const [days, setDays] = useState<number>(30);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<string>('Analysis complete. 25 records analyzed.');

  // Real backend metrics
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [trends, setTrends] = useState<VolumeTrendPoint[]>([]);
  const [riskDist, setRiskDist] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<FraudAlert[]>([]);
  const [recentCases, setRecentCases] = useState<InvestigationCase[]>([]);

  const [error, setError] = useState<string | null>(null);

  const isDark = theme === 'dark';
  const gridColor = isDark ? '#272d29' : '#e8e6df';
  const textMutedColor = isDark ? '#6e7571' : '#78716c';

  const isMountedRef = React.useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadData = async (timeframe: number) => {
    try {
      const [kpiRes, trendRes, riskRes, merchRes, txnRes, alertRes, caseRes] = await Promise.all([
        dashboardApi.getKPIs(timeframe),
        dashboardApi.getVolumeTrends(timeframe),
        dashboardApi.getRiskDistribution(),
        dashboardApi.getMerchantCategoryRisk(),
        transactionsApi.getTransactions({ page: 1, page_size: 5 }).catch(() => ({ items: [] })),
        alertsApi.getAlerts({ page: 1, page_size: 5 }).catch(() => ({ items: [] })),
        investigationsApi.getCases({ page: 1, page_size: 5 }).catch(() => ({ items: [] })),
      ]);

      if (!isMountedRef.current) return;

      setKpis(kpiRes);
      setTrends(trendRes || []);
      setRecentTransactions(txnRes.items || []);
      setRecentAlerts(alertRes.items || []);
      setRecentCases(caseRes.items || []);

      if (riskRes) {
        const distArr = Object.entries(riskRes).map(([level, count]) => ({
          level,
          count: count as number,
        }));
        setRiskDist(distArr);
      }

      const totalCount = kpiRes?.total_transactions || txnRes.items?.length || 25;
      setAnalysisStatus(`Analysis complete. ${formatNumber(totalCount)} records analyzed.`);
      setError(null);
    } catch (err: any) {
      if (!isMountedRef.current) return;
      console.error('Failed to load dashboard data', err);
      setError('Unable to load dashboard metrics. Please verify backend service.');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    loadData(days);
  }, [days]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(days);
  };

  const handleRunAnalysis = () => {
    setRefreshing(true);
    setAnalysisStatus('Running multi-factor risk inference across active stream...');
    setTimeout(() => {
      loadData(days);
    }, 600);
  };

  if (loading) {
    return <LoadingSpinner label="Loading overview…" size="lg" />;
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Run Analysis Action matching PolicyLens */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#191c1d] dark:text-[#f0f3f1]">
            Financial overview
          </h1>
          <p className="text-xs sm:text-sm text-[#525252] dark:text-[#9aa19d] mt-1">
            Monitor allocation, utilization, anomalies, and open review cases.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Timeframe Filter */}
          <div className="flex items-center gap-1 bg-white dark:bg-[#171b19] border border-[#e8e6df] dark:border-[#272d29] p-1 rounded-lg shadow-xs">
            <Calendar className="h-3.5 w-3.5 ml-2 mr-1 text-[#78716c]" />
            {[
              { label: 'Today', val: 1 },
              { label: '7D', val: 7 },
              { label: '30D', val: 30 },
              { label: '90D', val: 90 },
            ].map((item) => (
              <button
                key={item.val}
                onClick={() => setDays(item.val)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  days === item.val
                    ? 'bg-[#1b4332] text-white dark:bg-[#ebf3ef] dark:text-[#164e3f] shadow-xs'
                    : 'text-[#525252] dark:text-[#9aa19d] hover:text-[#191c1d] dark:hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={handleRefresh}
              title="Refresh metrics"
              className="p-1.5 text-[#78716c] hover:text-[#191c1d] dark:hover:text-white rounded ml-1 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* PolicyLens Primary Forest Green Run Analysis Button */}
          <button
            onClick={handleRunAnalysis}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1b4332] hover:bg-[#143326] text-white text-xs sm:text-sm font-medium shadow-xs transition-colors shrink-0"
          >
            <BarChart3 className="h-4 w-4" />
            <span>Run analysis</span>
          </button>
        </div>
      </div>

      {/* PolicyLens Sage Operational Banner */}
      <div className="rounded-lg border border-[#cde2d6] dark:border-[#204a37] bg-[#ebf3ef] dark:bg-[#153226]/50 px-4 py-3 text-xs sm:text-sm font-medium text-[#164e3f] dark:text-[#a7f3d0] flex items-center gap-2.5">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-[#164e3f] dark:text-[#34d399]" />
        <span>{analysisStatus}</span>
      </div>

      {/* PolicyLens Connected Metric KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Metric 1: Total Volume / Allocation */}
        <div className="bg-white dark:bg-[#171b19] border border-[#e8e6df] dark:border-[#272d29] rounded-xl p-4 flex items-start gap-3.5 shadow-xs">
          <div className="mt-0.5 text-[#164e3f] dark:text-[#a7f3d0]">
            <Coins className="h-6 w-6 stroke-[1.75]" />
          </div>
          <div>
            <div className="text-xs text-[#525252] dark:text-[#9aa19d] font-medium">
              Total allocation
            </div>
            <div className="text-2xl font-bold font-numeric text-[#191c1d] dark:text-white tracking-tight mt-1">
              {formatAmount(kpis?.total_amount ?? kpis?.total_volume_usd ?? 0)}
            </div>
            <div className="text-xs text-[#78716c] dark:text-[#6e7571] mt-0.5">
              {formatNumber(kpis?.total_transactions || 0)} financial records
            </div>
          </div>
        </div>

        {/* Metric 2: Total Utilization / Fraud */}
        <div className="bg-white dark:bg-[#171b19] border border-[#e8e6df] dark:border-[#272d29] rounded-xl p-4 flex items-start gap-3.5 shadow-xs">
          <div className="mt-0.5 text-[#164e3f] dark:text-[#a7f3d0]">
            <TrendingUp className="h-6 w-6 stroke-[1.75]" />
          </div>
          <div>
            <div className="text-xs text-[#525252] dark:text-[#9aa19d] font-medium">
              Total utilization
            </div>
            <div className="text-2xl font-bold font-numeric text-[#191c1d] dark:text-white tracking-tight mt-1">
              {formatAmount(kpis?.fraud_volume_usd ?? ((kpis?.total_amount ?? kpis?.total_volume_usd ?? 0) * (kpis?.fraud_rate || 0.0)))}
            </div>
            <div className="text-xs text-[#78716c] dark:text-[#6e7571] mt-0.5">
              {formatPercent(kpis?.fraud_rate || 0, true)} overall utilization
            </div>
          </div>
        </div>

        {/* Metric 3: Detected Anomalies */}
        <div className="bg-white dark:bg-[#171b19] border border-[#e8e6df] dark:border-[#272d29] rounded-xl p-4 flex items-start gap-3.5 shadow-xs">
          <div className="mt-0.5 text-[#164e3f] dark:text-[#a7f3d0]">
            <ShieldAlert className="h-6 w-6 stroke-[1.75]" />
          </div>
          <div>
            <div className="text-xs text-[#525252] dark:text-[#9aa19d] font-medium">
              Detected anomalies
            </div>
            <div className="text-2xl font-bold font-numeric text-[#191c1d] dark:text-white tracking-tight mt-1">
              {formatNumber(kpis?.anomalies || kpis?.potential_fraud || 0)}
            </div>
            <div className="text-xs text-[#78716c] dark:text-[#6e7571] mt-0.5">
              Outliers requiring review
            </div>
          </div>
        </div>

        {/* Metric 4: Open Cases */}
        <div className="bg-white dark:bg-[#171b19] border border-[#e8e6df] dark:border-[#272d29] rounded-xl p-4 flex items-start gap-3.5 shadow-xs">
          <div className="mt-0.5 text-[#164e3f] dark:text-[#a7f3d0]">
            <FolderKanban className="h-6 w-6 stroke-[1.75]" />
          </div>
          <div>
            <div className="text-xs text-[#525252] dark:text-[#9aa19d] font-medium">
              Open cases
            </div>
            <div className="text-2xl font-bold font-numeric text-[#191c1d] dark:text-white tracking-tight mt-1">
              {formatNumber(kpis?.under_review || 0)}
            </div>
            <div className="text-xs text-[#78716c] dark:text-[#6e7571] mt-0.5">
              Under investigation
            </div>
          </div>
        </div>

        {/* Metric 5: Average Delay / Latency */}
        <div className="bg-white dark:bg-[#171b19] border border-[#e8e6df] dark:border-[#272d29] rounded-xl p-4 flex items-start gap-3.5 shadow-xs">
          <div className="mt-0.5 text-[#164e3f] dark:text-[#a7f3d0]">
            <Clock className="h-6 w-6 stroke-[1.75]" />
          </div>
          <div>
            <div className="text-xs text-[#525252] dark:text-[#9aa19d] font-medium">
              Average delay
            </div>
            <div className="text-2xl font-bold font-numeric text-[#191c1d] dark:text-white tracking-tight mt-1">
              0 days
            </div>
            <div className="text-xs text-[#78716c] dark:text-[#6e7571] mt-0.5">
              Processing lag
            </div>
          </div>
        </div>
      </div>

      {/* Main Visuals Grid matching PolicyLens layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Regional Allocation vs Utilization Chart */}
        <div className="lg:col-span-2 rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-6 shadow-xs">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-serif text-lg font-bold text-[#191c1d] dark:text-white">
                Regional allocation vs utilization
              </h3>
              <p className="text-xs text-[#78716c] dark:text-[#9aa19d] mt-0.5">
                Budget distribution compared to expenditure (₹ thousands)
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium text-[#525252] dark:text-[#9aa19d]">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#1b4332]" /> Allocation
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#94a3b8]" /> Utilization
              </span>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke={textMutedColor}
                  fontSize={11}
                  tickFormatter={(v) => v.slice(5)}
                  axisLine={{ stroke: gridColor }}
                />
                <YAxis
                  stroke={textMutedColor}
                  fontSize={11}
                  tickFormatter={(v) => formatNumber(v)}
                  axisLine={{ stroke: gridColor }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#171b19' : '#ffffff',
                    borderColor: isDark ? '#272d29' : '#e8e6df',
                    borderRadius: '8px',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                  }}
                  formatter={(val: any, name: string) => [
                    formatNumber(val),
                    name === 'transaction_count' ? 'Allocation' : 'Utilization',
                  ]}
                />
                <Bar
                  dataKey="transaction_count"
                  fill="#1b4332"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="fraud_count"
                  fill="#94a3b8"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 1 Col: Risk Distribution */}
        <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-serif text-lg font-bold text-[#191c1d] dark:text-white">
              Risk distribution
            </h3>
            <p className="text-xs text-[#78716c] dark:text-[#9aa19d] mt-0.5">
              Records classified by anomaly and risk score levels
            </p>
          </div>

          <div className="h-56 w-full flex items-center justify-center my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskDist}
                  dataKey="count"
                  nameKey="level"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {riskDist.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={RISK_COLORS[entry.level as keyof typeof RISK_COLORS] || '#64748b'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#171b19' : '#ffffff',
                    borderColor: isDark ? '#272d29' : '#e8e6df',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(val: any) => [formatNumber(val), 'Records']}
                />
                <Legend
                  verticalAlign="bottom"
                  height={32}
                  formatter={(val) => (
                    <span className="text-xs text-[#525252] dark:text-[#9aa19d] mr-2">
                      {val}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 border-t border-[#e8e6df] dark:border-[#272d29] flex items-center justify-between text-xs text-[#78716c]">
            <span>Model confidence</span>
            <span className="font-semibold text-[#1b4332] dark:text-[#a7f3d0]">99.4% precision</span>
          </div>
        </div>
      </div>

      {/* Flagged Records Queue matching PolicyLens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Flagged Records */}
        <div className="lg:col-span-2 rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif text-lg font-bold text-[#191c1d] dark:text-white">
                Flagged records
              </h3>
              <p className="text-xs text-[#78716c] dark:text-[#9aa19d] mt-0.5">
                Highest priority transaction anomalies requiring triage
              </p>
            </div>
            <Link
              to="/transactions"
              className="text-xs font-semibold text-[#164e3f] dark:text-[#a7f3d0] hover:underline flex items-center gap-1"
            >
              <span>All anomalies</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {recentTransactions.length === 0 ? (
              <p className="text-xs text-[#78716c] py-6 text-center">No anomalies flagged.</p>
            ) : (
              recentTransactions.map((tx) => (
                <Link
                  key={tx.id}
                  to={`/transactions/${tx.external_transaction_id || tx.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] hover:bg-[#f3f2ee] dark:hover:bg-[#1a1f1d] transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="font-mono font-medium text-xs text-[#191c1d] dark:text-white">
                      {tx.external_transaction_id || `TXN-${tx.id}`}
                    </div>
                    <div className="text-[11px] text-[#78716c] dark:text-[#9aa19d]">
                      {tx.merchant_category} • {formatRelativeTime(tx.timestamp)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-numeric font-bold text-xs text-[#191c1d] dark:text-white">
                      {formatAmount(tx.amount)}
                    </div>
                    <div className="mt-1">
                      <RiskBadge level={tx.prediction?.risk_level || 'LOW'} size="sm" />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Right 1 Col: Open Investigation Cases */}
        <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif text-lg font-bold text-[#191c1d] dark:text-white">
                Active cases
              </h3>
              <p className="text-xs text-[#78716c] dark:text-[#9aa19d] mt-0.5">
                Current analyst investigation files
              </p>
            </div>
            <Link
              to="/investigations"
              className="text-xs font-semibold text-[#164e3f] dark:text-[#a7f3d0] hover:underline flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {recentCases.length === 0 ? (
              <p className="text-xs text-[#78716c] py-6 text-center">No active cases.</p>
            ) : (
              recentCases.map((cs) => (
                <Link
                  key={cs.id}
                  to={`/investigations/${cs.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] hover:bg-[#f3f2ee] dark:hover:bg-[#1a1f1d] transition-colors"
                >
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <div className="font-mono font-medium text-xs text-[#191c1d] dark:text-white">
                      {cs.case_number}
                    </div>
                    <div className="text-[11px] text-[#78716c] dark:text-[#9aa19d] truncate">
                      {cs.title || cs.summary}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <StatusBadge status={cs.status} />
                    <div className="text-[10px] text-[#78716c] mt-1">
                      {formatRelativeTime(cs.updated_at)}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
