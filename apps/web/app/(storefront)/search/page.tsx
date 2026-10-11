import type { Metadata } from 'next';
import { SEARCH_SCOPES, searchProductIds, type SearchScope } from '@/lib/storefront/search';
import { SearchResults } from '@/views/shop/SearchResults';

export const metadata: Metadata = { title: 'Search', robots: { index: false } };

export default async function SearchResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; scope?: string | string[] }>;
}) {
  const params = await searchParams;
  const q = (Array.isArray(params.q) ? params.q[0] : params.q) ?? '';
  const scopeParam = (Array.isArray(params.scope) ? params.scope[0] : params.scope) as SearchScope | undefined;
  const scope = scopeParam && SEARCH_SCOPES.includes(scopeParam) ? scopeParam : 'all';
  const ids = q.trim() ? await searchProductIds(q.slice(0, 100), scope) : null;
  return <SearchResults ids={ids} />;
}
