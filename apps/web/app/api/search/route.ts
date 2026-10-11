import { NextResponse, type NextRequest } from 'next/server';
import { SEARCH_SCOPES, searchProductIds, type SearchScope } from '@/lib/storefront/search';

/**
 * GET /api/search?q=bone+straight&scope=hairs&limit=5 → { ids: string[] }, best match first.
 * Used by the search overlay as the customer types; the browser already has the products, so only ids are sent.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const q = (params.get('q') ?? '').slice(0, 100);
  const scopeParam = params.get('scope') as SearchScope | null;
  const scope = scopeParam && SEARCH_SCOPES.includes(scopeParam) ? scopeParam : 'all';
  const limit = Number(params.get('limit')) || undefined;

  const ids = await searchProductIds(q, scope, limit);
  return NextResponse.json(
    { ids },
    // Same answer for everyone: let browsers and Vercel's edge reuse it briefly.
    { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600' } },
  );
}
