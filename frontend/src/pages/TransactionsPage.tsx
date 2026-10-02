import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { transactionsApi } from '../api/client';
import { PageHeader } from '../components/common/PageHeader';
import { RiskBadge } from '../components/common/RiskBadge';
import { DecisionBadge } from '../components/common/DecisionBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { usePreferences } from '../context/PreferencesContext';
import { formatNumber, formatDateTime } from '../utils/formatters';
import type { Transaction, TransactionListResponse } from '../types';
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  CreditCard,
  RefreshCw,
  X,
} from 'lucide-react';

export const TransactionsPage: React.FC = () => {
  const { formatAmount } = usePreferences();
  const [data, setData] = useState<TransactionListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [search, setSearch] = useState('');
  const [riskLevel, setRiskLevel] = useState<string>('');
  const [decision, setDecision] = useState<string>('');
  const [txnType, setTxnType] = useState<string>('');
  const [fetchError, setFetchError] = useState<string | null>(null);

  const isMountedRef = React.useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await transactionsApi.getTransactions({
        page,
        page_size: pageSize,
        search: search || undefined,
        risk_level: riskLevel || undefined,
        decision: decision || undefined,
        transaction_type: txnType || undefined,
      });
      if (!isMountedRef.current) return;
      setData(res);
    } catch (err: any) {
      if (!isMountedRef.current) return;
      console.error('Failed to load transactions', err);
      setFetchError('Unable to load transaction records. Please verify server connection.');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, pageSize, riskLevel, decision, txnType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTransactions();
  };

  const handleClearFilters = () => {
    setSearch('');
    setRiskLevel('');
    setDecision('');
    setTxnType('');
    setPage(1);
  };

  const handleExportCsv = () => {
    const params: Record<string, any> = {};
    if (search) params.search = search;
    if (riskLevel) params.risk_level = riskLevel;
    if (decision) params.decision = decision;
    if (txnType) params.transaction_type = txnType;
    const url = transactionsApi.exportCsvUrl(params);
    window.open(url, '_blank');
  };

  const hasActiveFilters = Boolean(search || riskLevel || decision || txnType);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial records"
        subtitle="Search and review transactions across payment channels, risk scores, and decisions."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] px-3.5 py-2 text-xs font-semibold text-[#191c1d] dark:text-[#f0f3f1] hover:bg-[#faf9f5] dark:hover:bg-[#1f2422] shadow-xs transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-[#164e3f] dark:text-[#a7f3d0]" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={fetchTransactions}
              title="Refresh transactions"
              className="rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-2 text-[#78716c] hover:text-[#191c1d] dark:hover:text-white shadow-xs transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-4 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8a8a86]" />
            <input
              type="text"
              placeholder="Search by ID, User, City, Merchant..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] pl-9 pr-3 py-2 text-xs text-[#191c1d] dark:text-[#f0f3f1] placeholder-[#8a8a86] focus:border-[#1b4332] dark:focus:border-[#a7f3d0] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <select
              value={riskLevel}
              onChange={(e) => {
                setRiskLevel(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] px-3 py-2 text-xs text-[#191c1d] dark:text-[#f0f3f1] focus:border-[#1b4332] dark:focus:border-[#a7f3d0] focus:outline-none transition-colors"
            >
              <option value="">All risk levels</option>
              <option value="LOW">Low risk</option>
              <option value="MEDIUM">Medium risk</option>
              <option value="HIGH">High risk</option>
              <option value="CRITICAL">Critical risk</option>
            </select>
          </div>

          <div>
            <select
              value={decision}
              onChange={(e) => {
                setDecision(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] px-3 py-2 text-xs text-[#191c1d] dark:text-[#f0f3f1] focus:border-[#1b4332] dark:focus:border-[#a7f3d0] focus:outline-none transition-colors"
            >
              <option value="">All decisions</option>
              <option value="APPROVE">Approve</option>
              <option value="REVIEW">Review</option>
              <option value="BLOCK">Block</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={txnType}
              onChange={(e) => {
                setTxnType(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] px-3 py-2 text-xs text-[#191c1d] dark:text-[#f0f3f1] focus:border-[#1b4332] dark:focus:border-[#a7f3d0] focus:outline-none transition-colors"
            >
              <option value="">All types</option>
              <option value="PURCHASE">Purchase</option>
              <option value="TRANSFER">Transfer</option>
              <option value="WIRE_TRANSFER">Wire transfer</option>
              <option value="WITHDRAWAL">Withdrawal</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                title="Clear all active filters"
                className="p-2 rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] text-[#78716c] hover:text-[#191c1d] dark:hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Transaction Data Table */}
      <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] overflow-hidden shadow-xs">
        {loading ? (
          <LoadingSpinner label="Loading records…" size="md" />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title="No Records Found"
            description="No transactions match your search filters. Try clearing filters to view all records."
            icon={CreditCard}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] text-[#525252] dark:text-[#9aa19d] text-xs font-semibold">
                <tr>
                  <th className="px-4 py-3">Transaction ID</th>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3 text-right">Risk score</th>
                  <th className="px-4 py-3">Risk level</th>
                  <th className="px-4 py-3">Decision</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e6df] dark:divide-[#272d29]">
                {data.items.map((txn) => {
                  const risk = txn.prediction?.risk_score ?? (txn.is_fraud ? 85 : 12);
                  const decisionVerdict =
                    txn.prediction?.decision || (risk >= 75 ? 'BLOCK' : risk > 30 ? 'REVIEW' : 'APPROVE');
                  const targetId = txn.external_transaction_id || txn.id;

                  return (
                    <tr
                      key={txn.id}
                      className="hover:bg-[#faf9f5] dark:hover:bg-[#1f2422] transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-medium text-[#191c1d] dark:text-white whitespace-nowrap">
                        <Link to={`/transactions/${targetId}`} className="hover:underline hover:text-[#164e3f]">
                          {txn.external_transaction_id || `TXN-${String(txn.id).padStart(8, '0')}`}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[#78716c] dark:text-[#9aa19d] whitespace-nowrap">
                        {formatDateTime(txn.timestamp)}
                      </td>
                      <td className="px-4 py-3 font-mono text-[#525252] dark:text-[#d1d5db]">
                        {txn.customer_id || txn.user_id}
                      </td>
                      <td className="px-4 py-3 text-right font-numeric font-bold text-[#191c1d] dark:text-white whitespace-nowrap">
                        {formatAmount(txn.amount)}
                      </td>
                      <td className="px-4 py-3 text-[#525252] dark:text-[#9aa19d] capitalize">
                        {txn.transaction_type ? txn.transaction_type.toLowerCase().replace(/_/g, ' ') : '—'}
                      </td>
                      <td className="px-4 py-3 text-[#525252] dark:text-[#9aa19d] capitalize">
                        {txn.merchant_category?.toLowerCase().replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-3 text-[#78716c] dark:text-[#9aa19d]">
                        {txn.location || `${txn.city || 'Global'}, ${txn.country || 'IN'}`}
                      </td>
                      <td className="px-4 py-3 text-right font-numeric font-bold text-[#191c1d] dark:text-white">
                        {risk.toFixed(1)}
                      </td>
                      <td className="px-4 py-3">
                        <RiskBadge
                          level={txn.prediction?.risk_level || (risk >= 75 ? 'HIGH' : risk > 30 ? 'MEDIUM' : 'LOW')}
                          size="sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <DecisionBadge decision={decisionVerdict} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/transactions/${targetId}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-white dark:bg-[#121514] border border-[#e8e6df] dark:border-[#272d29] px-2.5 py-1 text-xs font-medium text-[#191c1d] dark:text-white hover:text-[#164e3f] hover:bg-[#ebf3ef] transition-colors shadow-2xs"
                        >
                          <span>Details</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Server-Side Pagination Footer */}
        {data && data.total_pages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#e8e6df] dark:border-[#272d29] px-4 py-3 text-xs text-[#78716c] dark:text-[#9aa19d] bg-[#faf9f5] dark:bg-[#121514]">
            <div>
              Showing page <span className="font-semibold text-[#191c1d] dark:text-white">{data.page}</span> of{' '}
              <span className="font-semibold text-[#191c1d] dark:text-white">{data.total_pages}</span> (
              {formatNumber(data.total)} total records)
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
    </div>
  );
};
