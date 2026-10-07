# Luxichic

Monorepo for the Luxichic platform: storefront (hair, tools), salon booking, customer accounts and admin dashboard, built on Next.js and Supabase (Postgres).

## Structure

- `apps/web`: Next.js app (App Router)
  - `app/`: routes, grouped into `(storefront)`, `(auth)`, `account`, `admin` and `api`
  - `actions/`: server actions
  - `db/`: Drizzle schema and queries
  - `lib/supabase/`: browser, server and admin (service role) clients
  - `services/`: business logic
  - `validations/`: Zod schemas
- `supabase/`: migrations, seed data and local config
- `packages/`: shared `ui`, `types`, `validation` and `config`
- `docs/`: architecture, database, business rules, integrations, API, deployment
- `scripts/`: setup, database and deployment scripts
- `legacy/luxichic-react`: previous Vite + React frontend

## Getting started

```bash
pnpm install
cp .env.example apps/web/.env.local   # fill in Supabase keys
supabase start                        # local Postgres + Supabase stack
pnpm dev
```
