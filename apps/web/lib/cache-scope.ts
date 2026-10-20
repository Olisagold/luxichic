import 'server-only';
import { env } from '@/lib/env';

/**
 * Part of every data-cache key: the deployment and the database the data came from. Vercel keeps the cache
 * across deployments, so each deployment starts fresh; locally the same `.next/cache` is shared by builds against
 * different databases (dev, the local test database), so the database is part of the key too. Without it, a
 * build could serve another database's products (whose ids don't exist here), which empties carts at checkout.
 */
export const CACHE_SCOPE = [
  process.env.VERCEL_DEPLOYMENT_ID ?? 'local',
  env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(env.NEXT_PUBLIC_SUPABASE_URL).host
    : env.DATABASE_URL
      ? 'database'
      : 'prototype',
].join(':');
