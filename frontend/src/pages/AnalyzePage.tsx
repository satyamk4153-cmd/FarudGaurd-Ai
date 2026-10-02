import React, { useState } from 'react';
import { predictionApi } from '../api/client';
import { PageHeader } from '../components/common/PageHeader';
import { RiskScoreGauge } from '../components/common/RiskScoreGauge';
import { DecisionBadge } from '../components/common/DecisionBadge';
import { ShapWaterfall } from '../components/common/ShapWaterfall';
import { usePreferences } from '../context/PreferencesContext';
import type { AnalyzeRequest, AnalyzeResponse } from '../types';
import {
  Play,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Clock,
  Zap,
} from 'lucide-react';

const PRESETS: { label: string; description: string; data: AnalyzeRequest }[] = [
  {
    label: 'Legitimate Grocery Purchase',
    description: 'Routine local transaction, known device, normal spending profile.',
    data: {
      amount: 485.0,
      currency: 'INR',
      transaction_type: 'PURCHASE',
      merchant_category: 'GROCERY',
      channel: 'POS',
      city: 'Mumbai',
      country: 'India',
      is_international: false,
      ip_address: '103.21.144.10',
      device_type: 'MOBILE',
      device_risk_score: 0.12,
      ip_risk_score: 0.08,
      velocity_1h: 1,
      velocity_24h: 3,
      avg_amount_ratio: 0.95,
      distance_from_home: 4.2,
      is_first_time_merchant: false,
      is_failed_attempt_prior: false,
      user_id: 'USR-8921',
    },
  },
  {
    label: 'Suspicious Cross-Border Wire',
    description: 'Offshore high-velocity transaction with high device/IP risk score.',
    data: {
      amount: 485000.0,
      currency: 'INR',
      transaction_type: 'WIRE_TRANSFER',
      merchant_category: 'CRYPTO',
      channel: 'API',
      city: 'Lagos',
      country: 'Nigeria',
      is_international: true,
      ip_address: '102.89.23.41',
      device_type: 'EMULATOR',
      device_risk_score: 0.91,
      ip_risk_score: 0.88,
      velocity_1h: 6,
      velocity_24h: 14,
      avg_amount_ratio: 7.8,
      distance_from_home: 8400.0,
      is_first_time_merchant: true,
      is_failed_attempt_prior: true,
      user_id: 'USR-3104',
    },
  },
  {
    label: 'Velocity Burst Attack',
    description: 'Sudden spike of rapid transactions following a failed attempt.',
    data: {
      amount: 92000.0,
      currency: 'INR',
      transaction_type: 'PURCHASE',
      merchant_category: 'ELECTRONICS',
      channel: 'WEB',
      city: 'Delhi',
      country: 'India',
      is_international: false,
      ip_address: '172.56.21.9',
      device_type: 'DESKTOP',
      device_risk_score: 0.65,
      ip_risk_score: 0.58,
      velocity_1h: 8,
      velocity_24h: 18,
      avg_amount_ratio: 4.2,
      distance_from_home: 120.0,
      is_first_time_merchant: true,
      is_failed_attempt_prior: true,
      user_id: 'USR-6612',
    },
  },
  {
    label: 'International Luxury Travel',
    description: 'Elevated transaction amount in overseas travel category requiring review.',
    data: {
      amount: 142000.0,
      currency: 'INR',
      transaction_type: 'PAYMENT',
      merchant_category: 'TRAVEL',
      channel: 'WEB',
      city: 'Dubai',
      country: 'UAE',
      is_international: true,
      ip_address: '194.67.210.14',
      device_type: 'MOBILE',
      device_risk_score: 0.42,
      ip_risk_score: 0.38,
      velocity_1h: 2,
      velocity_24h: 5,
      avg_amount_ratio: 2.8,
      distance_from_home: 1950.0,
      is_first_time_merchant: true,
      is_failed_attempt_prior: false,
      user_id: 'USR-5029',
    },
  },
];

