# LUXICHIC Development Plan

From the current prototype to a production launch on Next.js + Supabase.

## Where we are now

- `apps/web` is a Next.js 15 (App Router) app holding a full port of the old React prototype (`legacy/luxichic-react`).
  It covers every storefront route (hairs, tools, salon, cart, checkout, account, info pages) and all admin routes.
- **There's no backend yet.** All data comes from seed files in `data/` and a browser-only store in `lib/mock-db`
  (`localStorage`). Auth, orders, emails and alerts are simulated.
- Supabase clients (`lib/supabase`), a Drizzle connection (`db/index.ts`), empty schema files (`db/schema/*`),
  a Telegram webhook route and `supabase/config.toml` are scaffolded but not used.
- CI (GitHub Actions) runs typecheck + build on every push and pull request.

## Decisions

| Area | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router), React 19, Tailwind 3 |
| Database | Supabase Postgres |
| Data access | Drizzle ORM (schema in `apps/web/db/schema`, migrations in `supabase/migrations`) |
| Auth | Supabase Auth: email + password, and Google sign-in |
| File storage | Supabase Storage (product, service and media-library images) |
| Payments | Manual only: bank transfer (admin verifies) and pay on delivery. No payment gateway |
| Transactional email | Resend |
| Team alerts | Telegram bot (new orders, new appointments) |
| Hosting | Vercel |
| Error monitoring | Sentry |
| Analytics | Vercel Analytics (plus the built-in admin analytics from our own data) |

## Open questions

These need an answer before the step that depends on them. Please don't build anything for them on a guess.

1. **WhatsApp admin page (`/admin/whatsapp`).** Telegram now handles team alerts. Should this page be replaced by
   Telegram settings, removed, or kept for a future WhatsApp integration? The customer "Chat on WhatsApp" buttons
   are plain `wa.me` links, need no API, and stay either way. *(Needed by Phase 8.)*
2. **Newsletter sign-up (homepage).** Should sign-ups go to a Resend audience, to a table in our database only,
   or should the section be removed for launch? *(Needed by Phase 9.)*
3. **Bank transfer proof.** Should customers be able to upload a payment receipt or screenshot at checkout, or does
   the admin match transfers against the bank statement only? *(Needed by Phase 5.)*
4. **Guest checkout.** Keep it as the prototype has it (guests can order and later link the order to an account),
   or require sign-in? *(Needed by Phase 5.)*
5. **Shared packages.** `packages/ui`, `packages/types` and `packages/validation` are empty. Keep them, for when a
   second app needs them, or remove them and keep everything in `apps/web`? *(Phase 0 cleanup.)*

## How we work

- Every step below is small enough to be **one commit (or a few), pushed to `main`** once typecheck and build pass.
- A feature moves off `lib/mock-db` one area at a time. The page keeps the same UI; only its data source changes.
- `lib/mock-db`, `data/` seed imports in UI code, and `legacy/` are deleted only in the final cleanup phase.
- Permission checks in the UI are cosmetic. **Every admin mutation must check permissions on the server.**

---

## Phase 0: Tooling and environments

1. Add ESLint (Next.js config) and Prettier; fix or suppress existing warnings; add `pnpm lint` to CI.
2. Validate environment variables with Zod (`lib/env.ts`) so missing keys fail at startup, not at runtime.
3. Create Supabase projects: **dev** and **prod**. Run local development with `supabase start`.
4. Create the Vercel project, link the GitHub repo, and set env vars for Preview and Production.
   Every pull request gets a preview URL.
5. Add Sentry (`@sentry/nextjs`) for client, server and edge; upload source maps from Vercel builds.
6. Add Vercel Analytics (`@vercel/analytics`) to the root layout.
7. Resolve open question 5 (shared packages).

## Phase 1: Database schema (Drizzle)

Translate the prototype types (`types/*.ts`, `lib/mock-db/db.ts`) into tables. Fill the existing `db/schema/*` files.

