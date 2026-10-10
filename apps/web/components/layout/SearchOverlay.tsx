'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ClockIcon, SearchIcon, XIcon } from 'lucide-react';
import { useUI } from '@/contexts/UIContext';
import { useCatalog } from '@/components/storefront/StorefrontProvider';
import { divisionLabel } from '@/lib/utils/products';
import { formatNaira } from '@/lib/utils/currency';
import { cn } from '@/lib/utils/cn';

export type SearchScope = 'all' | 'hairs' | 'tools';

export const searchScopes: { value: SearchScope; label: string }[] = [
  { value: 'all', label: 'All Products' },
  { value: 'hairs', label: 'LUXICHIC Hairs' },
  { value: 'tools', label: 'Hair Tools & Essentials' },
];

const popular = ['Bone straight', 'Body wave', 'Frontal wig', '22 inches', 'Hot comb', 'Braiding hair', 'Canvas head'];

export function SearchOverlay() {
  const { searchOpen, closeSearch, recentSearches, addRecentSearch, clearRecentSearches } = useUI();
  const [q, setQ] = useState('');
  const [scope, setScope] = useState<SearchScope>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { products, productsFor, searchProducts } = useCatalog();

  useEffect(() => {
    if (!searchOpen) return;
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeSearch();
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
    };
  }, [searchOpen, closeSearch]);

  const suggestions = useMemo(() => {
    const pool = scope === 'all' ? products : productsFor(scope);
    return q.trim().length >= 2 ? searchProducts(pool, q).slice(0, 5) : [];
  }, [q, scope, products, productsFor, searchProducts]);

  const finish = () => {
    closeSearch();
    setQ('');
  };

  const go = (term: string) => {
    if (!term.trim()) return;
    addRecentSearch(term);
    finish();
    router.push(`/search?q=${encodeURIComponent(term.trim())}&scope=${scope}`);
  };

  return (
    <AnimatePresence>
      {searchOpen && (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Search products">
          <motion.div
            className="absolute inset-0 bg-ink/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeSearch}
          />
          <motion.div
            className="relative max-h-[90vh] overflow-y-auto bg-white shadow-lift"
            initial={{ y: -24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -24, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="mx-auto max-w-4xl px-5 py-8">
              <div className="flex items-center justify-between gap-4">
                <div
                  className="no-scrollbar flex gap-2 relative overflow-x-auto"
                  role="radiogroup"
                  aria-label="Search in"
                >
                  {searchScopes.map((s) => (
                    <button
                      key={s.value}
                      role="radio"
                      aria-checked={scope === s.value}
                      onClick={() => setScope(s.value)}
                      className={cn(
                        'h-9 whitespace-nowrap rounded-full border px-4 text-xs font-semibold transition-colors duration-150',
                        scope === s.value
                          ? 'border-ink bg-ink text-white'
                          : 'border-line text-charcoal hover:border-ink',
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={closeSearch}
                  className="shrink-0 rounded-full p-2 hover:bg-ivory"
                  aria-label="Close search"
                >
                  <XIcon className="h-5 w-5" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  go(q);
                }}
                className="relative mt-6"
                role="search"
              >
                <SearchIcon className="absolute left-0 top-1/2 h-6 w-6 -translate-y-1/2 text-subtle" aria-hidden />
                <label htmlFor="global-search" className="sr-only">
                  Search products
                </label>
                <input
                  id="global-search"
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search wigs, textures, lengths, tools…"
                  className="w-full border-b border-line bg-transparent py-4 pl-10 font-display text-3xl text-ink placeholder:text-muted focus:border-ink focus:outline-none md:text-4xl"
                  autoComplete="off"
                />
              </form>

              {suggestions.length > 0 ? (
                <ul className="mt-6 divide-y divide-line" aria-label="Suggestions">
                  {suggestions.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/${p.division}/product/${p.slug}`}
                        onClick={() => {
                          addRecentSearch(q);
                          finish();
                        }}
                        className="flex items-center gap-4 rounded-lg px-2 py-3 transition-colors duration-150 hover:bg-ivory"
                      >
                        <img src={p.images[0]} alt="" className="h-14 w-12 rounded-lg object-cover" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink">{p.name}</span>
                          <span className="block text-xs text-subtle">{divisionLabel(p.division)}</span>
                        </span>
                        <span className="text-sm font-semibold tabular-nums">{formatNaira(p.price)}</span>
                      </Link>
                    </li>
                  ))}
                  <li>
                    <button
                      onClick={() => go(q)}
                      className="px-2 py-3 text-xs font-bold uppercase tracking-[0.14em] text-pink-deep"
                    >
                      See all results for “{q}”
                    </button>
                  </li>
                </ul>
              ) : q.trim().length >= 2 ? (
                <p className="mt-6 text-sm text-subtle">No quick matches. Press Enter to see the full results page.</p>
              ) : (
                <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-subtle">Recent searches</p>
                      {recentSearches.length > 0 && (
                        <button
                          onClick={clearRecentSearches}
                          className="text-xs text-subtle underline-offset-2 hover:underline"
                        >
                          Clear history
                        </button>
                      )}
                    </div>
                    {recentSearches.length ? (
                      <ul className="mt-3 space-y-1">
                        {recentSearches.map((r) => (
                          <li key={r}>
                            <button
                              onClick={() => go(r)}
                              className="flex items-center gap-2 py-1.5 text-sm text-charcoal hover:text-pink-deep"
                            >
                              <ClockIcon className="h-3.5 w-3.5 text-subtle" aria-hidden /> {r}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-subtle">Your searches will appear here.</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-subtle">Popular searches</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {popular.map((p) => (
                        <button
                          key={p}
                          onClick={() => go(p)}
                          className="rounded-full bg-ivory px-4 py-2 text-sm text-charcoal transition-colors duration-150 hover:bg-blush"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
