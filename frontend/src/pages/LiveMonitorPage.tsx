import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader';
import { RiskBadge } from '../components/common/RiskBadge';
import { DecisionBadge } from '../components/common/DecisionBadge';
import { usePreferences } from '../context/PreferencesContext';
import { formatCurrency, formatPercent, formatNumber } from '../utils/formatters';
import {
  Play,
  Pause,
  Trash2,
  Activity,
  AlertTriangle,
  ShieldAlert,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  Radio,
  Ban,
} from 'lucide-react';

interface LiveTransactionEvent {
  transaction_id: string;
  external_transaction_id?: string;
  timestamp: string;
  user_id: string;
  customer_id?: string;
  amount: number;
  currency: string;
  transaction_type: string;
  merchant_category: string;
  city?: string;
  country?: string;
  location?: string;
  risk_score: number;
  risk_level: string;
  decision?: string;
  fraud_probability: number;
  anomaly_score: number;
  is_anomaly?: boolean;
}

export const LiveMonitorPage: React.FC = () => {
  const { currency } = usePreferences();
  const navigate = useNavigate();

  const [events, setEvents] = useState<LiveTransactionEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [filterBlockedOnly, setFilterBlockedOnly] = useState(false);
  const [criticalNotice, setCriticalNotice] = useState<LiveTransactionEvent | null>(null);

  // Counters
  const [totalStreamed, setTotalStreamed] = useState(0);
  const [fraudCount, setFraudCount] = useState(0);
  const [blockCount, setBlockCount] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  useEffect(() => {
    let isMounted = true;
    let reconnectTimer: any = null;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const isDevPort = window.location.port === '5173' || window.location.port === '3000';
    const wsBaseUrl =
      import.meta.env.VITE_WS_URL ||
      (isDevPort ? `${protocol}//${window.location.hostname}:8000` : `${protocol}//${window.location.host}`);
    const token = localStorage.getItem('fraudguard_token');
    const wsUrl = `${wsBaseUrl.replace(/\/$/, '')}/ws/live-transactions${token ? `?token=${encodeURIComponent(token)}` : ''}`;

    const connect = () => {
      if (!isMounted) return;
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isMounted) setIsConnected(true);
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const raw = JSON.parse(event.data);

            const score = typeof raw.risk_score === 'number' ? raw.risk_score : 0;
            const dec =
              raw.decision ||
              (score >= 75 ? 'BLOCK' : score > 30 ? 'REVIEW' : 'APPROVE');

            const normalizedEvent: LiveTransactionEvent = {
              transaction_id: raw.transaction_id || raw.external_transaction_id || 'TXN-LIVE',
              timestamp: raw.time_display || raw.timestamp?.slice(11, 19) || new Date().toLocaleTimeString(),
              user_id: raw.user_id || raw.customer_id || 'USR-ANON',
              amount: typeof raw.amount === 'number' ? raw.amount : 0,
              currency: raw.currency || 'USD',
              transaction_type: raw.transaction_type || 'PURCHASE',
              merchant_category: raw.merchant_category || 'RETAIL',
              city: raw.city || 'Mumbai',
              country: raw.country || 'IN',
              location: raw.location || `${raw.city || 'Mumbai'}, ${raw.country || 'IN'}`,
              risk_score: score,
              risk_level: raw.risk_level || (score >= 75 ? 'HIGH' : score > 30 ? 'MEDIUM' : 'LOW'),
              decision: dec,
              fraud_probability: typeof raw.fraud_probability === 'number' ? raw.fraud_probability : 0.05,
              anomaly_score: typeof raw.anomaly_score === 'number' ? raw.anomaly_score : 0.01,
              is_anomaly: Boolean(raw.is_anomaly),
            };

            setTotalStreamed((prev) => prev + 1);
            if (normalizedEvent.risk_score >= 75 || normalizedEvent.risk_level === 'CRITICAL' || normalizedEvent.risk_level === 'HIGH') {
              setFraudCount((prev) => prev + 1);
              setCriticalNotice(normalizedEvent);
            }
            if (normalizedEvent.decision === 'BLOCK') {
              setBlockCount((prev) => prev + 1);
            }

            if (!isPausedRef.current) {
              setEvents((prev) => [normalizedEvent, ...prev.slice(0, 79)]);
            }
          } catch (err) {
            console.error('Failed to parse websocket payload', err);
          }
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setIsConnected(false);
          reconnectTimer = setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (err) {
        console.error('WebSocket connection initialization error:', err);
      }
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const clearFeed = () => {
    setEvents([]);
    setCriticalNotice(null);
  };

  const filteredEvents = filterBlockedOnly
    ? events.filter((e) => e.decision === 'BLOCK' || e.risk_score >= 70)
    : events;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Stream"
        subtitle="Real-time telemetry of incoming payment events, velocity scoring, and automated decisions."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors shadow-xs ${
                isPaused
                  ? 'border-[#1b4332] bg-[#1b4332] text-white'
                  : 'border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] text-[#191c1d] dark:text-white hover:bg-[#faf9f5]'
              }`}
            >
              {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              <span>{isPaused ? 'Resume feed' : 'Pause feed'}</span>
            </button>

            <button
              onClick={clearFeed}
              className="rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-2 text-[#78716c] hover:text-[#191c1d] dark:hover:text-white hover:bg-[#faf9f5] transition-colors shadow-xs"
              title="Clear feed"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        }
      />

      {/* High-risk notification banner */}
      {criticalNotice && (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-xs text-rose-800 dark:text-rose-300 shadow-xs">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
            <div>
              <span className="font-bold">High-risk anomaly detected: </span>
              <span>
                Transaction <span className="font-mono font-semibold">{criticalNotice.transaction_id}</span> ({formatCurrency(criticalNotice.amount, currency)}) scored{' '}
                <span className="font-numeric font-bold text-rose-600">{criticalNotice.risk_score}</span> / 100 risk. Decision: {criticalNotice.decision}.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/transactions/${criticalNotice.transaction_id}`)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:underline"
            >
              <span>Review alert</span>
              <ArrowUpRight className="h-3 w-3" />
            </button>
            <button
              onClick={() => setCriticalNotice(null)}
              className="text-rose-400 hover:text-rose-600 ml-2"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Stream Metrics Strip matching PolicyLens */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#78716c] mb-1">
            <span>Gateway stream</span>
            <Radio className="h-3.5 w-3.5 text-[#164e3f] dark:text-[#a7f3d0] animate-pulse" />
          </div>
          <span className="text-base font-bold text-[#191c1d] dark:text-white">
            {isConnected ? 'Active pipeline' : 'Connecting…'}
          </span>
          <div className="mt-1 text-xs text-[#78716c]">
            {isConnected ? 'WebSocket listener live' : 'Attempting handshake…'}
          </div>
        </div>

        <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#78716c] mb-1">
            <span>Total processed</span>
            <Activity className="h-3.5 w-3.5 text-[#164e3f] dark:text-[#a7f3d0]" />
          </div>
          <span className="text-2xl font-bold font-numeric text-[#191c1d] dark:text-white">
            {formatNumber(totalStreamed)}
          </span>
          <div className="mt-1 text-xs text-[#78716c]">Streamed records</div>
        </div>

        <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#78716c] mb-1">
            <span>Flagged fraud</span>
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <span className="text-2xl font-bold font-numeric text-rose-600 dark:text-rose-400">
            {formatNumber(fraudCount)}
          </span>
          <div className="mt-1 text-xs text-[#78716c]">High-risk velocity</div>
        </div>

        <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#78716c] mb-1">
            <span>Blocked transactions</span>
            <Ban className="h-3.5 w-3.5 text-rose-600" />
          </div>
          <span className="text-2xl font-bold font-numeric text-[#191c1d] dark:text-white">
            {formatNumber(blockCount)}
          </span>
          <div className="mt-1 text-xs text-[#78716c]">Immediate rejection</div>
        </div>
      </div>

      {/* Live Stream Table */}
      <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] overflow-hidden shadow-xs">
        <div className="flex items-center justify-between border-b border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] px-4 py-3">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-[#164e3f] dark:text-[#a7f3d0]" />
            <span className="font-serif text-sm font-bold text-[#191c1d] dark:text-white">
              Live transaction feed ({filteredEvents.length} buffered)
            </span>
          </div>

          <label className="flex items-center gap-2 text-xs text-[#525252] dark:text-[#9aa19d] cursor-pointer">
            <input
              type="checkbox"
              checked={filterBlockedOnly}
              onChange={(e) => setFilterBlockedOnly(e.target.checked)}
              className="rounded border-[#e8e6df] text-[#1b4332] focus:ring-0"
            />
            <span>Show high-risk and blocked only</span>
          </label>
        </div>

        <div className="max-h-[550px] overflow-y-auto">
          {filteredEvents.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#78716c]">
              Waiting for live transaction telemetry stream…
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 border-b border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] text-[#525252] dark:text-[#9aa19d] text-xs font-semibold">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Transaction ID</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Decision</th>
                  <th className="px-4 py-3">Risk tier</th>
                  <th className="px-4 py-3 text-right">Score</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e6df] dark:divide-[#272d29]">
                {filteredEvents.map((evt, idx) => {
                  const isBlocked = evt.decision === 'BLOCK' || evt.risk_score >= 80;
                  return (
                    <tr
                      key={`${evt.transaction_id}-${idx}`}
                      className={`transition-colors ${
                        isBlocked
                          ? 'bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100/50 dark:hover:bg-rose-950/30'
                          : 'hover:bg-[#faf9f5] dark:hover:bg-[#1f2422]'
                      }`}
                    >
                      <td className="px-4 py-2.5 text-[#78716c] whitespace-nowrap">{evt.timestamp}</td>
                      <td className="px-4 py-2.5 font-mono font-medium text-[#191c1d] dark:text-white">
                        {evt.transaction_id.slice(0, 16)}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[#525252] dark:text-[#d1d5db]">{evt.user_id}</td>
                      <td className="px-4 py-2.5 text-right font-numeric font-bold text-[#191c1d] dark:text-white">
                        {formatCurrency(evt.amount, currency)}
                      </td>
                      <td className="px-4 py-2.5 text-[#525252] dark:text-[#9aa19d] capitalize">
                        {evt.merchant_category?.toLowerCase().replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-2.5 text-[#78716c]">
                        {evt.city}, {evt.country}
                      </td>
                      <td className="px-4 py-2.5">
                        <DecisionBadge decision={evt.decision || 'APPROVE'} size="sm" />
                      </td>
                      <td className="px-4 py-2.5">
                        <RiskBadge level={evt.risk_level} size="sm" />
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right font-bold font-numeric ${
                          evt.risk_score >= 80
                            ? 'text-rose-600'
                            : evt.risk_score >= 50
                            ? 'text-amber-600'
                            : 'text-[#164e3f] dark:text-[#34d399]'
                        }`}
                      >
                        {evt.risk_score}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => navigate(`/transactions/${evt.transaction_id}`)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#164e3f] dark:text-[#a7f3d0] hover:underline"
                        >
                          <span>Review</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