1. **Identity:** `profiles` (1:1 with `auth.users`), `admins`, `roles`, `permissions`, `role_permissions`.
2. **Catalog:** `categories` (division: hairs / tools), `products`, `product_variants`, `product_images`, `inventory`
   (stock, low-stock threshold, out-of-stock behaviour).
3. **Commerce:** `carts` / `cart_items` (signed-in users), `discounts` (promo codes), `orders`, `order_items`,
   `payments` (method, status, verification by an admin), `delivery_rates` (fee per state, enabled, free).
4. **Engagement:** `reviews`, `wishlists`, `addresses`.
5. **Salon:** `services`, `specialists`, `specialist_services`, `availability` (weekly hours), `blocks`
   (closed days), `appointments`.
6. **Content:** `site_content` (hero, intro, about, sections), `faqs`, `policies`, `announcements`, `testimonials`,
   `media`, `social_links`, `settings` (business details, bank details, email and alert toggles), `email_templates`.
7. **Operations:** `notifications` (admin in-app), `audit_logs`, `login_history`.
8. Generate the migration with `drizzle-kit generate` into `supabase/migrations`, and apply it locally.
9. **Row Level Security** on every table:
   - Public read for published catalog, services and content.
   - Customers can read and write only their own orders, addresses, wishlist, cart and reviews.
   - Admin writes go through server code (service role) after a permission check.
10. Seed script (`scripts/database/seed.ts`) that loads today's `data/*.ts` seed into the database, so dev and
    preview environments look like the prototype.
11. Document the schema and RLS rules in `docs/database/`.

## Phase 2: Authentication

1. Supabase Auth email + password: sign up, sign in, sign out, forgot and reset password
   (`(storefront)/(auth)/*` pages keep their UI).
2. Google sign-in: Google Cloud OAuth client, configured in the Supabase dashboard, plus a callback route.
3. A database trigger creates a `profiles` row for every new user.
4. Configure Supabase Auth to send its emails through Resend SMTP, with LUXICHIC-branded templates.
5. Re-enable the session refresh in `middleware.ts` (it is skipped today when Supabase env vars are missing).
6. Server-side route protection for `/account/*` (redirect in the layout), replacing the client-only guard.
7. Admin auth: admins sign in with Supabase Auth and must have an active `admins` row.
   - `/admin/(dashboard)` layout checks this on the server.
   - Add a `requirePermission()` helper for server actions.
   - Record each sign-in in `login_history`.
8. Replace `AuthContext` and `AdminAuthContext` internals with Supabase sessions; delete their localStorage logic.

## Phase 3: Catalog and content (read side)

1. Query functions in `db/queries/` for products, categories, services, specialists and site content.
2. Storefront pages fetch data in server components, and pass it to the existing views as props
   (no more mutating module-level arrays).
3. Cache with `unstable_cache` / tags, and revalidate when the admin edits something.
4. SEO: `generateMetadata` for product, category, service and policy pages; `sitemap.ts`; `robots.ts`;
   Open Graph images.
5. Move the images from `public/images` into Supabase Storage. Use `next/image` with the Supabase domain allowed.
6. Product search on Postgres full-text search, replacing in-memory filtering.

## Phase 4: Cart and wishlist

1. Guests keep the cart in `localStorage` (as today). When a guest signs in, their cart merges into `cart_items`.
2. Wishlist stored in the database for signed-in users; guests are asked to sign in.
3. Recalculate prices on the server from the database. Never trust prices sent by the client.

## Phase 5: Checkout and orders

*Depends on open questions 3 and 4.*

1. A `placeOrder` server action that:
   - Validates input with Zod.
   - Recalculates totals.
   - Applies the promo code.
   - Checks the delivery state is enabled and adds its fee.
   - Decrements stock in a transaction.
   - Generates a unique order number. 
2. Payment methods: bank transfer (status `pending_verification`, with the bank details from settings) and
   pay on delivery (if enabled in settings).
