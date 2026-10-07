import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeftIcon } from 'lucide-react';

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: {to: string;label: string;};
}

export function PageHeader({ title, description, actions, back }: PageHeaderProps) {
  return (
    <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back &&
        <Link to={back.to} className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-subtle hover:text-ink">
            <ChevronLeftIcon className="h-3.5 w-3.5" aria-hidden /> {back.label}
          </Link>
        }
        <h1 className="font-display text-3xl leading-tight text-ink md:text-[2.1rem]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-[13px] text-subtle">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>);

}