import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { alertsApi } from '../api/client';
import { PageHeader } from '../components/common/PageHeader';
import { RiskBadge } from '../components/common/RiskBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { formatNumber, formatDateTime } from '../utils/formatters';
import type { FraudAlert, AlertListResponse } from '../types';
import {
  AlertTriangle,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  X,
  Edit3,
  ShieldAlert,
} from 'lucide-react';

export const AlertsPage: React.FC = () => {
  const [data, setData] = useState<AlertListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [search, setSearch] = useState('');

  // Triage update modal
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);
  const [newStatus, setNewStatus] = useState<string>('UNDER_REVIEW');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isMountedRef = React.useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    setAuthError(false);
    try {
      const res = await alertsApi.getAlerts({
        page,
        page_size: 15,
        status: statusFilter || undefined,
        severity: severityFilter || undefined,
        search: search || undefined,
      });
      if (!isMountedRef.current) return;
      setData(res);
    } catch (err: any) {
      if (!isMountedRef.current) return;
      if (err?.response?.status === 403) {
        setAuthError(true);
      } else {
        console.error('Failed to load alerts', err);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [page, statusFilter, severityFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAlerts();
  };

  const handleOpenTriage = (alert: FraudAlert) => {
    setSelectedAlert(alert);
    setNewStatus(alert.status);
    setNotes(alert.notes || '');
  };

  const handleSaveTriage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlert) return;
    setSubmitting(true);
    try {
      await alertsApi.updateAlertStatus(selectedAlert.id, {
        status: newStatus,
        notes: notes || undefined,
      });
      setSelectedAlert(null);
      fetchAlerts();
    } catch (err) {
      console.error('Failed to update alert', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alert queue"
        subtitle="Review, triage, and escalate automated fraud alerts and policy violations."
      />

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-4 shadow-xs">
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8a8a86]" />
            <input
              type="text"
              placeholder="Search by Alert ID, Trigger Reason, or Customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] pl-9 pr-3 py-2 text-xs text-[#191c1d] dark:text-[#f0f3f1] placeholder-[#8a8a86] focus:border-[#1b4332] dark:focus:border-[#a7f3d0] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] px-3 py-2 text-xs text-[#191c1d] dark:text-[#f0f3f1] focus:border-[#1b4332] dark:focus:border-[#a7f3d0] focus:outline-none transition-colors"
            >
              <option value="">All statuses</option>
              <option value="NEW">New</option>
              <option value="UNDER_REVIEW">Under review</option>
              <option value="RESOLVED">Resolved</option>
              <option value="FALSE_POSITIVE">False positive</option>
            </select>
          </div>

          <div>
            <select
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] px-3 py-2 text-xs text-[#191c1d] dark:text-[#f0f3f1] focus:border-[#1b4332] dark:focus:border-[#a7f3d0] focus:outline-none transition-colors"
            >
              <option value="">All severities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
        </form>
      </div>

      {/* Alerts Table or Access Restricted Banner */}
      {authError ? (
        <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-8 text-center shadow-xs">
          <ShieldAlert className="h-8 w-8 text-[#164e3f] mx-auto mb-2" />
          <h3 className="font-serif text-base font-bold text-[#191c1d] dark:text-white">Analyst Access Required</h3>
          <p className="text-xs text-[#78716c] dark:text-[#9aa19d] mt-1 max-w-md mx-auto">
            The alert triage queue is restricted to certified Fraud Analysts and Administrators.
            Sign in as analyst@fraudguard.ai or request a role elevation from an administrator.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] overflow-hidden shadow-xs">
          {loading ? (
            <LoadingSpinner label="Loading alerts…" size="md" />
          ) : !data || data.items.length === 0 ? (
            <EmptyState
              title="No Alerts Found"
              description="There are currently no alerts matching your criteria."
              icon={AlertTriangle}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] text-[#525252] dark:text-[#9aa19d] text-xs font-semibold">
                  <tr>
                    <th className="px-4 py-3">Alert ID</th>
                    <th className="px-4 py-3">Trigger reason</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Risk score</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e6df] dark:divide-[#272d29]">
                  {data.items.map((alert) => (
                    <tr key={alert.id} className="hover:bg-[#faf9f5] dark:hover:bg-[#1f2422] transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-[#191c1d] dark:text-slate-200 whitespace-nowrap">
                        {alert.alert_id}
                      </td>
                      <td className="px-4 py-3 text-[#191c1d] dark:text-slate-300 font-medium">
                        {alert.rule_triggered || 'Anomaly Threshold Exceeded'}
                      </td>
                      <td className="px-4 py-3">
                        <RiskBadge level={alert.severity} size="sm" />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={alert.status} />
                      </td>
                      <td className="px-4 py-3 text-right font-numeric font-bold text-[#191c1d] dark:text-white">
                        {alert.risk_score}
                      </td>
                      <td className="px-4 py-3 text-[#78716c] dark:text-[#9aa19d] whitespace-nowrap">
                        {formatDateTime(alert.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenTriage(alert)}
                          className="inline-flex items-center gap-1 rounded-lg bg-white dark:bg-[#121514] border border-[#e8e6df] dark:border-[#272d29] px-2.5 py-1 text-xs font-medium text-[#191c1d] dark:text-white hover:text-[#164e3f] hover:bg-[#ebf3ef] transition-colors shadow-2xs"
                        >
                          <Edit3 className="h-3 w-3" />
                          <span>Review</span>
                        </button>
                        <Link
                          to={`/transactions/${alert.transaction_id}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-white dark:bg-[#121514] border border-[#e8e6df] dark:border-[#272d29] px-2.5 py-1 text-xs font-medium text-[#191c1d] dark:text-white hover:text-[#164e3f] hover:bg-[#ebf3ef] transition-colors shadow-2xs"
                        >
                          <span>Transaction</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {data && data.total_pages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#e8e6df] dark:border-[#272d29] px-4 py-3 text-xs text-[#78716c] dark:text-[#9aa19d] bg-[#faf9f5] dark:bg-[#121514]">
              <div>
                Showing page <span className="font-semibold text-[#191c1d] dark:text-white">{data.page}</span> of{' '}
                <span className="font-semibold text-[#191c1d] dark:text-white">{data.total_pages}</span> (
                {formatNumber(data.total)} total alerts)
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] px-3 py-1 text-[#191c1d] dark:text-white disabled:opacity-40 hover:bg-[#faf9f5] dark:hover:bg-[#1f2422] transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  disabled={page >= data.total_pages}
                  onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                  className="rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] px-3 py-1 text-[#191c1d] dark:text-white disabled:opacity-40 hover:bg-[#faf9f5] dark:hover:bg-[#1f2422] transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Triage Status Update Modal Dialog */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#e8e6df] dark:border-[#272d29] pb-3 mb-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#191c1d] dark:text-white">
                  Triage alert: <span className="font-mono">{selectedAlert.alert_id}</span>
                </h3>
                <p className="text-xs text-[#78716c] dark:text-[#9aa19d] mt-0.5">
                  Trigger: {selectedAlert.rule_triggered}
                </p>
              </div>
              <button
                onClick={() => setSelectedAlert(null)}
                className="text-[#78716c] hover:text-[#191c1d] dark:hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTriage} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#525252] dark:text-[#9aa19d] mb-1">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] px-3 py-2 text-xs text-[#191c1d] dark:text-[#f0f3f1] focus:border-[#1b4332] dark:focus:border-[#a7f3d0] focus:outline-none transition-colors"
                >
                  <option value="NEW">New</option>
                  <option value="UNDER_REVIEW">Under review</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="FALSE_POSITIVE">False positive</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#525252] dark:text-[#9aa19d] mb-1">
                  Notes and rationale
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes explaining this status change..."
                  className="w-full rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] px-3 py-2 text-xs text-[#191c1d] dark:text-[#f0f3f1] focus:border-[#1b4332] dark:focus:border-[#a7f3d0] focus:outline-none transition-colors"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#e8e6df] dark:border-[#272d29]">
                <button
                  type="button"
                  onClick={() => setSelectedAlert(null)}
                  className="rounded-lg border border-[#e8e6df] dark:border-[#272d29] px-4 py-2 text-xs font-semibold text-[#525252] dark:text-[#9aa19d] hover:bg-[#faf9f5] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-[#1b4332] text-white hover:bg-[#143326] px-4 py-2 text-xs font-semibold disabled:opacity-50 transition-colors shadow-xs"
                >
                  {submitting ? 'Updating...' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
