import { useEffect, useMemo, useState } from 'react';
import type { Category, Division, ProductFilterState, SortOption } from '../types/product';
import { countActiveFilters, emptyFilters, filterProducts, productInCategory, productsFor, searchProducts, sortProducts } from '../utils/products';

export const PAGE_SIZE = 9;

export function useProductListing(division: Division, category: Category | undefined) {
  const [filters, setFilters] = useState<ProductFilterState>(emptyFilters);
  const [sort, setSort] = useState<SortOption>('featured');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setFilters(emptyFilters());
    setQuery('');
    setPage(1);
  }, [division, category?.slug]);

  useEffect(() => setPage(1), [filters, sort, query]);

  const base = useMemo(
    () => category ? productsFor(division).filter((p) => productInCategory(p, category)) : [],
    [division, category]
  );

  const results = useMemo(() => {
    const searched = query.trim() ? searchProducts(base, query) : base;
    return sortProducts(filterProducts(searched, filters), sort);
  }, [base, filters, sort, query]);

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
    }
  };
}