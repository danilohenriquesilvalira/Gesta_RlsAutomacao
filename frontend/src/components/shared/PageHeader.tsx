'use client';

import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="shrink-0 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pb-4 border-b border-gray-border">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-navy">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-muted mt-0.5">{subtitle}</p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
