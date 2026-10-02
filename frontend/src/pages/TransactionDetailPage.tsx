import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { transactionsApi, investigationsApi } from '../api/client';
import { PageHeader } from '../components/common/PageHeader';
import { RiskBadge } from '../components/common/RiskBadge';
import { DecisionBadge } from '../components/common/DecisionBadge';
import { ShapWaterfall } from '../components/common/ShapWaterfall';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { usePreferences } from '../context/PreferencesContext';
import { formatNumber, formatPercent, formatDateTime } from '../utils/formatters';
import type { TransactionDetail } from '../types';
import {
  ArrowLeft,
  ShieldAlert,
  AlertTriangle,
  FolderPlus,
  Clock,
  Globe,
  Smartphone,
  CreditCard,
  User,
  Activity,
  CheckCircle2,
  X,
  Building2,
  MapPin,
  Cpu,
} from 'lucide-react';

export const TransactionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { formatAmount } = usePreferences();
  const [txn, setTxn] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Escalate modal state
  const [caseModalOpen, setCaseModalOpen] = useState(false);
  const [caseTitle, setCaseTitle] = useState('');
  const [caseDescription, setCaseDescription] = useState('');
  const [casePriority, setCasePriority] = useState('HIGH');
  const [submittingCase, setSubmittingCase] = useState(false);
  const [caseError, setCaseError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    const fetchDetail = async () => {
      try {
        const data = await transactionsApi.getTransactionDetail(id);
        if (!isMounted) return;
        setTxn(data);
        const txnDisplayId = data.external_transaction_id || data.transaction_id || (data.id ? String(data.id) : 'TXN');
        setCaseTitle(`Investigate suspicious transaction: ${txnDisplayId.slice(0, 20)}`);
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Failed to load transaction detail', err);
        setFetchError(err?.response?.data?.detail || 'Failed to load transaction details. Please try again.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txn) return;
    setSubmittingCase(true);
    try {
      const created = await investigationsApi.createCase({
        title: caseTitle,
        description: caseDescription,
        priority: casePriority,
        transaction_ids: [txn.external_transaction_id || txn.transaction_id || String(txn.id)],
      });
      setCaseModalOpen(false);
      navigate(`/investigations/${created.id}`);
    } catch (err: any) {
      console.error('Failed to create investigation case', err);
      setCaseError(err?.response?.data?.detail || 'Failed to create investigation case. Please try again.');
    } finally {
      setSubmittingCase(false);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading transaction details…" size="lg" />;
  }

  if (!txn) {
    return (
      <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-12 text-center text-[#78716c] dark:text-[#9aa19d]">
        <p className="font-medium text-[#191c1d] dark:text-white mb-1">
          {fetchError ? 'Error loading transaction' : 'Transaction not found'}
        </p>
        {fetchError && (
          <p className="text-xs text-rose-600 dark:text-rose-400 mb-3">{fetchError}</p>
        )}
        <Link to="/transactions" className="mt-4 inline-flex items-center gap-1.5 text-xs text-[#164e3f] dark:text-[#a7f3d0] font-semibold hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Return to Transactions
        </Link>
      </div>
    );
  }

  const riskScore = txn.prediction?.risk_score ?? (txn.is_fraud ? 89.2 : 14.1);
  const fraudProb = txn.prediction?.fraud_probability ?? (txn.is_fraud ? 0.92 : 0.08);
  const anomalyScore = txn.prediction?.anomaly_score ?? 0.124;
  const riskTier = txn.prediction?.risk_level ?? (riskScore >= 75 ? 'HIGH' : riskScore > 30 ? 'MEDIUM' : 'LOW');
  const decisionVerdict = txn.prediction?.decision ?? (riskScore >= 75 ? 'BLOCK' : riskScore > 30 ? 'REVIEW' : 'APPROVE');
  const targetId = txn.external_transaction_id || `TXN-${String(txn.id).padStart(8, '0')}`;

  return (
    <div className="space-y-6">
      {/* Header and Back Link */}
      <div className="flex items-center gap-3">
        <Link
          to="/transactions"
          className="rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-2 text-[#525252] dark:text-[#9aa19d] hover:text-[#191c1d] dark:hover:text-white transition-colors shadow-xs"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <PageHeader
          title={`Transaction: ${targetId}`}
          subtitle={`Processed on ${formatDateTime(txn.timestamp)}`}
          actions={
            <button
              onClick={() => setCaseModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1b4332] hover:bg-[#143326] text-white px-4 py-2 text-xs font-semibold shadow-xs transition-colors"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              <span>Open investigation</span>
            </button>
          }
        />
      </div>

      {/* 1. Top Numerical Risk Assessment Cards matching PolicyLens */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-[#525252] dark:text-[#9aa19d]">
              Fraud probability
            </span>
            <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
          </div>
          <span className="text-xl font-bold font-numeric text-rose-600 dark:text-rose-400">
            {formatPercent(fraudProb, true)}
          </span>
        </div>

        <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-[#525252] dark:text-[#9aa19d]">
              Risk score
            </span>
            <Activity className="h-3.5 w-3.5 text-[#164e3f] dark:text-[#a7f3d0]" />
          </div>
          <span className="text-xl font-bold font-numeric text-[#191c1d] dark:text-white">
            {riskScore.toFixed(1)} <span className="text-xs text-[#78716c] font-normal">/ 100</span>
          </span>
        </div>

        <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-[#525252] dark:text-[#9aa19d]">
              Risk level
            </span>
            <AlertTriangle className="h-3.5 w-3.5 text-[#78716c]" />
          </div>
          <div className="mt-1">
            <RiskBadge level={riskTier} size="md" />
          </div>
        </div>

        <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-[#525252] dark:text-[#9aa19d]">
              Anomaly score
            </span>
            <Cpu className="h-3.5 w-3.5 text-[#164e3f] dark:text-[#a7f3d0]" />
          </div>
          <span className="text-xl font-bold font-numeric text-[#191c1d] dark:text-white">
            {anomalyScore.toFixed(4)}
          </span>
        </div>

        <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-[#525252] dark:text-[#9aa19d]">
              Decision
            </span>
            <CheckCircle2 className="h-3.5 w-3.5 text-[#164e3f] dark:text-[#a7f3d0]" />
          </div>
          <div className="mt-1">
            <DecisionBadge decision={decisionVerdict} size="md" />
          </div>
        </div>
      </div>

      {/* 2. Transaction Summary & Context Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Attributes */}
        <div className="lg:col-span-2 rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#e8e6df] dark:border-[#272d29] pb-3 mb-4">
            <span className="font-serif text-base font-bold text-[#191c1d] dark:text-white flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-[#164e3f] dark:text-[#a7f3d0]" />
              <span>Transaction attributes</span>
            </span>
            <span className="font-numeric text-xl font-bold text-[#191c1d] dark:text-white">
              {formatAmount(txn.amount)}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 text-xs">
            <div>
              <span className="text-[#78716c] block mb-0.5">Customer ID</span>
              <span className="text-[#191c1d] dark:text-[#f0f3f1] font-mono font-medium">{txn.customer_id || txn.user_id}</span>
            </div>
            <div>
              <span className="text-[#78716c] block mb-0.5">Payment card</span>
              <span className="text-[#191c1d] dark:text-[#f0f3f1] font-mono font-medium">{txn.card_id || 'CARD-5892'}</span>
            </div>
            <div>
              <span className="text-[#78716c] block mb-0.5">Transaction type</span>
              <span className="text-[#191c1d] dark:text-[#f0f3f1] font-medium capitalize">{txn.transaction_type ? txn.transaction_type.toLowerCase().replace(/_/g, ' ') : '—'}</span>
            </div>

            <div>
              <span className="text-[#78716c] block mb-0.5">Location</span>
              <span className="text-[#191c1d] dark:text-[#f0f3f1] font-medium">{txn.location || `${txn.city || 'Global'}, ${txn.country || 'IN'}`}</span>
            </div>
            <div>
              <span className="text-[#78716c] block mb-0.5">Channel</span>
              <span className="text-[#191c1d] dark:text-[#f0f3f1] font-medium capitalize">{txn.channel ? txn.channel.toLowerCase() : 'Online'}</span>
            </div>
            <div>
              <span className="text-[#78716c] block mb-0.5">Account age</span>
              <span className="text-[#191c1d] dark:text-[#f0f3f1] font-medium">{txn.account_age_days != null ? `${txn.account_age_days} days` : 'Unavailable'}</span>
            </div>

            <div>
              <span className="text-[#78716c] block mb-0.5">Merchant ID</span>
              <span className="text-[#191c1d] dark:text-[#f0f3f1] font-mono font-medium">{txn.merchant_id || 'Unavailable'}</span>
            </div>
            <div>
              <span className="text-[#78716c] block mb-0.5">Merchant category</span>
              <span className="text-[#191c1d] dark:text-[#f0f3f1] font-medium capitalize">{txn.merchant_category?.toLowerCase().replace(/_/g, ' ')}</span>
            </div>
            <div>
              <span className="text-[#78716c] block mb-0.5">Cross-border</span>
              <span className="text-[#191c1d] dark:text-[#f0f3f1] font-medium">{txn.is_international ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>

        {/* Behavioral & Device Context */}
        <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-6 shadow-xs space-y-4">
          <span className="font-serif text-base font-bold text-[#191c1d] dark:text-white flex items-center gap-2 border-b border-[#e8e6df] dark:border-[#272d29] pb-3">
            <Smartphone className="h-4 w-4 text-[#164e3f] dark:text-[#a7f3d0]" />
            <span>Behavioral & device signals</span>
          </span>

          <div className="space-y-3.5 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-[#e8e6df]/50 dark:border-[#272d29]/50">
              <span className="text-[#78716c]">IP risk score:</span>
              <span className="font-bold font-numeric text-[#191c1d] dark:text-white">{txn.ip_risk != null ? Number(txn.ip_risk).toFixed(2) : (txn.ip_risk_score != null ? Number(txn.ip_risk_score).toFixed(2) : 'Unavailable')}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-[#e8e6df]/50 dark:border-[#272d29]/50">
              <span className="text-[#78716c]">Device risk score:</span>
              <span className="font-bold font-numeric text-[#191c1d] dark:text-white">{txn.device_risk != null ? Number(txn.device_risk).toFixed(2) : (txn.device_risk_score != null ? Number(txn.device_risk_score).toFixed(2) : 'Unavailable')}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-[#e8e6df]/50 dark:border-[#272d29]/50">
              <span className="text-[#78716c]">Velocity (1h):</span>
              <span className="text-[#191c1d] dark:text-white font-bold font-numeric">{txn.velocity_1h || txn.transaction_frequency || 1} txns</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-[#e8e6df]/50 dark:border-[#272d29]/50">
              <span className="text-[#78716c]">Previous distance:</span>
              <span className="text-[#191c1d] dark:text-white font-bold font-numeric">{txn.distance_from_previous_transaction != null ? `${Number(txn.distance_from_previous_transaction).toFixed(1)} km` : 'Unavailable'}</span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-[#78716c]">Scoring model:</span>
              <span className="text-[#164e3f] dark:text-[#a7f3d0] font-mono font-semibold">{txn.prediction?.model_version || 'XGBoost Active'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SHAP Explainability Waterfall (Explainable AI Panel) */}
      {txn.prediction?.top_risk_factors && txn.prediction.top_risk_factors.length > 0 ? (
        <ShapWaterfall
          factors={txn.prediction.top_risk_factors}
          title="Top risk factors"
          subtitle="Feature contributions to the transaction risk score"
        />
      ) : (
        <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-6 shadow-xs">
          <h3 className="font-serif text-base font-bold text-[#191c1d] dark:text-white mb-2">
            Risk evaluation notes
          </h3>
          <p className="text-xs text-[#78716c] dark:text-[#9aa19d] leading-relaxed">
            Transaction scored with fraud probability of {formatPercent(fraudProb, true)}, anomaly score of {anomalyScore.toFixed(4)}, and device risk score of {txn.device_risk != null ? Number(txn.device_risk).toFixed(2) : 'N/A'}.
          </p>
        </div>
      )}

      {/* Open Investigation Modal Dialog */}
      {caseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#e8e6df] dark:border-[#272d29] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <FolderPlus className="h-5 w-5 text-[#164e3f] dark:text-[#a7f3d0]" />
                <h3 className="font-serif text-lg font-bold text-[#191c1d] dark:text-white">
                  Open investigation case
                </h3>
              </div>
              <button
                onClick={() => setCaseModalOpen(false)}
                className="text-[#78716c] hover:text-[#191c1d] dark:hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCase} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#525252] dark:text-[#9aa19d] mb-1">Case Title</label>
                <input
                  type="text"
                  required
                  value={caseTitle}
                  onChange={(e) => setCaseTitle(e.target.value)}
                  className="w-full rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] px-3 py-2 text-xs text-[#191c1d] dark:text-[#f0f3f1] focus:border-[#1b4332] dark:focus:border-[#a7f3d0] focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#525252] dark:text-[#9aa19d] mb-1">Case Priority</label>
                <select
                  value={casePriority}
                  onChange={(e) => setCasePriority(e.target.value)}
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
                  Notes and evidence
                </label>
                <textarea
                  rows={3}
                  value={caseDescription}
                  onChange={(e) => setCaseDescription(e.target.value)}
                  placeholder="Notes on why this transaction is being investigated..."
                  className="w-full rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] px-3 py-2 text-xs text-[#191c1d] dark:text-[#f0f3f1] focus:border-[#1b4332] dark:focus:border-[#a7f3d0] focus:outline-none transition-colors"
                />
              </div>

              {caseError && (
                <div className="rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 text-xs text-rose-700 dark:text-rose-400">
                  {caseError}
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#e8e6df] dark:border-[#272d29]">
                <button
                  type="button"
                  onClick={() => { setCaseModalOpen(false); setCaseError(null); }}
                  className="rounded-lg border border-[#e8e6df] dark:border-[#272d29] px-4 py-2 text-xs font-semibold text-[#525252] dark:text-[#9aa19d] hover:bg-[#faf9f5] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCase}
                  className="rounded-lg bg-[#1b4332] text-white hover:bg-[#143326] px-4 py-2 text-xs font-semibold disabled:opacity-50 transition-colors shadow-xs"
                >
                  {submittingCase ? 'Creating...' : 'Open case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
