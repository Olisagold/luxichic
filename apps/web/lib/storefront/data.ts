import 'server-only';
import { unstable_cache } from 'next/cache';
import { env } from '@/lib/env';
import { buildInitialDb } from '@/lib/mock-db/initial';
import { deriveStorefront, type StorefrontData, type StorefrontSource } from '@/lib/storefront/derive';
import { loadStorefrontSource } from '@/lib/storefront/source';

/** Cache tag for everything the storefront reads. Admin edits call `revalidateTag(STOREFRONT_TAG)` (Phase 8). */
export const STOREFRONT_TAG = 'storefront';

/** The prototype's catalog, for a clone or CI build with no database configured. */
function prototypeSource(): StorefrontSource {
  const store = buildInitialDb();
  return { ...store, settings: store.settings };
}

/**
 * Everything the storefront shows, from the database. Cached across requests and refreshed hourly, or at once
 * when the admin changes something. Without DATABASE_URL (a fresh clone, CI) it serves the prototype data.
 */
export const getStorefrontData = unstable_cache(
  async (): Promise<StorefrontData> => {
    if (!env.DATABASE_URL) return deriveStorefront(prototypeSource());
    return deriveStorefront(await loadStorefrontSource());
  },
  ['storefront-data-v1'],
  { tags: [STOREFRONT_TAG], revalidate: 3600 },
);
