import React from 'react';
import { cn } from '../../../utils/cn';

interface PanelProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
  as?: 'section' | 'div';
}

/** White surface with a hairline border — the admin's base grouping unit. */
export function Panel({ title, description, actions, className, bodyClassName, children, as: Tag = 'section' }: PanelProps) {
  return (
    <Tag className={cn('rounded-xl border border-line bg-white', className)}>
      {(title || actions) &&
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-subtle">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      }
      <div className={cn('p-4 sm:p-5', bodyClassName)}>{children}</div>
    </Tag>);

}