export const AnalyzePage: React.FC = () => {
  const { formatAmount } = usePreferences();
  const [activePreset, setActivePreset] = useState<number>(0);
  const [formData, setFormData] = useState<AnalyzeRequest>(PRESETS[0].data);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = React.useRef(true);
  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handlePresetSelect = (index: number) => {
    setActivePreset(index);
    setFormData(PRESETS[index].data);
    setResult(null);
    setError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    const isNum = type === 'number';

    setFormData((prev) => ({
      ...prev,
      [name]: isCheckbox
        ? (e.target as HTMLInputElement).checked
        : isNum
        ? parseFloat(value) || 0
        : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await predictionApi.predictSingle(formData);
      if (!isMountedRef.current) return;
      setResult(response);
    } catch (err: any) {
      if (!isMountedRef.current) return;
      console.error('Prediction failed', err);
      setError(err?.response?.data?.detail || err?.message || 'Prediction request failed. Verify engine connectivity.');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Anomaly Detection"
        subtitle="Simulate and score transactions against multi-signal models with real-time SHAP explainability."
      />

      {error && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 p-4 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Preset Scenarios Selector */}
      <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-3 text-xs font-bold text-[#191c1d] dark:text-white uppercase tracking-wider">
          <Sliders className="h-4 w-4 text-[#164e3f] dark:text-[#a7f3d0]" />
          <span>Test scenarios</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PRESETS.map((preset, idx) => (
            <button
              key={preset.label}
              onClick={() => handlePresetSelect(idx)}
              className={`rounded-lg border p-3.5 text-left transition-all ${
                activePreset === idx
                  ? 'border-[#1b4332] bg-[#ebf3ef] text-[#164e3f] dark:bg-[#1a382c] dark:text-[#a7f3d0] font-medium shadow-xs'
                  : 'border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] text-[#525252] dark:text-[#9aa19d] hover:border-[#1b4332]/40'
              }`}
            >
              <div className="text-xs font-bold text-[#191c1d] dark:text-white">{preset.label}</div>
              <div className="text-[11px] text-[#78716c] dark:text-[#9aa19d] mt-1 line-clamp-2 leading-relaxed">{preset.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Form Column */}
        <div className="lg:col-span-5 rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-6 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Group 1: Transaction Information */}
            <div className="space-y-3.5">
              <span className="font-serif text-sm font-bold text-[#191c1d] dark:text-white block border-b border-[#e8e6df] dark:border-[#272d29] pb-2">
                Transaction parameters
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#525252] dark:text-[#9aa19d] mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] px-3 py-1.5 text-xs text-[#191c1d] dark:text-[#f0f3f1] focus:border-[#1b4332] dark:focus:border-[#a7f3d0] focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#525252] dark:text-[#9aa19d] mb-1">
                    Transaction type
                  </label>
                  <select
                    name="transaction_type"
                    value={formData.transaction_type}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] px-3 py-1.5 text-xs text-[#191c1d] dark:text-[#f0f3f1] focus:border-[#1b4332] dark:focus:border-[#a7f3d0] focus:outline-none transition-colors"
                  >
                    <option value="PURCHASE">Purchase</option>
                    <option value="TRANSFER">Transfer</option>
                    <option value="WIRE_TRANSFER">Wire transfer</option>
                    <option value="WITHDRAWAL">Withdrawal</option>
                    <option value="PAYMENT">Payment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#525252] dark:text-[#9aa19d] mb-1">
                    Merchant category
                  </label>
                  <select
                    name="merchant_category"
                    value={formData.merchant_category}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] px-3 py-1.5 text-xs text-[#191c1d] dark:text-[#f0f3f1] focus:border-[#1b4332] dark:focus:border-[#a7f3d0] focus:outline-none transition-colors"
                  >
                    <option value="GROCERY">Grocery</option>
                    <option value="RETAIL">Retail</option>
                    <option value="ELECTRONICS">Electronics</option>
                    <option value="TRAVEL">Travel</option>
                    <option value="ENTERTAINMENT">Entertainment</option>
                    <option value="GAMBLING">Gambling</option>
                    <option value="CRYPTO">Crypto</option>
                    <option value="FINANCIAL_SERVICES">Financial services</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#525252] dark:text-[#9aa19d] mb-1">Channel</label>
                  <select
                    name="channel"
                    value={formData.channel}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] px-3 py-1.5 text-xs text-[#191c1d] dark:text-[#f0f3f1] focus:border-[#1b4332] dark:focus:border-[#a7f3d0] focus:outline-none transition-colors"
                  >
                    <option value="POS">POS (Terminal)</option>
                    <option value="WEB">Web</option>
                    <option value="MOBILE_APP">Mobile app</option>
                    <option value="ATM">ATM</option>
                    <option value="API">API</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Group 2: Location */}
            <div className="space-y-3.5">
              <span className="font-serif text-sm font-bold text-[#191c1d] dark:text-white block border-b border-[#e8e6df] dark:border-[#272d29] pb-2">
                Origin & location
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#525252] dark:text-[#9aa19d] mb-1">City</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] px-3 py-1.5 text-xs text-[#191c1d] dark:text-[#f0f3f1] focus:border-[#1b4332] dark:focus:border-[#a7f3d0] focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#525252] dark:text-[#9aa19d] mb-1">Country</label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] px-3 py-1.5 text-xs text-[#191c1d] dark:text-[#f0f3f1] focus:border-[#1b4332] dark:focus:border-[#a7f3d0] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-[#525252] dark:text-[#9aa19d] pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_international"
                  checked={formData.is_international}
                  onChange={handleInputChange}
                  className="rounded border-[#e8e6df] text-[#1b4332] focus:ring-0"
                />
                <span>Cross-border transaction</span>
              </label>
            </div>

            {/* Group 3: Device & Access */}
            <div className="space-y-3.5">
              <span className="font-serif text-sm font-bold text-[#191c1d] dark:text-white block border-b border-[#e8e6df] dark:border-[#272d29] pb-2">
                Device and risk signals
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#525252] dark:text-[#9aa19d] mb-1">Device risk (0 - 1)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    name="device_risk_score"
                    value={formData.device_risk_score}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] px-3 py-1.5 text-xs text-[#191c1d] dark:text-[#f0f3f1] focus:border-[#1b4332] dark:focus:border-[#a7f3d0] focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#525252] dark:text-[#9aa19d] mb-1">IP risk (0 - 1)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    name="ip_risk_score"
                    value={formData.ip_risk_score}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] px-3 py-1.5 text-xs text-[#191c1d] dark:text-[#f0f3f1] focus:border-[#1b4332] dark:focus:border-[#a7f3d0] focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Group 4: Recent Activity & Risk Indicators */}
            <div className="space-y-3.5">
              <span className="font-serif text-sm font-bold text-[#191c1d] dark:text-white block border-b border-[#e8e6df] dark:border-[#272d29] pb-2">
                Velocity & history
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#525252] dark:text-[#9aa19d] mb-1">Velocity (1h)</label>
                  <input
                    type="number"
                    name="velocity_1h"
                    value={formData.velocity_1h}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] px-3 py-1.5 text-xs text-[#191c1d] dark:text-[#f0f3f1] focus:border-[#1b4332] dark:focus:border-[#a7f3d0] focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#525252] dark:text-[#9aa19d] mb-1">Velocity (24h)</label>
                  <input
                    type="number"
                    name="velocity_24h"
                    value={formData.velocity_24h}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] px-3 py-1.5 text-xs text-[#191c1d] dark:text-[#f0f3f1] focus:border-[#1b4332] dark:focus:border-[#a7f3d0] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-[#525252] dark:text-[#9aa19d] pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_first_time_merchant"
                  checked={formData.is_first_time_merchant}
                  onChange={handleInputChange}
                  className="rounded border-[#e8e6df] text-[#1b4332] focus:ring-0"
                />
                <span>First-time merchant for customer</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#1b4332] text-white hover:bg-[#143326] py-2.5 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  <span>Evaluating risk model…</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  <span>Run risk inference</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Prediction Results Column */}
        <div className="lg:col-span-7 space-y-5">
          {result ? (
            <>
              {/* Verdict Header Card */}
              <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-[#e8e6df] dark:border-[#272d29] pb-5">
                  <div className="flex items-center gap-6">
                    <RiskScoreGauge score={result.risk_score} riskLevel={result.risk_level} size="md" />
                    <div className="space-y-1.5">
                      <div className="text-xs text-[#78716c]">Model verdict</div>
                      <DecisionBadge decision={result.decision} size="md" />
                      <div className="text-xs text-[#525252] dark:text-[#9aa19d]">
                        Inference time:{' '}
                        <span className="font-numeric text-[#164e3f] dark:text-[#34d399] font-bold">
                          {result.prediction_time_ms.toFixed(1)} ms
                        </span>
                      </div>
                      <div className="text-xs font-mono text-[#78716c]">
                        Engine: {result.model_version}
                      </div>
                    </div>
                  </div>

                  {/* Multi-signal Breakdown */}
                  <div className="w-full sm:w-56 space-y-2 rounded-lg bg-[#faf9f5] dark:bg-[#121514] border border-[#e8e6df] dark:border-[#272d29] p-3.5 text-xs">
                    <div className="text-xs font-bold text-[#191c1d] dark:text-white">
                      Score components
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#78716c]">Supervised (55%):</span>
                      <span className="text-[#191c1d] dark:text-white font-numeric font-bold">
                        {(result.breakdown?.supervised_component || 0).toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#78716c]">Anomaly (25%):</span>
                      <span className="text-[#191c1d] dark:text-white font-numeric font-bold">
                        {(result.breakdown?.anomaly_component || 0).toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#78716c]">Behavioral (20%):</span>
                      <span className="text-[#191c1d] dark:text-white font-numeric font-bold">
                        {(result.breakdown?.behavioral_component || 0).toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Triggered Rules & Recommended Actions */}
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="font-serif text-sm font-bold text-[#191c1d] dark:text-white block mb-2">
                      Triggered rules
                    </span>
                    {result.triggered_rules && result.triggered_rules.length > 0 ? (
                      <div className="space-y-2">
                        {result.triggered_rules.map((rule, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 rounded-lg bg-[#faf9f5] dark:bg-[#121514] border border-[#e8e6df] dark:border-[#272d29] p-2.5 text-xs"
                          >
                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <div className="font-semibold text-[#191c1d] dark:text-white">{rule.rule_name}</div>
                              <div className="text-[11px] text-[#78716c] dark:text-[#9aa19d]">{rule.description}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-lg bg-[#ebf3ef] dark:bg-[#153226]/50 border border-[#cde2d6] dark:border-[#204a37] p-2.5 text-xs text-[#164e3f] dark:text-[#a7f3d0]">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>No policy breaches triggered.</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="font-serif text-sm font-bold text-[#191c1d] dark:text-white block mb-2">
                      Recommended actions
                    </span>
                    <div className="space-y-2">
                      {result.recommended_actions?.map((act, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 rounded-lg bg-[#faf9f5] dark:bg-[#121514] border border-[#e8e6df] dark:border-[#272d29] p-2.5 text-xs text-[#525252] dark:text-[#d1d5db]"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-[#1b4332] dark:bg-[#a7f3d0] shrink-0" />
                          <span>{act}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* SHAP Waterfall Chart */}
              <ShapWaterfall
                factors={result.top_risk_factors}
                title="Top risk factors"
                subtitle="Feature contributions to this transaction risk score"
              />
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-[#d8d5cb] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-14 text-center text-[#78716c]">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#ebf3ef] dark:bg-[#1a382c] text-[#164e3f] dark:text-[#a7f3d0] mb-3 shadow-xs">
                <Zap className="h-6 w-6 stroke-[1.75]" />
              </div>
              <h3 className="font-serif text-base font-bold text-[#191c1d] dark:text-white mb-1">No transaction evaluated yet</h3>
              <p className="text-xs text-[#78716c] dark:text-[#9aa19d] max-w-sm mx-auto leading-relaxed">
                Configure transaction parameters or select a test scenario on the left, then click
                "Run risk inference".
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
