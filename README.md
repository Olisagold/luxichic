# Luxichic

Monorepo for the Luxichic platform: storefront (hair, tools), salon booking, customer accounts and admin dashboard, built on Next.js and Supabase (Postgres).

## Structure

- `apps/web`: Next.js app (App Router)
  - `app/`: routes. `(storefront)` holds the shop, salon, info pages, `(auth)` and `account`;
    `admin/(dashboard)` holds the admin area; `api/` holds route handlers
  - `views/`: page-level components; each `page.tsx` is a thin wrapper that renders one
  - `components/`, `contexts/`, `hooks/`: UI, client state and hooks
  - `data/`: seed data (products, services, content, navigation)
  - `lib/mock-db/`: prototype store persisted in `localStorage`, shared by storefront and admin
  - `lib/utils/`: formatting, pricing, availability and other helpers
  - `lib/supabase/`: browser, server and admin (service role) clients
  - `db/`, `actions/`, `services/`, `validations/`: Drizzle schema/queries, server actions,
    business logic and Zod schemas (to be filled in as features move to Supabase)
- `supabase/`: migrations, seed data and local config
- `packages/config`: shared TypeScript config
- `docs/`: architecture, database, business rules, integrations, API, deployment
- `scripts/`: setup, database and deployment scripts
- `legacy/luxichic-react`: previous Vite + React frontend

## Getting started

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

The app currently runs entirely on the prototype store (`lib/mock-db` + `localStorage`),
so no database is needed to try it. Demo admin logins are in `apps/web/data/adminSeed.ts`;
sign in at `/admin/login`.

To work on the Supabase backend:

```bash
cp .env.example apps/web/.env.local   # fill in Supabase keys
supabase start                        # local Postgres + Supabase stack
```

## Status

All storefront and admin routes have been ported from `legacy/luxichic-react` (Vite + React Router).
Data still comes from the prototype store; the next step is moving each feature onto Supabase.
