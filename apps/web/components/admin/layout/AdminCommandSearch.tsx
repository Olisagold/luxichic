'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarClockIcon,
  PackageIcon,
  SearchIcon,
  ShoppingBagIcon,
  SparklesIcon,
  StarIcon,
  UserIcon,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { adminSearch, type AdminSearchHit } from '@/lib/search/admin-search';
import { cn } from '@/lib/utils/cn';

const ICONS: Record<AdminSearchHit['group'], React.ElementType> = {
  Orders: ShoppingBagIcon,
  Customers: UserIcon,
  Products: PackageIcon,
  Appointments: CalendarClockIcon,
  Reviews: StarIcon,
  Specialists: SparklesIcon,
};

type Result = AdminSearchHit & { icon: React.ElementType };

/** ⌘K search across orders, customers, products, reviews, appointments and specialists (searched on the server). */
export function AdminCommandSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [searching, setSearching] = useState(false);
  const latest = useRef(0);
  const router = useRouter();

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    const term = q.trim();
    const id = ++latest.current;
    if (term.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = window.setTimeout(async () => {
      const hits = await adminSearch(term).catch(() => []);
      if (id !== latest.current) return; // a newer search has started
      setResults(hits.map((h) => ({ ...h, icon: ICONS[h.group] })));
      setActive(0);
      setSearching(false);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [q]);

  const go = (r: Result) => {
    onClose();
    router.push(r.to);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && results[active]) {
      go(results[active]);
    }
  };

  let lastGroup = '';

  return (
    <Modal open={open} onClose={onClose} title="Search" hideTitle className="mt-[12vh] max-w-xl self-start rounded-2xl">
      <div className="flex items-center gap-2 border-b border-line px-4">
        <SearchIcon className="h-4 w-4 text-subtle" aria-hidden />
        <input
          autoFocus
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKey}
          placeholder="Search orders, references, customers, products…"
          aria-label="Search the admin"
          className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
        />

        <kbd className="rounded border border-line px-1.5 py-0.5 text-[10px] font-semibold text-subtle">ESC</kbd>
      </div>
      <div className="max-h-[60vh] overflow-y-auto p-2" role="listbox" aria-label="Results">
        {q.trim().length < 2 ? (
          <p className="px-3 py-6 text-center text-[13px] text-subtle">
            Try an order number (LXC-…), an 8-digit reference, a customer email or a product name.
          </p>
        ) : results.length === 0 ? (
          <p className="px-3 py-6 text-center text-[13px] text-subtle" aria-live="polite">
            {searching ? 'Searching…' : `No results for “${q}”.`}
          </p>
        ) : (
          results.map((r, i) => {
            const header = r.group !== lastGroup ? r.group : null;
            lastGroup = r.group;
            return (
              <React.Fragment key={`${r.group}-${r.to}-${i}`}>
                {header && (
                  <p className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                    {header}
                  </p>
                )}
                <button
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(r)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left',
                    i === active ? 'bg-canvas' : '',
                  )}
                >
                  <r.icon className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-ink">{r.title}</span>
                    <span className="block truncate text-xs text-subtle">{r.meta}</span>
                  </span>
                </button>
              </React.Fragment>
            );
          })
        )}
      </div>
    </Modal>
  );
}
