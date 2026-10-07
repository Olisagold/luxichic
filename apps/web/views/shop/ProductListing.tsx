'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { SearchIcon, SlidersHorizontalIcon, XIcon } from 'lucide-react';
import type { Division, SortOption } from '@/types/product';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProductFilters } from '@/components/product/ProductFilters';
import { ProductGrid } from '@/components/product/ProductGrid';
import { Pagination } from '@/components/product/Pagination';
import { useProductListing } from '@/hooks/useProductListing';
import { categoriesFor, divisionLabel, findCategory } from '@/lib/utils/products';
import { NotFound } from '@/views/info/NotFound';

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'bestselling', label: 'Bestselling' },
];

export function ProductListing({ division }: { division: Division }) {
  const { category: slug } = useParams<{ category: string }>();
  const category = findCategory(division, slug);
  const listing = useProductListing(division, category);
  const [drawer, setDrawer] = useState(false);

  if (!category) return <NotFound />;

  const storeHome = `/${division}`;
  const related = categoriesFor(division)
    .filter((c) => c.group === category.group && c.slug !== category.slug)
    .slice(0, 10);

  return (
    <div className="bg-ivory">
      <header className="mx-auto max-w-7xl px-5 pb-8 pt-10 lg:px-8">
        <Breadcrumbs
          items={[
            { label: 'Home', to: '/' },
            { label: divisionLabel(division), to: storeHome },
            { label: category.name },
          ]}
        />

        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            {!['Shop', 'Products'].includes(category.group) && (
              <p className="text-xs font-semibold text-pink-deep">{category.group}</p>
            )}
            <h1 className="mt-1 font-display text-5xl leading-none text-ink md:text-6xl">{category.name}</h1>
            <p className="mt-3 text-[15px] text-subtle">{category.description}</p>
          </div>
          <p className="text-sm text-subtle" aria-live="polite">
            <span className="font-semibold tabular-nums text-ink">{listing.total}</span>{' '}
            {listing.total === 1 ? 'product' : 'products'}
          </p>
        </div>
        {related.length > 0 && (
          <div className="no-scrollbar -mx-5 mt-6 flex gap-2 relative overflow-x-auto px-5">
            {related.map((c) => (
              <Link
                key={c.slug}
                href={`${storeHome}/shop/${c.slug}`}
                className="whitespace-nowrap rounded-full border border-line bg-white px-4 py-2 text-xs font-medium text-charcoal transition-colors duration-150 hover:border-ink"
              >
                {c.name}
              </Link>
            ))}
          </div>
        )}
      </header>

      <div className="mx-auto grid max-w-7xl gap-10 px-5 pb-24 lg:grid-cols-[260px_1fr] lg:px-8">
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">Filters</p>
              {listing.activeCount > 0 && (
                <button
                  onClick={listing.reset}
                  className="text-xs font-semibold text-pink-deep underline-offset-4 hover:underline"
                >
                  Clear all ({listing.activeCount})
                </button>
              )}
            </div>
            <ProductFilters
              division={division}
              products={listing.base}
              filters={listing.filters}
              onChange={listing.setFilters}
            />
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <label htmlFor="listing-search" className="sr-only">
                Search within {category.name}
              </label>
              <SearchIcon
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
                aria-hidden
              />
              <input
                id="listing-search"
                value={listing.query}
                onChange={(e) => listing.setQuery(e.target.value)}
                placeholder={`Search in ${category.name}`}
                className="h-11 w-full rounded-full border border-line bg-white pl-11 pr-10 text-sm focus:border-ink focus:outline-none"
              />

              {listing.query && (
                <button
                  onClick={() => listing.setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-subtle"
                  aria-label="Clear search"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDrawer(true)}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-line bg-white px-5 text-sm font-medium lg:hidden"
              >
                <SlidersHorizontalIcon className="h-4 w-4" aria-hidden /> Filters
                {listing.activeCount > 0 && (
                  <span className="rounded-full bg-ink px-2 text-[11px] text-white">{listing.activeCount}</span>
                )}
              </button>
              <label htmlFor="sort" className="sr-only">
                Sort by
              </label>
              <select
                id="sort"
                value={listing.sort}
                onChange={(e) => listing.setSort(e.target.value as SortOption)}
                className="h-11 flex-1 rounded-full border border-line bg-white px-5 text-sm focus:border-ink focus:outline-none sm:w-60 sm:flex-none"
              >
                {sortOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    Sort: {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {listing.pageItems.length ? (
            <>
              <ProductGrid products={listing.pageItems} />
              <Pagination page={listing.page} pageCount={listing.pageCount} onChange={listing.setPage} />
            </>
          ) : (
            <EmptyState
              icon={<SearchIcon className="h-7 w-7" />}
              title={listing.base.length ? 'No matches found' : 'Coming soon'}
              text={
                listing.base.length
                  ? 'Try removing a filter or searching for something different.'
                  : 'New products for this category are on their way. Explore the rest of the store in the meantime.'
              }
              actions={
                listing.base.length ? (
                  <Button onClick={listing.reset} variant="outline">
                    Clear filters
                  </Button>
                ) : (
                  <Button to={`${storeHome}/shop/all`}>Shop all products</Button>
                )
              }
            />
          )}
        </div>
      </div>

      <Modal open={drawer} onClose={() => setDrawer(false)} title="Filters" side="bottom">
        <div className="flex-1 overflow-y-auto px-6">
          <ProductFilters
            division={division}
            products={listing.base}
            filters={listing.filters}
            onChange={listing.setFilters}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-line px-6 py-4">
          <Button variant="outline" onClick={listing.reset}>
            Clear all
          </Button>
          <Button onClick={() => setDrawer(false)}>Show {listing.total}</Button>
        </div>
      </Modal>
    </div>
  );
}
