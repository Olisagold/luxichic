'use client';

import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

interface TablePagerProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (p: number) => void;
}

export function TablePager({ page, pageSize, total, onChange }: TablePagerProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-xs text-subtle">
      <span className="tabular-nums">{from}–{to} of {total}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(page - 1)} disabled={page <= 1} className="rounded-md border border-line p-1.5 text-ink hover:bg-canvas disabled:opacity-30" aria-label="Previous page">
          <ChevronLeftIcon className="h-3.5 w-3.5" />
        </button>
        <span className="px-2 tabular-nums">Page {page} of {pages}</span>
        <button onClick={() => onChange(page + 1)} disabled={page >= pages} className="rounded-md border border-line p-1.5 text-ink hover:bg-canvas disabled:opacity-30" aria-label="Next page">
          <ChevronRightIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>);

}

export function paginate<T>(items: T[], page: number, size: number): T[] {
  return items.slice((page - 1) * size, page * size);
}