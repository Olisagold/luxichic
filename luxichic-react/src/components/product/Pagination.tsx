import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface PaginationProps {
  page: number;
  pageCount: number;
  onChange: (p: number) => void;
}

export function Pagination({ page, pageCount, onChange }: PaginationProps) {
  if (pageCount <= 1) return null;
  const go = (p: number) => {
    onChange(Math.max(1, Math.min(pageCount, p)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  return (
    <nav className="mt-14 flex items-center justify-center gap-2" aria-label="Pagination">
      <button onClick={() => go(page - 1)} disabled={page === 1} className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white disabled:opacity-30" aria-label="Previous page">
        <ChevronLeftIcon className="h-4 w-4" />
      </button>
      {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) =>
      <button
        key={p}
        onClick={() => go(p)}
        aria-current={p === page ? 'page' : undefined}
        className={cn(
          'h-10 w-10 rounded-full text-sm font-semibold tabular-nums transition-colors duration-150',
          p === page ? 'bg-ink text-white' : 'border border-line bg-white text-charcoal hover:border-ink'
        )}>
        
          {p}
        </button>
      )}
      <button onClick={() => go(page + 1)} disabled={page === pageCount} className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white disabled:opacity-30" aria-label="Next page">
        <ChevronRightIcon className="h-4 w-4" />
      </button>
    </nav>);

}