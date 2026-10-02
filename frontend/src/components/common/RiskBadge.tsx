import React from 'react';
import { ShieldCheck, AlertCircle, AlertTriangle, ShieldAlert } from 'lucide-react';
import type { RiskLevel } from '../../types';

interface RiskBadgeProps {
  level: RiskLevel | string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, size = 'md' }) => {
  const normLevel = (level || 'LOW').toUpperCase();

  const config = {
    LOW: {
      border: 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200',
      icon: <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />,
      label: 'Low risk',
    },
    MEDIUM: {
      border: 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200',
      icon: <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />,
      label: 'Medium risk',
    },
    HIGH: {
      border: 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200',
      icon: <AlertTriangle className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400 flex-shrink-0" />,
      label: 'High risk',
    },
    CRITICAL: {
      border: 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium',
      icon: <ShieldAlert className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 flex-shrink-0" />,
      label: 'Critical risk',
    },
  }[normLevel] || {
    border: 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200',
    icon: <AlertCircle className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />,
    label: normLevel,
  };

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1.5',
    md: 'text-xs font-medium px-2.5 py-1 gap-1.5',
    lg: 'text-sm font-medium px-3 py-1.5 gap-2',
  }[size];

  return (
    <span className={`inline-flex items-center rounded-md border shadow-xs ${config.border} ${sizeClasses}`}>
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
};
