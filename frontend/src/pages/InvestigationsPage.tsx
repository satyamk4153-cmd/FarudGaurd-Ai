import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { investigationsApi } from '../api/client';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { usePreferences } from '../context/PreferencesContext';
import { formatNumber, formatDateTime } from '../utils/formatters';
import type { InvestigationCase, CaseListResponse } from '../types';
import {
  FolderKanban,
  Plus,
  FolderPlus,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  X,
} from 'lucide-react';

export const InvestigationsPage: React.FC = () => {
  const { formatAmount } = usePreferences();
  const [data, setData] = useState<CaseListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // New Case Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState('HIGH');
  const [txnIdsInput, setTxnIdsInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isMountedRef = React.useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchCases = async () => {
    setLoading(true);
    setAuthError(false);
    try {
      const res = await investigationsApi.getCases({
        page,
        page_size: 15,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
      });
      if (!isMountedRef.current) return;
      setData(res);
    } catch (err: any) {
      if (!isMountedRef.current) return;
      if (err?.response?.status === 403) {
        setAuthError(true);
      } else {
        console.error('Failed to load investigation cases', err);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchCases();
  }, [page, statusFilter, priorityFilter]);

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const ids = txnIdsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await investigationsApi.createCase({
        title: newTitle,
        description: newDesc,
        priority: newPriority,
        transaction_ids: ids,
      });
      setCreateModalOpen(false);
      setNewTitle('');
      setNewDesc('');
      setTxnIdsInput('');
      fetchCases();
    } catch (err) {
      console.error('Failed to create case', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Investigations"
        subtitle="Track, document, and resolve active fraud investigation case files."
        actions={
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1b4332] text-white hover:bg-[#143326] px-4 py-2 text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>New case</span>
          </button>
        }
      />

      {/* Filter Bar */}
      <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-4 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="w-full sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] px-3 py-2 text-xs text-[#191c1d] dark:text-[#f0f3f1] focus:border-[#1b4332] dark:focus:border-[#a7f3d0] focus:outline-none transition-colors"
          >
            <option value="">All statuses</option>
            <option value="OPEN">Open</option>
            <option value="UNDER_REVIEW">Under review</option>
            <option value="RESOLVED">Resolved</option>
            <option value="FALSE_POSITIVE">False positive</option>
          </select>
        </div>

        <div className="w-full sm:w-48">
          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] px-3 py-2 text-xs text-[#191c1d] dark:text-[#f0f3f1] focus:border-[#1b4332] dark:focus:border-[#a7f3d0] focus:outline-none transition-colors"
          >
            <option value="">All priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
      </div>

      {/* Cases Table or Access Restricted Banner */}
      {authError ? (
        <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-8 text-center shadow-xs">
          <ShieldAlert className="h-8 w-8 text-[#164e3f] mx-auto mb-2" />
          <h3 className="font-serif text-base font-bold text-[#191c1d] dark:text-white">Analyst Access Required</h3>
          <p className="text-xs text-[#78716c] dark:text-[#9aa19d] mt-1 max-w-md mx-auto">
            Incident case management is restricted to certified Fraud Analysts and Administrators.
            Sign in as analyst@fraudguard.ai or request a role elevation from an administrator.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] overflow-hidden shadow-xs">
          {loading ? (
            <LoadingSpinner label="Loading investigations…" size="md" />
          ) : !data || data.items.length === 0 ? (
            <EmptyState
              title="No Investigation Cases Found"
              description="No cases match your filters. Create a case or adjust search criteria."
              icon={FolderKanban}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] text-[#525252] dark:text-[#9aa19d] text-xs font-semibold">
                  <tr>
                    <th className="px-4 py-3">Case ID</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Transactions</th>
                    <th className="px-4 py-3 text-right">Amount at risk</th>
                    <th className="px-4 py-3">Assignee</th>
                    <th className="px-4 py-3">Updated</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e6df] dark:divide-[#272d29]">
                  {data.items.map((cs) => (
                    <tr key={cs.id} className="hover:bg-[#faf9f5] dark:hover:bg-[#1f2422] transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-[#191c1d] dark:text-white whitespace-nowrap">
                        <Link to={`/investigations/${cs.id}`} className="hover:underline hover:text-[#164e3f]">
                          {cs.case_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-medium text-[#191c1d] dark:text-white max-w-xs truncate">
                        {cs.title || cs.summary}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={cs.priority} type="priority" />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={cs.status} />
                      </td>
                      <td className="px-4 py-3 text-right font-numeric text-[#525252] dark:text-[#9aa19d]">
                        {cs.transaction_count}
                      </td>
                      <td className="px-4 py-3 text-right font-numeric font-bold text-rose-600 whitespace-nowrap">
                        {formatAmount(cs.total_amount_at_risk)}
                      </td>
                      <td className="px-4 py-3 text-[#78716c] dark:text-[#9aa19d]">
                        {cs.assigned_to_name || 'Unassigned'}
                      </td>
                      <td className="px-4 py-3 text-[#78716c] dark:text-[#9aa19d] whitespace-nowrap">
                        {formatDateTime(cs.updated_at)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Link
                          to={`/investigations/${cs.id}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-white dark:bg-[#121514] border border-[#e8e6df] dark:border-[#272d29] px-2.5 py-1 text-xs font-medium text-[#191c1d] dark:text-white hover:text-[#164e3f] hover:bg-[#ebf3ef] transition-colors shadow-2xs"
                        >
                          <span>Open</span>
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
                {formatNumber(data.total)} total cases)
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

      {/* Create Case Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#e8e6df] dark:border-[#272d29] pb-3 mb-4">
              <h3 className="font-serif text-lg font-bold text-[#191c1d] dark:text-white">New investigation case</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-[#78716c] hover:text-[#191c1d] dark:hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCase} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#525252] dark:text-[#9aa19d] mb-1">Case title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Account takeover via velocity spike"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] px-3 py-2 text-xs text-[#191c1d] dark:text-[#f0f3f1] focus:border-[#1b4332] dark:focus:border-[#a7f3d0] focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#525252] dark:text-[#9aa19d] mb-1">Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  className="w-full rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] px-3 py-2 text-xs text-[#191c1d] dark:text-[#f0f3f1] focus:border-[#1b4332] dark:focus:border-[#a7f3d0] focus:outline-none transition-colors"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#525252] dark:text-[#9aa19d] mb-1">
                  Associated transaction IDs (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. TXN-0000001, TXN-0000002"
                  value={txnIdsInput}
                  onChange={(e) => setTxnIdsInput(e.target.value)}
                  className="w-full rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] px-3 py-2 text-xs text-[#191c1d] dark:text-[#f0f3f1] focus:border-[#1b4332] dark:focus:border-[#a7f3d0] focus:outline-none font-mono transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#525252] dark:text-[#9aa19d] mb-1">
                  Case description
                </label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Describe anomalous factors, evidence patterns, and context..."
                  className="w-full rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] px-3 py-2 text-xs text-[#191c1d] dark:text-[#f0f3f1] focus:border-[#1b4332] dark:focus:border-[#a7f3d0] focus:outline-none transition-colors"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#e8e6df] dark:border-[#272d29]">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="rounded-lg border border-[#e8e6df] dark:border-[#272d29] px-4 py-2 text-xs font-semibold text-[#525252] dark:text-[#9aa19d] hover:bg-[#faf9f5] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#1b4332] hover:bg-[#143326] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 transition-colors shadow-xs"
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                  <span>{submitting ? 'Creating case...' : 'Create case'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
