import React, { useState } from 'react';
import { usePreferences } from '../context/PreferencesContext';
import { PageHeader } from '../components/common/PageHeader';
import { SupportedCurrency, CURRENCY_CONFIG } from '../utils/formatters';
import {
  Sun,
  Moon,
  Coins,
  ShieldAlert,
  Clock,
  Bell,
  CheckCircle2,
  Sliders,
  Save,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const {
    theme,
    setTheme,
    currency,
    setCurrency,
    riskThreshold,
    setRiskThreshold,
    autoRefreshInterval,
    setAutoRefreshInterval,
  } = usePreferences();

  const [savedBanner, setSavedBanner] = useState(false);
  const timerRef = React.useRef<any>(null);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedBanner(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setSavedBanner(false);
    }, 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Settings"
        subtitle="Choose how the application looks and how risk information is shown."
      />

      {savedBanner && (
        <div className="rounded-xl border border-[#cde2d6] dark:border-[#204a37] bg-[#ebf3ef] dark:bg-[#153226]/50 p-4 text-[#164e3f] dark:text-[#a7f3d0] text-xs font-semibold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#164e3f] dark:text-[#a7f3d0]" />
          <span>Preferences saved successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Appearance & Interface Theme */}
        <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-6 shadow-xs">
          <h3 className="font-serif text-base font-semibold text-[#191c1d] dark:text-[#f3f4f6] flex items-center gap-2 mb-1">
            <Sliders className="h-4 w-4 text-[#164e3f] dark:text-[#a7f3d0]" />
            <span>Theme</span>
          </h3>
          <p className="text-xs text-[#78716c] dark:text-[#9ca3af] mb-4">
            Choose between dark and warm paper appearance.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                theme === 'dark'
                  ? 'border-[#1b4332] bg-[#ebf3ef] dark:border-[#a7f3d0] dark:bg-[#1a382c] text-[#191c1d] dark:text-[#f3f4f6] font-medium shadow-xs'
                  : 'border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#141816] text-[#78716c] dark:text-[#9ca3af] hover:border-[#1b4332]/40'
              }`}
            >
              <Moon className="h-5 w-5 flex-shrink-0 mt-0.5 text-[#191c1d] dark:text-[#f3f4f6]" />
              <div>
                <p className="text-xs font-semibold text-[#191c1d] dark:text-[#f3f4f6]">Dark mode</p>
                <p className="text-[11px] text-[#78716c] dark:text-[#9ca3af] mt-0.5">
                  Restrained dark surfaces tailored for low-light environments.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                theme === 'light'
                  ? 'border-[#1b4332] bg-[#ebf3ef] dark:border-[#a7f3d0] dark:bg-[#1a382c] text-[#191c1d] dark:text-[#f3f4f6] font-medium shadow-xs'
                  : 'border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#141816] text-[#78716c] dark:text-[#9ca3af] hover:border-[#1b4332]/40'
              }`}
            >
              <Sun className="h-5 w-5 flex-shrink-0 mt-0.5 text-[#191c1d] dark:text-[#f3f4f6]" />
              <div>
                <p className="text-xs font-semibold text-[#191c1d] dark:text-[#f3f4f6]">Warm Paper (Light mode)</p>
                <p className="text-[11px] text-[#78716c] dark:text-[#9ca3af] mt-0.5">
                  Clean warm editorial canvas for clarity and readability.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Currency & Financial Units */}
        <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-6 shadow-xs">
          <h3 className="font-serif text-base font-semibold text-[#191c1d] dark:text-[#f3f4f6] flex items-center gap-2 mb-1">
            <Coins className="h-4 w-4 text-[#164e3f] dark:text-[#a7f3d0]" />
            <span>Currency</span>
          </h3>
          <p className="text-xs text-[#78716c] dark:text-[#9ca3af] mb-4">
            Choose currency formatting for transaction amounts.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(Object.keys(CURRENCY_CONFIG) as SupportedCurrency[]).map((currKey) => {
              const cfg = CURRENCY_CONFIG[currKey];
              const isSelected = currency === currKey;
              return (
                <button
                  key={currKey}
                  type="button"
                  onClick={() => setCurrency(currKey)}
                  className={`p-3.5 rounded-xl border text-center transition-all ${
                    isSelected
                      ? 'border-[#1b4332] bg-[#ebf3ef] dark:border-[#a7f3d0] dark:bg-[#1a382c] text-[#164e3f] dark:text-[#a7f3d0] font-bold shadow-xs'
                      : 'border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#141816] text-[#78716c] dark:text-[#9ca3af] hover:border-[#1b4332]/40'
                  }`}
                >
                  <span className="text-lg block mb-0.5">{cfg.symbol}</span>
                  <span className="text-xs font-mono font-medium">{currKey}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Risk Threshold & Automated Alerts */}
        <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-6 shadow-xs">
          <h3 className="font-serif text-base font-semibold text-[#191c1d] dark:text-[#f3f4f6] flex items-center gap-2 mb-1">
            <ShieldAlert className="h-4 w-4 text-[#164e3f] dark:text-[#a7f3d0]" />
            <span>Risk Threshold</span>
          </h3>
          <p className="text-xs text-[#78716c] dark:text-[#9ca3af] mb-4">
            Transactions with risk scores at or above this threshold trigger high-risk alerts (Recommended: 75).
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#78716c] dark:text-[#9ca3af]">Score threshold:</span>
              <span className="font-bold font-numeric text-rose-600 dark:text-rose-400 text-base">{riskThreshold} / 100</span>
            </div>
            <input
              type="range"
              min={50}
              max={95}
              step={1}
              value={riskThreshold}
              onChange={(e) => setRiskThreshold(parseInt(e.target.value, 10))}
              className="w-full accent-[#1b4332] cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-[#78716c] dark:text-[#9ca3af]">
              <span>50 (Sensitive)</span>
              <span>75 (Recommended)</span>
              <span>95 (Strict)</span>
            </div>
          </div>
        </div>

        {/* Live Refresh */}
        <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-6 shadow-xs">
          <h3 className="font-serif text-base font-semibold text-[#191c1d] dark:text-[#f3f4f6] flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-[#164e3f] dark:text-[#a7f3d0]" />
            <span>Auto-Refresh</span>
          </h3>
          <p className="text-xs text-[#78716c] dark:text-[#9ca3af] mb-4">
            How frequently live dashboard feeds and metrics refresh.
          </p>

          <div className="flex flex-wrap gap-3">
            {[
              { label: '10 seconds', val: 10 },
              { label: '30 seconds (Default)', val: 30 },
              { label: '60 seconds', val: 60 },
              { label: 'Manual only', val: 0 },
            ].map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => setAutoRefreshInterval(opt.val)}
                className={`px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  autoRefreshInterval === opt.val
                    ? 'border-[#1b4332] bg-[#1b4332] text-white shadow-xs'
                    : 'border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#141816] text-[#78716c] dark:text-[#9ca3af] hover:border-[#1b4332]/40'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1b4332] hover:bg-[#143326] px-6 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>Save changes</span>
          </button>
        </div>
      </form>
    </div>
  );
};
