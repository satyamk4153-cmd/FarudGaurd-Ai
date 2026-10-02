import React from 'react';
import {
  Clock,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  AlertCircle,
  Check,
} from 'lucide-react';
import type { AlertStatus, CaseStatus, CasePriority } from '../../types';

interface StatusBadgeProps {
  status: AlertStatus | CaseStatus | CasePriority | string;
  type?: 'status' | 'priority';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'status' }) => {
  const norm = (status || '').toUpperCase();

  const getPriorityConfig = () => {
    switch (norm) {
      case 'CRITICAL':
        return {
          icon: <ShieldAlert className="h-3 w-3 text-rose-600 dark:text-rose-400 flex-shrink-0" />,
          label: 'Critical',
        };
      case 'HIGH':
        return {
          icon: <AlertTriangle className="h-3 w-3 text-orange-600 dark:text-orange-400 flex-shrink-0" />,
          label: 'High',
        };
      case 'MEDIUM':
        return {
          icon: <AlertCircle className="h-3 w-3 text-amber-600 dark:text-amber-400 flex-shrink-0" />,
          label: 'Medium',
        };
      case 'LOW':
      default:
        return {
          icon: <Check className="h-3 w-3 text-slate-500 flex-shrink-0" />,
          label: 'Low',
        };
    }
  };

  const getStatusConfig = () => {
    switch (norm) {
      case 'NEW':
      case 'PENDING':
      case 'OPEN':
        return {
          icon: <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400 flex-shrink-0" />,
          label: norm === 'NEW' ? 'New' : norm === 'PENDING' ? 'Pending' : 'Open',
        };
      case 'UNDER_REVIEW':
      case 'IN_PROGRESS':
        return {
          icon: <Activity className="h-3 w-3 text-slate-700 dark:text-slate-300 flex-shrink-0" />,
          label: norm === 'UNDER_REVIEW' ? 'Under review' : 'In progress',
        };
      case 'RESOLVED':
      case 'CLOSED':
        return {
          icon: <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />,
          label: norm === 'RESOLVED' ? 'Resolved' : 'Closed',
        };
      case 'ESCALATED':
        return {
          icon: <AlertTriangle className="h-3 w-3 text-rose-600 dark:text-rose-400 flex-shrink-0" />,
          label: 'Escalated',
        };
      case 'FALSE_POSITIVE':
        return {
          icon: <XCircle className="h-3 w-3 text-slate-500 flex-shrink-0" />,
          label: 'False positive',
        };
      default:
        return {
          icon: <Activity className="h-3 w-3 text-slate-500 flex-shrink-0" />,
          label: norm.replace(/_/g, ' ').toLowerCase(),
        };
    }
  };

  const { icon, label } = type === 'priority' ? getPriorityConfig() : getStatusConfig();

  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-0.5 text-[11px] font-medium text-slate-800 dark:text-slate-200 shadow-xs">
      {icon}
      <span>{label}</span>
    </span>
  );
};
