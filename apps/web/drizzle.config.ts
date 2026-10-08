import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './db/schema/index.ts',
  // Supabase CLI applies these (`supabase db reset` locally, `supabase db push` to hosted projects).
  out: '../../supabase/migrations',
  migrations: { prefix: 'supabase' },
  // Supabase owns the auth/storage schemas and the anon/authenticated/service_role roles.
  schemaFilter: ['public'],
  entities: { roles: { provider: 'supabase' } },
  dbCredentials: { url: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' },
  strict: true,
  verbose: true,
});
