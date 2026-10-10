'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SearchIcon } from 'lucide-react';
import type { SortOption } from '@/types/product';
import { ProductGrid } from '@/components/product/ProductGrid';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { searchScopes, type SearchScope } from '@/components/layout/SearchOverlay';
import { useUI } from '@/contexts/UIContext';
import { sortProducts } from '@/lib/utils/products';
import { useCatalog } from '@/components/storefront/StorefrontProvider';
import { cn } from '@/lib/utils/cn';

export function SearchResults() {
  const params = useSearchParams();
  const q = params.get('q') ?? '';
  const scope = (params.get('scope') as SearchScope) || 'all';
  const [input, setInput] = useState(q);
  const [sort, setSort] = useState<SortOption>('featured');
  const { addRecentSearch } = useUI();
  const router = useRouter();
  const { products, productsFor, searchProducts } = useCatalog();

  useEffect(() => setInput(q), [q]);

  const results = useMemo(() => {
    const pool = scope === 'hairs' || scope === 'tools' ? productsFor(scope) : products;
    return sortProducts(searchProducts(pool, q), sort);
  }, [q, scope, sort, products, productsFor, searchProducts]);

  const update = (next: { q?: string; scope?: string }) => {
    const p = new URLSearchParams(params);
    if (next.q !== undefined) p.set('q', next.q);
    if (next.scope) p.set('scope', next.scope);
    router.push(`/search?${p.toString()}`);
  };

  return (
    <div className="mx-auto max-w-site px-5 pb-24 pt-12 lg:px-8">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          addRecentSearch(input);
          update({ q: input.trim() });
        }}
        className="relative max-w-3xl"
      >
        <label htmlFor="results-search" className="sr-only">
          Search products
        </label>
        <SearchIcon className="absolute left-0 top-1/2 h-6 w-6 -translate-y-1/2 text-subtle" aria-hidden />
        <input
          id="results-search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search products"
          className="w-full border-b border-line bg-transparent py-4 pl-10 font-display text-4xl text-ink placeholder:text-muted focus:border-ink focus:outline-none md:text-5xl"
        />
      </form>

      <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div
          className="no-scrollbar -mx-5 flex gap-2 relative overflow-x-auto px-5 md:mx-0 md:px-0"
          role="radiogroup"
          aria-label="Search in"
        >
          {searchScopes.map((s) => (
            <button
              key={s.value}
              role="radio"
              aria-checked={scope === s.value}
              onClick={() => update({ scope: s.value })}
              className={cn(
                'h-9 whitespace-nowrap rounded-full border px-4 text-xs font-semibold transition-colors duration-150',
                scope === s.value
                  ? 'border-ink bg-ink text-white'
                  : 'border-line bg-white text-charcoal hover:border-ink',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <p className="text-sm text-subtle" aria-live="polite">
            <span className="font-semibold text-ink">{results.length}</span> results{q && <> for “{q}”</>}
          </p>
          <label htmlFor="search-sort" className="sr-only">
            Sort by
          </label>
          <select
            id="search-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="h-10 rounded-full border border-line bg-white px-4 text-sm"
          >
            <option value="featured">Featured</option>
            <option value="newest">Newest</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
            <option value="bestselling">Bestselling</option>
          </select>
        </div>
      </div>

      <div className="mt-10">
        {results.length ? (
          <ProductGrid products={results} columns={4} />
        ) : (
          <EmptyState
            icon={<SearchIcon className="h-7 w-7" />}
            title={`No results${q ? ` for “${q}”` : ''}`}
            text="Check the spelling, try a broader term like “wig” or “dryer”, or search all products. Salon services are found under Beauty Salon & Spa."
            actions={
              <>
                <Button onClick={() => update({ scope: 'all' })} variant="outline">
                  Search all products
                </Button>
                <Button onClick={() => router.push('/salon/services')} variant="ghost">
                  Browse salon services
                </Button>
              </>
            }
          />
        )}
      </div>
    </div>
  );
}
