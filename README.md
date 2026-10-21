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

## Getting started

```bash
pnpm install
cp .env.example apps/web/.env.local   # fill in the Supabase keys (see the comments in the file)
pnpm db:start                         # local Supabase in Docker
pnpm db:seed                          # demo catalog, customers, orders and staff logins
pnpm dev                              # http://localhost:3000
```

Staff sign in at `/admin/login`, or at the secret address when `ADMIN_PATH` is set.

## Status

Live on Supabase, Vercel, Resend and Telegram. Progress and the launch checklist are in [`plan.md`](plan.md).
