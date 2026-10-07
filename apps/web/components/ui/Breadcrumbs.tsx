import React from 'react';
import Link from 'next/link';
import { ChevronRightIcon } from 'lucide-react';

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items }: {items: Crumb[];}) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-subtle">
        {items.map((c, i) =>
        <li key={`${c.label}-${i}`} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRightIcon className="h-3 w-3 text-muted" aria-hidden />}
            {c.to ?
          <Link href={c.to} className="transition-colors duration-150 hover:text-ink">
                {c.label}
              </Link> :

          <span className="text-ink" aria-current="page">
                {c.label}
              </span>
          }
          </li>
        )}
      </ol>
    </nav>);

}