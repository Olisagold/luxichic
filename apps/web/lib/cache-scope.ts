import 'server-only';
import { env } from '@/lib/env';

/**
 * Part of every data-cache key: the build and the database the data came from. Vercel keeps the data cache
 * across deployments, and restores the build's cache folder too, so a key that didn't change per build let a new
 * deployment serve data cached by an earlier one (content loaded straight into the database stayed hidden). The
 * build stamp (next.config.ts) changes with every build. Locally the same `.next/cache` is shared by builds
 * against different databases (dev, the local test database), so the database is part of the key too.
 */
export const CACHE_SCOPE = [
  process.env.LUXICHIC_BUILD_STAMP ?? 'dev',
  env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(env.NEXT_PUBLIC_SUPABASE_URL).host
    : env.DATABASE_URL
      ? 'database'
      : 'prototype',
].join(':');
