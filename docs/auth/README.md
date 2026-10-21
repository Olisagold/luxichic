# Sign-in (Supabase Auth)

Customers sign in with email and password or Google. Admins sign in with email and password only, at
`/admin/login`. Supabase Auth holds every password; nothing about passwords lives in our tables or the browser
bundle.

## How it works

| Piece                                                            | Where                                     |
| ---------------------------------------------------------------- | ----------------------------------------- |
| Session cookies (`sb-…`), refreshed on each request              | `middleware.ts`, `lib/supabase/server.ts` |
| "Remember me" off → cookies end when the browser closes          | `lib/supabase/cookies.ts`                 |
| Who is signed in: `getAuthUser`, `getCustomer`, `getAdmin`       | `lib/auth/session.ts`                     |
| Permission check for admin server actions: `requirePermission()` | `lib/auth/session.ts`                     |
| Customer actions (sign in/up/out, reset, profile, addresses)     | `lib/auth/customer-actions.ts`            |
| Admin actions (sign in/out, change password)                     | `lib/auth/admin-actions.ts`               |
| Google sign-in and every email link land here                    | `app/auth/callback/route.ts`              |
| Profile created for each new login (database trigger)            | `supabase/migrations/…_auth_profiles.sql` |

**Customers.** A sign-up creates an Auth user; a trigger creates their `profiles` row from the name and phone
given at sign-up (or the Google name). Suspended customers (`profiles.status = 'blocked'`) are refused at
sign-in and by the account pages.

**Admins.** An admin is an Auth user with an active row in `admins`. Inserting that row removes the customer
profile the trigger created, so staff don't appear as customers. The `/admin` layout loads the admin and their
permissions on the server before rendering anything. Each sign-in is written to `login_history` and
`audit_logs`.

**Every admin server action must start with `await requirePermission('…')`.** `can()` in the UI only hides
buttons.

**Protected pages.** The middleware sends visitors without a session from `/account/*` to `/login` and from
`/admin/*` to `/admin/login`, keeping the page they asked for. The account and admin layouts then verify the
session with Supabase on every request.

## Setting up an environment

Do these once per Supabase project (dashboard → **Authentication**).

### URL configuration

|               | luxichic-dev                                                  | luxichic-prod                                                               |
| ------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Site URL      | `http://localhost:3000`                                       | `https://luxichic.online`                                                   |
| Redirect URLs | `http://localhost:3000/**` and the Vercel preview URL pattern | `https://luxichic.online/**` (and the old `https://luxichic.vercel.app/**`) |

Email links and Google only return to addresses on this list.

### Email and passwords

- **Sign In / Providers → Email:** "Confirm email" **off**, on purpose (decided 2026-10-21): sign-up is instant.
  Only an email with earlier guest orders or appointments gets our own confirmation link, which joins them to
  the account (`lib/auth/guest-records.ts`).
- **Emails → SMTP Settings** (prod): Resend, `smtp.resend.com:465`, user `resend`, a sending-only API key for
  `mail.luxichic.online`; sender `account@mail.luxichic.online`, name LUXICHIC. **Rate Limits:** 60 emails an
  hour.
- **Emails → Templates:** paste `supabase/templates/confirmation.html` ("Confirm signup"), `recovery.html`
  ("Reset password") and `email_change.html` ("Change email address"), with the subjects in
  `supabase/config.toml`. Regenerate them after changing the business phone or WhatsApp:
  `corepack pnpm auth:email-templates -- --env-file apps/web/.env.prod.local`. Their links use `{{ .SiteURL }}`,
  so the Site URL must be the live address.
- **Password requirements:** minimum length **8**, "letters and digits". This matches the site's own check.

### Google

1. Google Cloud Console → APIs & Services → Credentials → **Create OAuth client ID** (Web application).
2. Authorised redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback` (one client can list both
   projects).
3. Supabase → **Sign In / Providers → Google**: enable, paste the client ID and secret.

Locally, Google is off. To test it, put `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and
`SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` in `supabase/.env`, set `enabled = true` under `[auth.external.google]` in
`supabase/config.toml`, add `http://127.0.0.1:54321/auth/v1/callback` to the Google client, and restart.

### Vercel environment variables

| Variable                               | Production                              | Preview                    |
| -------------------------------------- | --------------------------------------- | -------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | prod project URL                        | dev project URL            |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | prod publishable key                    | dev publishable key        |
| `SUPABASE_SECRET_KEY`                  | prod secret key                         | dev secret key             |
| `DATABASE_URL`                         | prod transaction pooler URI (port 6543) | dev transaction pooler URI |
| `NEXT_PUBLIC_SITE_URL`                 | `https://luxichic.online`               | (leave unset)              |

Without them, the site still renders but sign-in says it isn't available, and `/account` and `/admin` can't be
opened.

### The first admin

```bash
corepack pnpm db:create-owner -- --email you@example.com --name "Your Name" --env-file apps/web/.env.prod.local
```

`--env-file` points at a git-ignored file holding that project's `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL` and
`SUPABASE_SECRET_KEY`; leave it out to target local Supabase. The script prints a temporary password once:
sign in at `/admin/login` and change it under **Settings → Security**. It refuses if the project already has
an owner, or if the email already has a customer login.

## Testing locally

`corepack pnpm db:start` runs Supabase Auth with **Mailpit** at http://127.0.0.1:54324, which catches every
sign-up and reset email, so you can click the links without a real inbox. `corepack pnpm db:seed` creates the
demo logins (customers and two admins) with the password it prints, or `SEED_PASSWORD` if set.
