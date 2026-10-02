import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon = Inbox,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5]/60 dark:bg-[#141816]/60 p-12 text-center">
      <div className="rounded-full bg-white dark:bg-[#171b19] border border-[#e8e6df] dark:border-[#272d29] p-3.5 text-[#164e3f] dark:text-[#a7f3d0] mb-3 shadow-xs">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-serif text-base font-semibold text-[#191c1d] dark:text-[#f3f4f6] mb-1">{title}</h3>
      <p className="text-xs text-[#78716c] dark:text-[#9ca3af] max-w-sm mb-4">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};
