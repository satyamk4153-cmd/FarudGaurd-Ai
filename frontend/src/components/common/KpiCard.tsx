import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  iconColor?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtext,
  change,
  changeType = 'neutral',
  icon: Icon,
  iconColor = 'text-[#164e3f] dark:text-[#a7f3d0]',
}) => {
  return (
    <div className="flex items-start gap-4 p-5 bg-white dark:bg-[#171b19] border border-[#e8e6df] dark:border-[#272d29] rounded-xl shadow-xs transition-all duration-150 hover:border-[#d8d5cb] dark:hover:border-[#38423d]">
      <div className={`mt-0.5 shrink-0 ${iconColor}`}>
        <Icon className="h-6 w-6 stroke-[1.75]" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs text-[#525252] dark:text-[#9aa19d] font-medium leading-none">
          {title}
        </p>
        <div className="text-2xl sm:text-[26px] font-bold font-numeric text-[#191c1d] dark:text-white tracking-tight mt-1.5 leading-none">
          {value}
        </div>
        {(subtext || change) && (
          <div className="mt-2 flex items-center gap-2 text-xs text-[#78716c] dark:text-[#6e7571]">
            {change && (
              <span
                className={`font-semibold font-numeric ${
                  changeType === 'positive'
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : changeType === 'negative'
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-[#525252]'
                }`}
              >
                {change}
              </span>
            )}
            {subtext && <span>{subtext}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
