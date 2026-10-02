import React from 'react';
import { RiskBadge } from './RiskBadge';
import type { RiskLevel } from '../../types';

interface RiskScoreGaugeProps {
  score: number; // 0 - 100
  riskLevel: RiskLevel | string;
  size?: 'sm' | 'md' | 'lg';
  showBands?: boolean;
}

export const RiskScoreGauge: React.FC<RiskScoreGaugeProps> = ({
  score,
  riskLevel,
  size = 'md',
  showBands = true,
}) => {
  // Clamp score between 0 and 100
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));

  // Gauge dimensions
  const dimensions = {
    sm: { width: 140, height: 80, stroke: 10, radius: 55, fontSize: 'text-2xl' },
    md: { width: 200, height: 115, stroke: 14, radius: 80, fontSize: 'text-4xl' },
    lg: { width: 260, height: 145, stroke: 18, radius: 105, fontSize: 'text-5xl' },
  }[size];

  // SVG semicircular arc math
  const circumference = Math.PI * dimensions.radius;
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;

  const getColor = (s: number) => {
    if (s >= 80) return '#e11d48'; // Rose
    if (s >= 60) return '#ea580c'; // Orange
    if (s >= 30) return '#d97706'; // Amber
    return '#059669'; // Emerald
  };

  const currentColor = getColor(normalizedScore);

  return (
    <div className="flex flex-col items-center justify-center p-3 text-center">
      <div className="relative" style={{ width: dimensions.width, height: dimensions.height }}>
        <svg
          width={dimensions.width}
          height={dimensions.height + dimensions.stroke}
          className="overflow-visible"
        >
          {/* Background track */}
          <path
            d={`M ${dimensions.stroke / 2} ${dimensions.height} A ${dimensions.radius} ${dimensions.radius} 0 0 1 ${
              dimensions.width - dimensions.stroke / 2
            } ${dimensions.height}`}
            fill="none"
            className="stroke-slate-200 dark:stroke-slate-800"
            strokeWidth={dimensions.stroke}
            strokeLinecap="round"
          />

          {/* Active colored score arc */}
          <path
            d={`M ${dimensions.stroke / 2} ${dimensions.height} A ${dimensions.radius} ${dimensions.radius} 0 0 1 ${
              dimensions.width - dimensions.stroke / 2
            } ${dimensions.height}`}
            fill="none"
            stroke={currentColor}
            strokeWidth={dimensions.stroke}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center score readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className={`${dimensions.fontSize} font-bold font-numeric tracking-tight text-slate-900 dark:text-white`}>
            {normalizedScore}
          </span>
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500">/ 100</span>
        </div>
      </div>

      <div className="mt-3">
        <RiskBadge level={riskLevel} size="md" />
      </div>

      {showBands && (
        <div className="mt-3 flex w-full max-w-[220px] items-center justify-between text-[10px] font-mono text-slate-500">
          <span className="text-emerald-600 dark:text-emerald-400">0-30 Low</span>
          <span className="text-amber-600 dark:text-amber-400">30-60 Med</span>
          <span className="text-orange-600 dark:text-orange-400">60-80 High</span>
          <span className="text-rose-600 dark:text-rose-400">80+ Crit</span>
        </div>
      )}
    </div>
  );
};
