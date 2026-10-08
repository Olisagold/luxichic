import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { requireEnv } from '@/lib/env';
import * as schema from './schema';

// `prepare: false` is required for Supabase's transaction pooler (port 6543), which Vercel uses.
const client = postgres(requireEnv('DATABASE_URL'), { prepare: false });

/** Server-only database access. Bypasses RLS, so callers must check permissions first. */
export const db = drizzle(client, { schema });
export { schema };
