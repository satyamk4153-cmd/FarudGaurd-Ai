import React from 'react';
import type { ShapContribution } from '../../types';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface ShapWaterfallProps {
  factors: ShapContribution[];
  title?: string;
  subtitle?: string;
}

export const ShapWaterfall: React.FC<ShapWaterfallProps> = ({
  factors,
  title = 'Top risk factors',
  subtitle = 'Feature contributions to the transaction risk score',
}) => {
  if (!factors || factors.length === 0) {
    return (
      <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] p-6 text-center text-[#78716c] text-xs">
        No feature contributions available for this transaction.
      </div>
    );
  }

  // Find max absolute value to scale bars proportionally
  const maxAbsValue = Math.max(...factors.map((f) => Math.abs(f.shap_value)), 0.01);

  return (
    <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-6 shadow-xs">
      <div className="mb-4">
        <h3 className="font-serif text-base font-bold text-[#191c1d] dark:text-white">{title}</h3>
        {subtitle && <p className="text-xs text-[#78716c] dark:text-[#9aa19d] mt-0.5">{subtitle}</p>}
      </div>

      <div className="space-y-3">
        {factors.map((factor, idx) => {
          const isRiskIncreaser = factor.shap_value > 0;
          const isNeutral = Math.abs(factor.shap_value) < 0.001;
          const barWidthPercent = Math.min(100, Math.round((Math.abs(factor.shap_value) / maxAbsValue) * 100));

          return (
            <div key={idx} className="group rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] p-3.5 hover:border-[#1b4332]/40 transition-colors">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-2">
                  {isNeutral ? (
                    <Minus className="h-4 w-4 text-[#78716c]" />
                  ) : isRiskIncreaser ? (
                    <ArrowUpRight className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-[#164e3f] dark:text-[#34d399]" />
                  )}
                  <span className="font-medium text-[#191c1d] dark:text-white">{factor.feature_label || factor.feature}</span>
                  <span className="text-[11px] text-[#525252] dark:text-[#9aa19d] bg-white dark:bg-[#171b19] px-2 py-0.5 rounded border border-[#e8e6df] dark:border-[#272d29] font-mono">
                    Val: {String(factor.feature_value)}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`font-mono font-bold text-xs ${
                      isRiskIncreaser ? 'text-rose-600 dark:text-rose-400' : isNeutral ? 'text-[#78716c]' : 'text-[#164e3f] dark:text-[#34d399]'
                    }`}
                  >
                    {factor.shap_value > 0 ? `+${factor.shap_value.toFixed(4)}` : factor.shap_value.toFixed(4)}
                  </span>
                  <span className="text-[11px] font-mono text-[#78716c] w-12 text-right">
                    {factor.percentage_contribution?.toFixed(1) || '0.0'}%
                  </span>
                </div>
              </div>

              {/* Progress bar container */}
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-[#e8e6df] dark:bg-[#272d29]">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isRiskIncreaser
                      ? 'bg-rose-600'
                      : isNeutral
                      ? 'bg-[#94a3b8]'
                      : 'bg-[#1b4332]'
                  }`}
                  style={{ width: `${barWidthPercent}%` }}
                />
              </div>

              <div className="mt-1 flex items-center justify-between text-[11px] text-[#78716c]">
                <span className="font-mono text-[10px]">{factor.feature}</span>
                <span>
                  {isRiskIncreaser
                    ? 'Increases risk'
                    : isNeutral
                    ? 'Neutral'
                    : 'Reduces risk'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[#e8e6df] dark:border-[#272d29] pt-3 text-xs text-[#78716c]">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-rose-600" />
          <span>Increases risk (+)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#1b4332]" />
          <span>Reduces risk (−)</span>
        </div>
      </div>
    </div>
  );
};
