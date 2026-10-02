import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, badge, actions }) => {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#e8e6df] dark:border-[#272d29] pb-5">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#111827] dark:text-[#f0f3f1]">
            {title}
          </h1>
          {badge && (
            <span className="rounded-md border border-[#cde2d6] dark:border-[#234233] bg-[#ebf3ef] dark:bg-[#1a2d24] px-2.5 py-0.5 text-xs font-semibold text-[#164e3f] dark:text-[#a7f3d0]">
              {badge}
            </span>
          )}
        </div>
        {subtitle && <p className="text-xs sm:text-sm text-[#525252] dark:text-[#9ca3af] max-w-2xl">{subtitle}</p>}
      </div>

      {actions && <div className="flex items-center gap-2.5">{actions}</div>}
    </div>
  );
};
