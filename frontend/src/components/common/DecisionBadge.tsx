import React from 'react';
import { CheckCircle2, AlertCircle, Ban } from 'lucide-react';
import type { DecisionType } from '../../types';

interface DecisionBadgeProps {
  decision: DecisionType | string;
  size?: 'sm' | 'md';
}

export const DecisionBadge: React.FC<DecisionBadgeProps> = ({ decision, size = 'md' }) => {
  const norm = (decision || 'REVIEW').toUpperCase();

  const config = {
    APPROVE: {
      border: 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200',
      icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />,
      label: 'Approved',
    },
    REVIEW: {
      border: 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200',
      icon: <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />,
      label: 'Needs Review',
    },
    BLOCK: {
      border: 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200',
      icon: <Ban className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 flex-shrink-0" />,
      label: 'Blocked',
    },
  }[norm] || {
    border: 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300',
    icon: <AlertCircle className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />,
    label: norm,
  };

  const sizeClasses = size === 'sm' ? 'text-[11px] px-2 py-0.5 gap-1.5' : 'text-xs font-medium px-2.5 py-1 gap-1.5';

  return (
    <span className={`inline-flex items-center rounded-md border shadow-xs ${config.border} ${sizeClasses}`}>
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
};
