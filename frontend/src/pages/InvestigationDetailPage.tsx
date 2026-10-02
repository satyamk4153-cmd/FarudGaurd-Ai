import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { investigationsApi } from '../api/client';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { usePreferences } from '../context/PreferencesContext';
import { formatCurrency, formatNumber } from '../utils/formatters';
import type { InvestigationCaseDetail } from '../types';
import {
  ArrowLeft,
  FolderKanban,
  MessageSquare,
  Send,
  CreditCard,
  ExternalLink,
  Clock,
  User,
  ShieldAlert,
  AlertTriangle,
  Activity,
  TrendingUp,
} from 'lucide-react';

export const InvestigationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currency } = usePreferences();

  const [caseData, setCaseData] = useState<InvestigationCaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);

  const fetchDetail = async () => {
    if (!id || isNaN(parseInt(id, 10))) {
      setErrorMsg('Invalid case ID provided.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setAuthError(false);
    setErrorMsg(null);
    try {
      const data = await investigationsApi.getCaseDetail(parseInt(id, 10));
      setCaseData(data);
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setAuthError(true);
      } else if (err?.response?.status === 404) {
        setErrorMsg('Investigation case not found.');
      } else {
        setErrorMsg(err?.message || 'Failed to load case details.');
      }
      console.error('Failed to load case detail', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!id || isNaN(parseInt(id, 10))) {
        if (!isMounted) return;
        setErrorMsg('Invalid case ID provided.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setAuthError(false);
      setErrorMsg(null);
      try {
        const data = await investigationsApi.getCaseDetail(parseInt(id, 10));
        if (!isMounted) return;
        setCaseData(data);
      } catch (err: any) {
        if (!isMounted) return;
        if (err?.response?.status === 403) {
          setAuthError(true);
        } else if (err?.response?.status === 404) {
          setErrorMsg('Investigation case not found.');
        } else {
          setErrorMsg(err?.message || 'Failed to load case details.');
        }
        console.error('Failed to load case detail', err);
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
  }, [id]);

  const handleStatusChange = async (status: string) => {
    if (!caseData) return;
    setUpdatingStatus(true);
    setStatusError(null);
    try {
      await investigationsApi.updateCase(caseData.id, { status });
      fetchDetail();
    } catch (err: any) {
      console.error('Failed to update case status', err);
      setStatusError(err?.response?.data?.detail || 'Failed to update case status. Please try again.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !caseData) return;
    setSubmittingNote(true);
    setNoteError(null);
    try {
      await investigationsApi.addCaseNote(caseData.id, newNote);
      setNewNote('');
      fetchDetail();
    } catch (err: any) {
      console.error('Failed to add note', err);
      setNoteError(err?.response?.data?.detail || 'Failed to submit note. Please try again.');
    } finally {
      setSubmittingNote(false);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading investigation details…" size="lg" />;
  }

  if (authError) {
    return (
      <div className="space-y-4">
        <Link to="/investigations" className="inline-flex items-center gap-1.5 text-xs text-[#78716c] hover:text-[#191c1d] dark:hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Investigations
        </Link>
        <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-8 text-center shadow-xs">
          <div className="flex items-center justify-center gap-3 mb-2">
            <ShieldAlert className="h-6 w-6 text-[#164e3f] dark:text-[#a7f3d0] shrink-0" />
            <h3 className="font-serif font-bold text-lg text-[#191c1d] dark:text-white">Analyst Access Required</h3>
          </div>
          <p className="text-xs text-[#78716c] dark:text-[#9aa19d] max-w-md mx-auto">
            Case details and evidence are restricted to certified fraud analysts and administrators.
          </p>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-12 text-center text-[#78716c]">
        <p className="text-xs">{errorMsg || 'Investigation case not found.'}</p>
        <Link to="/investigations" className="mt-4 inline-flex items-center gap-1.5 text-xs text-[#164e3f] dark:text-[#a7f3d0] font-semibold hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Return to Cases
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/investigations"
          className="rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-2 text-[#525252] dark:text-[#9aa19d] hover:text-[#191c1d] dark:hover:text-white transition-colors shadow-xs"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <PageHeader
            title={`Case ${caseData.case_number}`}
            subtitle={caseData.title}
            actions={
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#78716c]">Status:</span>
                <select
                  value={caseData.status}
                  disabled={updatingStatus}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] px-3 py-1.5 text-xs font-semibold text-[#191c1d] dark:text-white focus:border-[#1b4332] dark:focus:border-[#a7f3d0] focus:outline-none shadow-xs"
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
            }
          />
        </div>
      </div>

      {statusError && (
        <div className="rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 px-4 py-2.5 text-xs text-rose-700 dark:text-rose-400">
          {statusError}
        </div>
      )}

      {/* Case Overview Metrics matching PolicyLens */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-[#525252] dark:text-[#9aa19d]">Priority</span>
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <div className="mt-1">
            <StatusBadge status={caseData.priority} type="priority" />
          </div>
        </div>

        <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-[#525252] dark:text-[#9aa19d]">Status</span>
            <Activity className="h-3.5 w-3.5 text-[#164e3f] dark:text-[#a7f3d0]" />
          </div>
          <div className="mt-1">
            <StatusBadge status={caseData.status} />
          </div>
        </div>

        <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-[#525252] dark:text-[#9aa19d]">Amount at risk</span>
            <TrendingUp className="h-3.5 w-3.5 text-rose-600" />
          </div>
          <span className="text-lg font-bold font-numeric text-rose-600 dark:text-rose-400 mt-1 block">
            {formatCurrency(caseData.total_amount_at_risk, currency)}
          </span>
        </div>

        <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-[#525252] dark:text-[#9aa19d]">Assignee</span>
            <User className="h-3.5 w-3.5 text-[#78716c]" />
          </div>
          <span className="text-xs font-semibold text-[#191c1d] dark:text-white mt-1 block">
            {caseData.assigned_to_name || 'Unassigned'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Overview & Evidence */}
        <div className="lg:col-span-7 space-y-6">
          {/* Overview */}
          <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <FolderKanban className="h-4 w-4 text-[#164e3f] dark:text-[#a7f3d0]" />
              <h3 className="font-serif text-base font-bold text-[#191c1d] dark:text-white">
                Case narrative
              </h3>
            </div>
            <p className="text-xs text-[#525252] dark:text-[#d1d5db] leading-relaxed">
              {caseData.description || 'No initial description recorded.'}
            </p>
            <div className="mt-4 pt-3 border-t border-[#e8e6df] dark:border-[#272d29] flex items-center justify-between text-xs text-[#78716c]">
              <span className="inline-flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-[#78716c]" />
                Opened by: {caseData.creator_name || 'System'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[#78716c]" />
                {caseData.created_at?.slice(0, 19).replace('T', ' ')}
              </span>
            </div>
          </div>

          {/* Evidence / Attached Transactions */}
          <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[#164e3f] dark:text-[#a7f3d0]" />
                <h3 className="font-serif text-base font-bold text-[#191c1d] dark:text-white">
                  Attached evidence ({caseData.transaction_ids?.length || 0} transactions)
                </h3>
              </div>
            </div>

            {caseData.transaction_ids && caseData.transaction_ids.length > 0 ? (
              <div className="space-y-2">
                {caseData.transaction_ids.map((txnId) => (
                  <div
                    key={txnId}
                    className="flex items-center justify-between rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] p-3 text-xs"
                  >
                    <span className="font-mono font-medium text-[#191c1d] dark:text-white">{txnId}</span>
                    <Link
                      to={`/transactions/${txnId}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#164e3f] dark:text-[#a7f3d0] hover:underline"
                    >
                      <span>View record</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#78716c] py-4 text-center">
                No specific transaction IDs attached yet.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Notes & History */}
        <div className="lg:col-span-5 rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 border-b border-[#e8e6df] dark:border-[#272d29] pb-3">
              <MessageSquare className="h-4 w-4 text-[#164e3f] dark:text-[#a7f3d0]" />
              <h3 className="font-serif text-base font-bold text-[#191c1d] dark:text-white">
                Analyst findings ({caseData.notes?.length || 0})
              </h3>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {caseData.notes && caseData.notes.length > 0 ? (
                caseData.notes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] p-3 text-xs"
                  >
                    <div className="flex items-center justify-between text-xs text-[#78716c] mb-1">
                      <span className="font-bold text-[#191c1d] dark:text-white">{note.author_name}</span>
                      <span>{note.created_at?.slice(0, 19).replace('T', ' ')}</span>
                    </div>
                    <p className="text-[#525252] dark:text-[#d1d5db] leading-relaxed">{note.note}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#78716c] py-6 text-center">
                  No notes recorded yet. Add an investigative note below.
                </p>
              )}
            </div>
          </div>

          {/* Add Note Form */}
          <form onSubmit={handleAddNote} className="mt-4 pt-4 border-t border-[#e8e6df] dark:border-[#272d29]">
            <label className="block text-xs font-semibold text-[#525252] dark:text-[#9aa19d] mb-1.5">
              Add note
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Log finding, phone confirmation, bank verification..."
                className="flex-1 rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] px-3 py-2 text-xs text-[#191c1d] dark:text-[#f0f3f1] placeholder-[#8a8a86] focus:outline-none focus:border-[#1b4332] dark:focus:border-[#a7f3d0]"
              />
              <button
                type="submit"
                disabled={submittingNote}
                className="inline-flex items-center justify-center rounded-lg bg-[#1b4332] hover:bg-[#143326] px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-50 transition-colors shadow-xs"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            {noteError && (
              <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">{noteError}</p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
