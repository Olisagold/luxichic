import { useEffect, useMemo, useState } from 'react';
import type { Category, Division, ProductFilterState, SortOption } from '@/types/product';
import {
  countActiveFilters,
  emptyFilters,
  filterProducts,
  productInCategory,
  sortProducts,
} from '@/lib/utils/products';
import { useCatalog } from '@/components/storefront/StorefrontProvider';
import { useProductSearch } from '@/hooks/useProductSearch';

export const PAGE_SIZE = 9;

export function useProductListing(division: Division, category: Category | undefined) {
  const [filters, setFilters] = useState<ProductFilterState>(emptyFilters);
  const [sort, setSort] = useState<SortOption>('featured');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const { productsFor } = useCatalog();
  const matchIds = useProductSearch(query, division);

  useEffect(() => {
    setFilters(emptyFilters());
    setQuery('');
    setPage(1);
  }, [division, category?.slug]);

  useEffect(() => setPage(1), [filters, sort, query]);

  const base = useMemo(
    () => (category ? productsFor(division).filter((p) => productInCategory(p, category)) : []),
    [division, category, productsFor],
  );

  const results = useMemo(() => {
    // Until the server answers the first search, show the category as it was.
    const matches = matchIds && new Set(matchIds);
    const searched = matches ? base.filter((p) => matches.has(p.id)) : base;
    return sortProducts(filterProducts(searched, filters), sort);
  }, [base, filters, sort, matchIds]);

  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));

  return {
    base,
    filters,
    setFilters,
    sort,
    setSort,
    query,
    setQuery,
    page,
    setPage,
    pageCount,
    pageItems: results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    total: results.length,
    activeCount: countActiveFilters(filters),
    reset: () => {
      setFilters(emptyFilters());
      setQuery('');
    },
  };
}
