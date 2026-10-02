import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  label = 'Loading...',
  size = 'md',
}) => {
  const iconSize = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  }[size];

  return (
    <div className="flex flex-col items-center justify-center p-12 text-slate-500">
      <Loader2 className={`${iconSize} animate-spin text-slate-900 dark:text-white mb-3`} />
      {label && <p className="text-xs font-mono tracking-wide text-slate-500 dark:text-slate-400">{label}</p>}
    </div>
  );
};
