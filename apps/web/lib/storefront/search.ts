import 'server-only';
import { CACHE_SCOPE } from '@/lib/cache-scope';
import { sql } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import { db } from '@/db';
import { env } from '@/lib/env';
import { STOREFRONT_TAG, getStorefrontData } from '@/lib/storefront/data';
import { searchProducts } from '@/lib/utils/products';

export type SearchScope = 'all' | 'hairs' | 'tools';
export const SEARCH_SCOPES: SearchScope[] = ['all', 'hairs', 'tools'];

export const MAX_RESULTS = 200;

/** Lower-case words and numbers from what the customer typed (accents dropped, at most 8 words). */
export function searchTerms(query: string): string[] {
  return (
    query
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu) ?? []
  )
    .map((t) => t.slice(0, 40))
    .slice(0, 8);
}

/**
 * Published product ids matching `terms`, best match first, from Postgres full-text search on
 * products.search_document (migration `product_search`):
 *
 * - Every word must match, and the last one may be unfinished ("bone stra"). Words are stemmed, so "wigs",
 *   "wig" and "curls"/"curly" find each other.
 * - Ranking: name beats categories and attributes, which beat descriptions. A product whose name ends in a
 *   searched word ("Closure Wig" for "wig") is what the customer means, so it leads ahead of accessories that
 *   only mention it ("Wig Caps"). Ties keep the featured order.
 * - Nothing found: product names close to the query (typos like "bone stright").
 */
async function queryIds(terms: string[], scope: SearchScope, limit: number): Promise<string[]> {
  const tsquery = terms.map((t) => `${t}:*`).join(' & ');
  // Terms are letters and digits only, so they're safe in a regular expression.
  const headNoun = `^(?:${terms.map((t) => (t.length > 3 ? t.replace(/s$/, '') : t)).join('|')})`;
  const inScope = scope === 'all' ? sql`` : sql`and p.division = ${scope}`;

  const ranked = await db.execute<{ id: string }>(sql`
    select p.id
    from products p, to_tsquery('english', ${tsquery}) q
    where p.status = 'published' and p.search_document @@ q ${inScope}
    order by
      ts_rank('{0.02, 0.05, 0.5, 1.0}', p.search_document, q)
        + case when (regexp_match(lower(regexp_replace(p.name, '\\s+[(—–].*$', '')), '([[:alnum:]]+)\\s*$'))[1]
                    ~ ${headNoun} then 1 else 0 end desc,
      p.featured_rank, p.name
    limit ${limit}`);
  if (ranked.length) return ranked.map((r) => r.id);

  const query = terms.join(' ');
  const similar = await db.execute<{ id: string }>(sql`
    select p.id
    from products p
    where p.status = 'published' ${inScope}
      and extensions.word_similarity(${query}, lower(p.name)) >= 0.5
    order by extensions.word_similarity(${query}, lower(p.name)) desc, p.featured_rank
    limit ${limit}`);
  return similar.map((r) => r.id);
}

const cachedQueryIds = unstable_cache(queryIds, ['product-search-v1', CACHE_SCOPE], {
  tags: [STOREFRONT_TAG],
  revalidate: 3600,
});

/**
 * Ids of the published products matching `query` in `scope`, best match first. Cached per query and dropped
 * with the rest of the storefront cache when the admin edits the catalog. Without a database (fresh clone, CI)
 * it searches the prototype catalog in memory.
 */
export async function searchProductIds(query: string, scope: SearchScope = 'all', limit = MAX_RESULTS) {
  const terms = searchTerms(query);
  if (!terms.length) return [];
  const n = Math.min(Math.max(1, Math.floor(limit)), MAX_RESULTS);

  if (!env.DATABASE_URL) {
    const data = await getStorefrontData();
    const pool = scope === 'all' ? data.products : data.products.filter((p) => p.division === scope);
    return searchProducts(pool, terms.join(' '), data.categories)
      .slice(0, n)
      .map((p) => p.id);
  }
  return cachedQueryIds(terms, scope, n);
}
