import React, { useState } from 'react';
import { copilotApi } from '../api/client';
import { PageHeader } from '../components/common/PageHeader';
import {
  Send,
  Database,
  ArrowRight,
  ShieldAlert,
  Search,
  CheckCircle2,
  HelpCircle,
  FileText,
  AlertTriangle,
  Cpu,
  Layers,
  Info,
} from 'lucide-react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

interface CopilotEvidenceData {
  transaction_id?: string;
  model?: string;
  fraud_probability?: number;
  risk_score?: number;
  sources: string[];
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: string[];
  suggested_followups?: string[];
  evidence?: CopilotEvidenceData | null;
  tool_calls?: string[];
  provider?: string;
  mode?: string;
}

const ANALYST_QUERIES = [
  "Show today's highest-risk transactions",
  "How many critical alerts are currently open?",
  "What is the active model's PR-AUC score?",
  "Summarize 30-day portfolio fraud exposure",
];

export const CopilotPage: React.FC = () => {
  const [copilotStatus, setCopilotStatus] = useState<{
    provider: string;
    mode: string;
    model: string;
    available_tools_count: number;
  }>({
    provider: 'grounded-fallback',
    mode: 'fallback',
    model: 'gemini-2.5-flash',
    available_tools_count: 16,
  });

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'assistant',
      content:
        'Ask about transactions, alerts, investigations or model results. Responses are grounded in FraudGuard data.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sources: ['Transaction database', 'Model registry'],
      suggested_followups: ANALYST_QUERIES.slice(0, 2),
      provider: 'grounded-fallback',
      mode: 'fallback',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const isMountedRef = React.useRef(true);
  React.useEffect(() => {
    isMountedRef.current = true;
    copilotApi
      .getStatus()
      .then((status) => {
        if (isMountedRef.current && status) {
          setCopilotStatus({
            provider: status.provider || 'grounded-fallback',
            mode: status.mode || 'fallback',
            model: status.model || 'gemini-2.5-flash',
            available_tools_count: status.available_tools_count || 16,
          });
        }
      })
      .catch(() => {
        // Keep initial fallback status
      });

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const sendMessage = async (queryText: string) => {
    if (!queryText.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      content: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    // Format conversation history for multi-turn assistant context
    const historyPayload = nextMessages.slice(-6).map((m) => ({
      role: m.sender,
      content: m.content,
    }));

    try {
      const response = await copilotApi.ask(queryText, historyPayload);
      if (!isMountedRef.current) return;

      const assistantMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        content: response.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: response.sources,
        suggested_followups: response.suggested_followups,
        evidence: response.evidence,
        tool_calls: response.tool_calls,
        provider: response.provider || copilotStatus.provider,
        mode: response.mode || copilotStatus.mode,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (response.mode && response.provider) {
        setCopilotStatus((prev) => ({
          provider: response.provider || prev.provider,
          mode: response.mode || prev.mode,
          model: prev.model,
          available_tools_count: prev.available_tools_count,
        }));
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      const errorMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        content:
          'Unable to complete query. Please check connection and retry.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: 'grounded-fallback',
        mode: 'fallback',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const isLive = copilotStatus.mode === 'live' || copilotStatus.provider === 'gemini';

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Assistant"
        subtitle="Ask questions about transactions, alerts, cases, or model explainability in natural language."
      />

      {/* Suggested Quick Queries */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[#78716c] dark:text-[#9ca3af] mr-1">Suggested questions:</span>
        {ANALYST_QUERIES.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => sendMessage(prompt)}
            disabled={loading}
            className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] px-3.5 py-1.5 text-xs text-[#191c1d] dark:text-[#f3f4f6] hover:bg-[#ebf3ef] hover:border-[#cde2d6] hover:text-[#164e3f] dark:hover:bg-[#1a382c] dark:hover:border-[#234e3e] dark:hover:text-[#a7f3d0] transition-colors disabled:opacity-50 shadow-xs"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat & Productivity Console */}
      <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] shadow-xs flex flex-col h-[580px] overflow-hidden">
        {/* Console Header Bar */}
        <div className="flex items-center justify-between border-b border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#141816] px-5 py-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isLive ? 'bg-emerald-500' : 'bg-slate-400'
              }`}
            />
            <span className="font-semibold text-[#191c1d] dark:text-[#f3f4f6]">
              {isLive ? 'Gemini 2.5 — Live Grounding' : 'Local Fallback Engine'}
            </span>
            <span className="text-xs text-[#78716c] dark:text-[#9ca3af] border-l border-[#e8e6df] dark:border-[#272d29] pl-2.5">
              {isLive ? 'Google Gemini 2.5 Flash' : 'Grounded Assistant'}
            </span>
          </div>
          <span className="inline-flex items-center rounded-full bg-[#ebf3ef] dark:bg-[#1a382c] border border-[#cde2d6] dark:border-[#234e3e] px-2.5 py-0.5 text-[11px] font-semibold text-[#164e3f] dark:text-[#a7f3d0]">
            {isLive ? 'Connected' : 'Local Mode'}
          </span>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div className="flex items-center gap-2 text-xs text-[#78716c] dark:text-[#9ca3af] mb-1 px-1">
                <span className="font-medium">{msg.sender === 'user' ? 'You' : 'FraudGuard Copilot'}</span>
                <span>•</span>
                <span>{msg.timestamp}</span>
              </div>

              <div
                className={`max-w-3xl rounded-2xl p-4 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'rounded-tr-sm bg-[#1b4332] text-white shadow-xs'
                    : 'rounded-tl-sm bg-[#faf9f5] dark:bg-[#141816] border border-[#e8e6df] dark:border-[#272d29] text-[#191c1d] dark:text-[#f3f4f6]'
                }`}
              >
                <div className="whitespace-pre-line font-sans">{msg.content}</div>

                {/* Structured Evidence Section */}
                {msg.evidence && (
                  <div className="mt-3 p-3.5 rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] shadow-2xs">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#191c1d] dark:text-[#f3f4f6] pb-2 border-b border-[#e8e6df] dark:border-[#272d29]">
                      <span className="flex items-center gap-1.5">
                        <Cpu className="h-3.5 w-3.5 text-[#164e3f] dark:text-[#a7f3d0]" />
                        <span>Retrieved Evidence</span>
                      </span>
                      {msg.evidence.transaction_id && (
                        <span className="text-[#191c1d] dark:text-[#f3f4f6] font-mono font-bold">
                          {msg.evidence.transaction_id}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2.5">
                      {msg.evidence.model && (
                        <div>
                          <span className="text-[#78716c] dark:text-[#9ca3af] block text-[11px]">Model</span>
                          <span className="text-[#191c1d] dark:text-[#f3f4f6] font-medium truncate block font-mono text-[11px]">
                            {msg.evidence.model}
                          </span>
                        </div>
                      )}
                      {msg.evidence.risk_score !== undefined && msg.evidence.risk_score !== null && (
                        <div>
                          <span className="text-[#78716c] dark:text-[#9ca3af] block text-[11px]">Risk score</span>
                          <span className="text-rose-600 dark:text-rose-400 font-numeric font-bold">
                            {msg.evidence.risk_score} / 100
                          </span>
                        </div>
                      )}
                      {msg.evidence.fraud_probability !== undefined && msg.evidence.fraud_probability !== null && (
                        <div>
                          <span className="text-[#78716c] dark:text-[#9ca3af] block text-[11px]">Fraud probability</span>
                          <span className="text-rose-600 dark:text-rose-400 font-numeric font-bold">
                            {(msg.evidence.fraud_probability * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}
                      {msg.evidence.sources && msg.evidence.sources.length > 0 && (
                        <div>
                          <span className="text-[#78716c] dark:text-[#9ca3af] block text-[11px]">Sources</span>
                          <span className="text-[#78716c] dark:text-[#9ca3af] truncate block text-[11px]">
                            {msg.evidence.sources.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Technical details behind collapsible disclosure */}
                {msg.tool_calls && msg.tool_calls.length > 0 && (
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer text-[#78716c] dark:text-[#9ca3af] hover:text-[#191c1d] dark:hover:text-[#f3f4f6] text-[11px] select-none flex items-center gap-1">
                      <Layers className="h-3 w-3" />
                      <span>View technical details ({msg.tool_calls.length} tools executed)</span>
                    </summary>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-2 text-[10px] font-mono text-[#78716c]">
                      {msg.tool_calls.map((t, idx) => (
                        <code
                          key={idx}
                          className="rounded-lg bg-white dark:bg-[#1f2522] border border-[#e8e6df] dark:border-[#272d29] px-2 py-0.5 text-[#191c1d] dark:text-[#f3f4f6]"
                        >
                          {t}
                        </code>
                      ))}
                    </div>
                  </details>
                )}

                {/* Grounded Evidence Sources */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-[#e8e6df] dark:border-[#272d29] flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-[#78716c] dark:text-[#9ca3af] flex items-center gap-1 text-[11px]">
                      <Database className="h-3 w-3" />
                      <span>Data sources:</span>
                    </span>
                    {msg.sources.map((src, i) => (
                      <span
                        key={i}
                        className="rounded-md bg-white dark:bg-[#1f2522] border border-[#e8e6df] dark:border-[#272d29] px-2 py-0.5 text-[#191c1d] dark:text-[#f3f4f6] text-[11px]"
                      >
                        {src}
                      </span>
                    ))}
                  </div>
                )}

                {/* Follow-up Suggestions */}
                {msg.suggested_followups && msg.suggested_followups.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-[#e8e6df] dark:border-[#272d29] space-y-1">
                    <span className="text-xs text-[#78716c] dark:text-[#9ca3af] block">
                      Suggested follow-ups:
                    </span>
                    {msg.suggested_followups.map((fu, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(fu)}
                        className="text-left text-[#164e3f] dark:text-[#a7f3d0] hover:underline flex items-center gap-1.5 text-xs font-medium"
                      >
                        <ArrowRight className="h-3 w-3 shrink-0 text-[#164e3f] dark:text-[#a7f3d0]" />
                        <span>{fu}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Copilot Provider Transparency Badge */}
                {msg.sender === 'assistant' && (
                  <div className="mt-2.5 pt-2 border-t border-[#e8e6df] dark:border-[#272d29] flex items-center justify-between text-[10px] font-mono text-[#78716c] dark:text-[#9ca3af]">
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          msg.mode === 'live' ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      />
                      <span className="font-semibold">
                        {msg.mode === 'live'
                          ? 'Gemini Copilot — Live'
                          : 'Analyst Copilot — Local Fallback'}
                      </span>
                    </span>
                    <span className="text-[#78716c] dark:text-[#9ca3af]">
                      {msg.provider === 'gemini' ? 'gemini-2.5-flash' : 'grounded-fallback'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-[#78716c] dark:text-[#9ca3af] font-mono py-2">
              <LoadingSpinner size="sm" label="" />
              <span>Querying database and generating grounded answer...</span>
            </div>
          )}
        </div>

        {/* Input Bar & Subtle Disclaimer */}
        <div className="border-t border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#141816] p-4">
          <form onSubmit={handleSubmit} className="flex items-center gap-2.5">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about live transactions, critical alerts, or model explainability..."
              disabled={loading}
              className="flex-1 rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] px-4 py-2.5 text-xs text-[#191c1d] dark:text-[#f3f4f6] placeholder-[#78716c] focus:outline-none focus:border-[#1b4332] focus:ring-1 focus:ring-[#1b4332] transition-colors shadow-2xs"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1b4332] hover:bg-[#143326] text-white px-5 py-2.5 text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Send</span>
            </button>
          </form>

          {/* Section 81: AI Disclaimer */}
          <div className="mt-2.5 text-center text-[10px] font-mono text-[#78716c] dark:text-[#9ca3af]">
            Responses are generated from FraudGuard data and may require analyst verification.
          </div>
        </div>
      </div>
    </div>
  );
};
