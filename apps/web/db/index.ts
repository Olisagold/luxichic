import 'server-only';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { requireEnv } from '@/lib/env';
import * as schema from './schema';

type Database = PostgresJsDatabase<typeof schema>;

// One connection pool per server process; reused across hot reloads in development.
const globalForDb = globalThis as unknown as { luxichicDb?: Database };

function connect(): Database {
  // `prepare: false` is required for Supabase's transaction pooler (port 6543), which Vercel uses.
  const client = postgres(requireEnv('DATABASE_URL'), { prepare: false });
  return drizzle(client, { schema });
}

/**
 * Server-only database access. Bypasses RLS, so callers must check permissions first.
 *
 * Run queries one after another (`await` each), not with `Promise.all`. Concurrent queries make postgres.js
 * pipeline several statements on one connection, and Supabase's transaction pooler stalls on that (tested
 * 2026-10-10: 18 parallel reads hung with 1–3 connections; sequential reads never did).
 * Connects on first use, so importing this module never needs DATABASE_URL (e.g. during a CI build).
 */
export const db = new Proxy({} as Database, {
  get(_target, prop) {
    globalForDb.luxichicDb ??= connect();
    const value = Reflect.get(globalForDb.luxichicDb, prop);
    return typeof value === 'function' ? value.bind(globalForDb.luxichicDb) : value;
  },
});
export { schema };
