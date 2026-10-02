import React, { useState, useEffect } from 'react';
import { monitoringApi } from '../api/client';
import { PageHeader } from '../components/common/PageHeader';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import type { MonitoringTelemetry } from '../types';
import {
  Activity,
  Zap,
  Server,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Clock,
  Cpu,
  Layers,
  ShieldAlert,
} from 'lucide-react';
import { formatNumber } from '../utils/formatters';

export const MonitoringPage: React.FC = () => {
  const [data, setData] = useState<MonitoringTelemetry | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchTelemetry = async () => {
    setLoading(true);
    try {
      const res = await monitoringApi.getTelemetry();
      setData(res);
    } catch (err) {
      console.error('Failed to load telemetry', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await monitoringApi.getTelemetry();
        if (!isMounted) return;
        setData(res);
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to load telemetry', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRecalculateDrift = async () => {
    setRecalculating(true);
    setMessage(null);
    try {
      const res = await monitoringApi.triggerDriftCheck();
      setMessage(res.message);
      fetchTelemetry();
    } catch (err: any) {
      setMessage(err.response?.data?.detail || 'Failed to trigger drift check.');
    } finally {
      setRecalculating(false);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading monitoring data…" size="lg" />;
  }

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Model Monitoring"
        subtitle="Track real-time inference latency, system telemetry, and statistical feature drift."
        actions={
          <button
            onClick={handleRecalculateDrift}
            disabled={recalculating}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1b4332] hover:bg-[#143326] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${recalculating ? 'animate-spin' : ''}`} />
            <span>{recalculating ? 'Calculating drift...' : 'Run drift check'}</span>
          </button>
        }
      />

      {message && (
        <div className="flex items-center gap-2 rounded-xl border border-[#cde2d6] dark:border-[#234e3e] bg-[#ebf3ef] dark:bg-[#1a382c] px-4 py-3 text-xs font-medium text-[#164e3f] dark:text-[#a7f3d0] shadow-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#164e3f] dark:text-[#a7f3d0]" />
          <span>{message}</span>
        </div>
      )}

      {/* Latency & Telemetry KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#78716c] dark:text-[#9ca3af] mb-2">
            <span className="font-medium">Inference Latency</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ebf3ef] dark:bg-[#1f2b24] text-[#1b4332] dark:text-[#a7f3d0]">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <span className="text-2xl font-bold font-numeric tracking-tight text-[#191c1d] dark:text-[#f3f4f6]">
            {data?.avg_latency_ms != null ? `${data.avg_latency_ms.toFixed(2)} ms` : '—'}
          </span>
          <div className="mt-2 text-[11px] text-[#78716c] dark:text-[#9ca3af]">
            P95: {data?.p95_latency_ms != null ? `${data.p95_latency_ms.toFixed(1)}ms` : '—'} • P99:{' '}
            {data?.p99_latency_ms != null ? `${data.p99_latency_ms.toFixed(1)}ms` : '—'}
          </div>
        </div>

        <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#78716c] dark:text-[#9ca3af] mb-2">
            <span className="font-medium">Total Inferences</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ebf3ef] dark:bg-[#1f2b24] text-[#1b4332] dark:text-[#a7f3d0]">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <span className="text-2xl font-bold font-numeric tracking-tight text-[#191c1d] dark:text-[#f3f4f6]">
            {formatNumber(data?.total_inferences ?? 0)}
          </span>
          <div className="mt-2 text-[11px] text-[#78716c] dark:text-[#9ca3af]">Active production instance</div>
        </div>

        <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#78716c] dark:text-[#9ca3af] mb-2">
            <span className="font-medium">Memory Usage</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ebf3ef] dark:bg-[#1f2b24] text-[#1b4332] dark:text-[#a7f3d0]">
              <Server className="h-4 w-4" />
            </div>
          </div>
          <span className="text-2xl font-bold font-numeric tracking-tight text-[#191c1d] dark:text-[#f3f4f6]">
            {data?.memory_usage_mb != null ? `${data.memory_usage_mb.toFixed(1)} MB` : '—'}
          </span>
          <div className="mt-2 text-[11px] text-[#78716c] dark:text-[#9ca3af]">
            CPU: {data?.cpu_percent != null ? `${data.cpu_percent.toFixed(1)}%` : '—'}
          </div>
        </div>

        <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#78716c] dark:text-[#9ca3af] mb-2">
            <span className="font-medium">Monitored Features</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ebf3ef] dark:bg-[#1f2b24] text-[#1b4332] dark:text-[#a7f3d0]">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <span className="text-2xl font-bold font-numeric tracking-tight text-[#191c1d] dark:text-[#f3f4f6]">
            {data?.features_monitored ?? 0}
          </span>
          <div className="mt-2 text-[11px] text-[#78716c] dark:text-[#9ca3af]">
            Uptime: {data?.uptime_seconds != null ? formatUptime(data.uptime_seconds) : '—'}
          </div>
        </div>
      </div>

      {/* Live Decision Distribution Breakdown */}
      {data?.recent_prediction_distribution && (
        <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif text-base font-semibold text-[#191c1d] dark:text-[#f3f4f6]">
                Decision Distribution
              </h3>
              <p className="text-xs text-[#78716c] dark:text-[#9ca3af] mt-0.5">
                Breakdown of real-time classification decisions across recent transactions.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-[#cde2d6] dark:border-[#234e3e] bg-[#faf9f5] dark:bg-[#121614] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#164e3f] dark:text-[#a7f3d0]">
                  Approved
                </span>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
              </div>
              <div className="text-2xl font-bold font-numeric text-[#191c1d] dark:text-[#f3f4f6] mt-2">
                {formatNumber(data.recent_prediction_distribution.APPROVE || 0)}
              </div>
              <div className="text-[11px] text-[#78716c] dark:text-[#9ca3af] mt-1">Risk score &lt; 40</div>
            </div>

            <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-[#faf9f5] dark:bg-[#121614] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Under Review
                </span>
                <span className="h-2 w-2 rounded-full bg-amber-500" />
              </div>
              <div className="text-2xl font-bold font-numeric text-[#191c1d] dark:text-[#f3f4f6] mt-2">
                {formatNumber(data.recent_prediction_distribution.REVIEW || 0)}
              </div>
              <div className="text-[11px] text-[#78716c] dark:text-[#9ca3af] mt-1">Risk score 40–74</div>
            </div>

            <div className="rounded-xl border border-rose-200 dark:border-rose-900/40 bg-[#faf9f5] dark:bg-[#121614] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                  Blocked
                </span>
                <span className="h-2 w-2 rounded-full bg-rose-500" />
              </div>
              <div className="text-2xl font-bold font-numeric text-[#191c1d] dark:text-[#f3f4f6] mt-2">
                {formatNumber(data.recent_prediction_distribution.BLOCK || 0)}
              </div>
              <div className="text-[11px] text-[#78716c] dark:text-[#9ca3af] mt-1">Risk score &ge; 75</div>
            </div>
          </div>
        </div>
      )}

      {/* Feature PSI Drift Table */}
      <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] overflow-hidden shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#141816] px-5 py-4 gap-2">
          <div>
            <h3 className="font-serif text-base font-semibold text-[#191c1d] dark:text-[#f3f4f6]">
              Feature Drift (PSI)
            </h3>
            <p className="text-xs text-[#78716c] dark:text-[#9ca3af] mt-0.5">
              Population Stability Index: PSI &lt; 0.10: Stable · 0.10–0.25: Moderate shift · &gt; 0.25: Severe drift
            </p>
          </div>
          <span className="inline-flex items-center rounded-lg border border-[#cde2d6] dark:border-[#234e3e] bg-[#ebf3ef] dark:bg-[#1a382c] px-3 py-1 text-xs font-semibold text-[#164e3f] dark:text-[#a7f3d0] self-start sm:self-auto">
            {data?.drift_detected_count || 0} drifting features
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5]/60 dark:bg-[#141816]/60 text-[#78716c] dark:text-[#9ca3af]">
              <tr>
                <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[11px]">Feature</th>
                <th className="px-5 py-3 text-right font-semibold uppercase tracking-wider text-[11px]">Baseline mean</th>
                <th className="px-5 py-3 text-right font-semibold uppercase tracking-wider text-[11px]">Current mean</th>
                <th className="px-5 py-3 text-right font-semibold uppercase tracking-wider text-[11px]">PSI score</th>
                <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[11px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8e6df] dark:divide-[#272d29]">
              {(data?.feature_psi_scores || []).map((m) => {
                const isSevere = m.psi_value >= 0.25 || m.drift_status === 'SEVERE_DRIFT';
                const isModerate =
                  (m.psi_value >= 0.1 && m.psi_value < 0.25) || m.drift_status === 'MODERATE_DRIFT';

                return (
                  <tr key={m.feature_name} className="hover:bg-[#faf9f5] dark:hover:bg-[#1f2522] transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs font-medium text-[#191c1d] dark:text-[#f3f4f6]">
                      {m.feature_name}
                    </td>
                    <td className="px-5 py-3.5 text-right text-[#78716c] dark:text-[#9ca3af] font-numeric">
                      {m.baseline_mean.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-[#191c1d] dark:text-[#f3f4f6] font-numeric">
                      {m.current_mean.toFixed(2)}
                    </td>
                    <td
                      className={`px-5 py-3.5 text-right font-bold font-numeric ${
                        isSevere
                          ? 'text-rose-600 dark:text-rose-400'
                          : isModerate
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-[#164e3f] dark:text-[#a7f3d0]'
                      }`}
                    >
                      {m.psi_value.toFixed(4)}
                    </td>
                    <td className="px-5 py-3.5">
                      {isSevere ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 px-2.5 py-0.5 text-[11px] text-rose-700 dark:text-rose-300 font-semibold">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Severe drift</span>
                        </span>
                      ) : isModerate ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 px-2.5 py-0.5 text-[11px] text-amber-700 dark:text-amber-300 font-semibold">
                          <span>Moderate shift</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#ebf3ef] dark:bg-[#1a382c] border border-[#cde2d6] dark:border-[#234e3e] px-2.5 py-0.5 text-[11px] text-[#164e3f] dark:text-[#a7f3d0] font-semibold">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Stable</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
