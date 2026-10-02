import React, { useState, useEffect } from 'react';
import { dashboardApi } from '../api/client';
import { PageHeader } from '../components/common/PageHeader';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { usePreferences } from '../context/PreferencesContext';
import { formatNumber, formatPercent } from '../utils/formatters';
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
import {
  TrendingUp,
  Globe,
  PieChart as PieIcon,
  Calendar,
  RefreshCw,
} from 'lucide-react';

const RISK_COLORS = {
  LOW: '#1b4332',      // Forest Green
  MEDIUM: '#d97706',   // Warm Amber
  HIGH: '#ea580c',     // Warm Terracotta
  CRITICAL: '#dc2626', // Crimson Red
};

export const AnalyticsPage: React.FC = () => {
  const { formatAmount, theme } = usePreferences();
  const [days, setDays] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [trends, setTrends] = useState<any[]>([]);
  const [geography, setGeography] = useState<any[]>([]);
  const [riskDist, setRiskDist] = useState<any[]>([]);

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

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const [trendRes, geoRes, riskRes] = await Promise.all([
        dashboardApi.getVolumeTrends(days),
        dashboardApi.getGeoRisk(),
        dashboardApi.getRiskDistribution(),
      ]);

      if (!isMountedRef.current) return;

      setTrends(trendRes || []);
      setGeography(geoRes || []);

      if (riskRes) {
        const distArr = Object.entries(riskRes).map(([level, count]) => ({
          level,
          count: count as number,
        }));
        setRiskDist(distArr);
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      console.error('Failed to load analytics data:', err);
      setError(err?.message || 'Unable to query analytics data from server.');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Risk Insights"
          subtitle="Portfolio-level risk distribution, geographic concentrations, and fraud trajectory."
        />

        {/* Timeframe Filter Bar */}
        <div className="flex items-center gap-2 bg-white dark:bg-[#171b19] border border-[#e8e6df] dark:border-[#272d29] p-1 rounded-xl self-start sm:self-auto shadow-xs">
          <Calendar className="h-4 w-4 ml-2 text-[#78716c]" />
          {[
            { label: '7 Days', val: 7 },
            { label: '30 Days', val: 30 },
            { label: '90 Days', val: 90 },
          ].map((item) => (
            <button
              key={item.val}
              onClick={() => setDays(item.val)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                days === item.val
                  ? 'bg-[#1b4332] text-white dark:bg-[#ebf3ef] dark:text-[#164e3f] shadow-xs'
                  : 'text-[#525252] dark:text-[#9aa19d] hover:text-[#191c1d] dark:hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            onClick={fetchAnalytics}
            title="Refresh analytics"
            className="p-1.5 text-[#78716c] hover:text-[#191c1d] dark:hover:text-white rounded"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading analytics…" size="lg" />
      ) : error ? (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 p-6 text-center text-rose-700 dark:text-rose-400 text-sm">
          <p>{error}</p>
          <button
            onClick={fetchAnalytics}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#1b4332] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      ) : (
        <>
          {/* Main Trend: Volume vs Fraud Exposure */}
          <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#191c1d] dark:text-white flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#164e3f] dark:text-[#a7f3d0]" />
                  <span>Transaction volume and flagged fraud</span>
                </h3>
                <p className="text-xs text-[#78716c] dark:text-[#9aa19d] mt-0.5">
                  Daily transaction volume and flagged fraud over the last {days} days.
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium">
                <span className="flex items-center gap-1.5 text-[#525252] dark:text-[#9aa19d]">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#1b4332]" /> Total volume
                </span>
                <span className="flex items-center gap-1.5 text-[#525252] dark:text-[#9aa19d]">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-600" /> Flagged fraud
                </span>
              </div>
            </div>

            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
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
                    }}
                    formatter={(val: any, name: string) => [
                      formatNumber(val),
                      name === 'transaction_count' ? 'Total Transactions' : 'Fraud Count',
                    ]}
                  />
                  <Bar dataKey="transaction_count" fill="#1b4332" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="fraud_count" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Grid: Risk Distribution + Geographic Exposure */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Risk Distribution Breakdown */}
            <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-6 shadow-xs">
              <div className="mb-4">
                <h3 className="font-serif text-lg font-bold text-[#191c1d] dark:text-white flex items-center gap-2">
                  <PieIcon className="h-4 w-4 text-[#164e3f] dark:text-[#a7f3d0]" />
                  <span>Risk distribution</span>
                </h3>
                <p className="text-xs text-[#78716c] dark:text-[#9aa19d] mt-0.5">
                  Transactions grouped by evaluated risk tier.
                </p>
              </div>

              <div className="h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskDist}
                      dataKey="count"
                      nameKey="level"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={4}
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
                      formatter={(val: any) => [formatNumber(val), 'Transactions']}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value) => (
                        <span className="text-xs text-[#525252] dark:text-[#9aa19d] mr-2">
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Geographic Breakdown */}
            <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-6 shadow-xs">
              <div className="mb-4">
                <h3 className="font-serif text-lg font-bold text-[#191c1d] dark:text-white flex items-center gap-2">
                  <Globe className="h-4 w-4 text-[#164e3f] dark:text-[#a7f3d0]" />
                  <span>Geographic breakdown</span>
                </h3>
                <p className="text-xs text-[#78716c] dark:text-[#9aa19d] mt-0.5">
                  Transaction volume and fraud rate by location.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#e8e6df] dark:border-[#272d29] text-[#525252] dark:text-[#9aa19d] text-xs font-semibold">
                    <tr>
                      <th className="pb-3 font-semibold">Location</th>
                      <th className="pb-3 text-right font-semibold">Volume</th>
                      <th className="pb-3 text-right font-semibold">Fraud rate</th>
                      <th className="pb-3 text-right font-semibold">Avg risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e8e6df] dark:divide-[#272d29]">
                    {geography.slice(0, 5).map((geo, idx) => (
                      <tr key={idx} className="hover:bg-[#faf9f5] dark:hover:bg-[#1f2422]">
                        <td className="py-2.5 font-medium text-[#191c1d] dark:text-white">
                          {geo.location}, {geo.country}
                        </td>
                        <td className="py-2.5 text-right text-[#525252] dark:text-[#9aa19d] font-numeric">
                          {formatNumber(geo.total)}
                        </td>
                        <td className="py-2.5 text-right font-bold text-rose-600 font-numeric">
                          {formatPercent(geo.fraud_rate, false)}
                        </td>
                        <td className="py-2.5 text-right text-[#191c1d] dark:text-white font-numeric font-semibold">
                          {geo.avg_risk ? geo.avg_risk.toFixed(1) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
