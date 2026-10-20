# Environments and accounts

How LUXICHIC is wired to Supabase and Vercel. These steps need the account owner. Code changes aren't
enough on their own.

## Environment variables

All variables are listed in [`.env.example`](../../.env.example) and validated at startup by
[`apps/web/lib/env.ts`](../../apps/web/lib/env.ts). Locally, put them in `apps/web/.env.local` (git-ignored).

| Variable                                                                  | Where it comes from                                              | Needed from |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------- | ----------- |
| `NEXT_PUBLIC_SITE_URL`                                                    | Your domain (`http://localhost:3000` locally)                    | Now         |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`        | Supabase → Project Settings → API (or `pnpm db:status` locally)  | Phase 1–2   |
| `SUPABASE_SECRET_KEY`                                                     | Supabase → Project Settings → API. **Server only, never expose** | Phase 1–2   |
| `DATABASE_URL`                                                            | Supabase → Connect → connection string                           | Phase 1     |
| `RESEND_API_KEY`                                                          | Resend → API Keys                                                | Phase 9     |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_ADMIN_CHAT_ID` | @BotFather, a random 16+ character secret, the team chat ID      | Phase 9     |

## Local Supabase

Requires Docker Desktop to be running.

```bash
corepack pnpm db:start    # starts Postgres, Auth, Storage and Studio (http://127.0.0.1:54323)
corepack pnpm db:status   # prints the local URL, anon key, service role key and DB URL for .env.local
corepack pnpm db:stop
```

## Supabase projects (hosted)

1. Create two projects in the Supabase dashboard: `luxichic-dev` and `luxichic-prod`. Pick the region closest to
   your customers.
2. Save each project's database password in a password manager.
3. Copy the API URL, anon key, service role key and connection string into Vercel (below).

## Vercel

1. Vercel → Add New → Project → import `Olisagold/luxichic`.
2. Set **Root Directory** to `apps/web`. Vercel detects Next.js and the pnpm workspace.
3. Environment variables:
   - **Preview**: the `luxichic-dev` Supabase keys.
   - **Production**: the `luxichic-prod` keys.
4. Enable **Analytics** in the project's Analytics tab. The `<Analytics />` component is already in the root layout.
5. Every pull request then gets a preview URL, and pushes to `main` deploy to production.