3. Order confirmation page and order tracking read from the database. Guest tracking uses order number + email.
4. Link guest orders to an account when someone signs up with the same email.
5. Account orders list and order detail from the database.

## Phase 6: Salon booking

1. Compute availability on the server from specialist hours, blocks, service duration and existing appointments.
2. A `bookAppointment` server action, with a database constraint that prevents double-booking a specialist slot.
3. Appointment confirmation page and the account appointments list read from the database.
4. Customers can cancel or reschedule within the allowed window *(business rule to confirm, written down in
   `docs/business-rules/`)*.

## Phase 7: Reviews

1. Signed-in customers can review products. Optionally restrict this to verified purchasers
   *(business rule to confirm)*.
2. Admin moderation (approve, hide, delete) updates product ratings.

## Phase 8: Admin back office

Connect each admin section to the database through server actions. Each action checks a permission and writes to
`audit_logs`.

1. Orders: list, filters, detail, status changes, payment verification, cancellations.
2. Products: list, product editor (images upload to Supabase Storage), inventory, low-stock flags.
3. Catalog: categories, discounts, review moderation.
4. Customers: list, detail, block and unblock, customer activity.
5. Salon: appointments, calendar, services and the service editor, specialists, availability.
6. Website content: homepage, about, FAQs, pages; media library on Supabase Storage. Saving revalidates
   the storefront cache.
7. Operations: delivery rates, payment settings (bank details), email settings
   (Resend sender, replacing the SMTP form), notifications.
   - Resolve open question 1 (`/admin/whatsapp`).
8. Administration: admin users (invite through Supabase Auth), roles and permissions, activity log.
9. Settings: general, business, social, security (password change and login history).
10. Dashboard and analytics read real aggregates (SQL views or queries) instead of `lib/utils/adminAnalytics.ts`
    over mock data.

## Phase 9: Notifications

1. **Email (Resend):** React Email templates for:
   - Order received
   - Bank transfer instructions
   - Payment verified
   - Order status updates
   - Appointment requested, confirmed or cancelled
   - Welcome
   - Admin invite

   Sends happen from server actions. The admin email templates screen edits the subject and body.
2. **Telegram bot:**
   - Fill `lib/telegram/*`.
   - Register the bot webhook (`app/api/webhooks/telegram`) with a secret token.
   - Send new-order and new-appointment alerts to the team chat, if enabled in settings.
3. In-app admin notifications (the `notifications` table) and the topbar badge counts.
4. Contact form and newsletter (depends on open question 2).

## Phase 10: Quality

1. Unit tests (Vitest) for pricing, promo codes, delivery fees, availability and order-number generation.
2. End-to-end tests (Playwright) against a seeded local Supabase:
   - Browse to cart to checkout (bank transfer, pay on delivery)
   - Book an appointment
   - Sign up / sign in
   - Admin verifies a payment
3. Run lint, typecheck, unit tests and E2E in CI; use the Vercel preview for manual QA.
4. Accessibility and performance pass (Lighthouse, Vercel Speed Insights / Web Vitals).

## Phase 11: Launch

1. Production Supabase: apply migrations, RLS review, backups enabled, storage buckets and policies.
2. Resend: verify the sending domain (SPF, DKIM, DMARC).
3. Vercel: custom domain, production env vars, Sentry release tracking.
4. Create the real admin accounts and roles; load real products, services and content.
5. Final legal and content review (policies, about, FAQs).
6. Cleanup:
   - Delete `lib/mock-db`.
   - Remove remaining seed imports from UI code, and the `PrototypeNote` banners.
   - Remove `legacy/luxichic-react` (it stays in git history).
7. Go live, then monitor Sentry and analytics for the first weeks.

## After launch (not scheduled)

- Online payments (Paystack or Flutterwave), if manual verification becomes a bottleneck.
- WhatsApp Cloud API for customer messages.
- Marketing analytics (GA4) with a consent banner.
