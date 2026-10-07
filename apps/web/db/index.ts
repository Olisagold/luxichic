import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { requireEnv } from '@/lib/env';

const client = postgres(requireEnv('DATABASE_URL'), { prepare: false });

export const db = drizzle(client);
