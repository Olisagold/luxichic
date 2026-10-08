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

| Area                | Choice                                                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Framework           | Next.js 15 (App Router), React 19, Tailwind 3                                                                          |
| Database            | Supabase Postgres                                                                                                      |
| Data access         | Drizzle ORM (schema in `apps/web/db/schema`, migrations in `supabase/migrations`)                                      |
| Auth                | Supabase Auth: email + password, and Google sign-in                                                                    |
| File storage        | Supabase Storage (product, service and media-library images)                                                           |
| Payments            | Manual only: bank transfer (admin verifies) and pay on delivery. No payment gateway                                    |
| Transactional email | Resend                                                                                                                 |
| Team alerts         | Telegram bot (new orders, new appointments), configured in a new `/admin/telegram` page                                |
| WhatsApp            | `/admin/whatsapp` settings page stays in the admin but is **not functional** for now; customer `wa.me` chat links stay |
| Newsletter          | Homepage sign-up kept at launch; subscribers stored in our own database                                                |
| Guest checkout      | Kept: guests can order, and orders link to an account created later with the same email                                |
| Hosting             | Vercel                                                                                                                 |
| Error monitoring    | Sentry                                                                                                                 |
| Analytics           | Vercel Analytics (plus the built-in admin analytics from our own data)                                                 |

## Payment flow (bank transfer)

Agreed rules. Phase 5 builds them; Phase 8 adds the admin side.

1. **Two separate identifiers on every order:**
   - **Transaction reference:** a unique, randomized **8-digit** number. It is shown to the customer and used as
     the bank-transfer narration.
   - **Order number:** an internal ID (e.g. `LXC-123456`), always distinct from the transaction reference.

   The database enforces uniqueness on both. The prototype already generates both
   (`lib/utils/references.ts`); only uniqueness checks move to the server.

2. **At checkout:** the customer selects Bank Transfer, and the order is created with payment status
   `pending_verification`.
3. **The customer sees** (on the confirmation page and in the order email):
   - Bank name
   - Account name
   - Account number
   - Amount
   - 8-digit transaction reference
   - Transfer instructions
4. The customer makes the transfer.
5. **Proof of payment is optional.** The customer can send a receipt through a WhatsApp button (a `wa.me` link
   with the order details prefilled). Sending it, or clicking the button, **never changes the payment status**.
6. **The admin checks** the bank account or statement, then clicks **Confirm Payment** on the order.
7. The order becomes `payment_confirmed`.
   - This is recorded in `audit_logs` with the admin's name.
   - The customer receives the payment-confirmed email.
8. Pay on delivery orders skip verification. Their payment status is `pay_on_delivery` until the admin marks
   them paid on delivery.

## How we work

- Every step below is small enough to be **one commit (or a few), pushed to `main`** once typecheck and build pass.
- A feature moves off `lib/mock-db` one area at a time. The page keeps the same UI; only its data source changes.
- `lib/mock-db`, `data/` seed imports in UI code, and `legacy/` are deleted only in the final cleanup phase.
- Permission checks in the UI are cosmetic. **Every admin mutation must check permissions on the server.**

---

## Phase 0: Tooling and environments

Status: done, except Sentry account setup. See [`docs/deployment/environments.md`](docs/deployment/environments.md).

1. ✅ ESLint (Next.js rules) and Prettier. CI runs format check, lint, typecheck and build.
2. ✅ Environment variables validated with Zod (`apps/web/lib/env.ts`); invalid values fail dev/build immediately.
3. ✅ Supabase.
   - The `luxichic-dev` and `luxichic-prod` projects are created, with automatic RLS on.
   - The Supabase CLI is installed: `pnpm db:start` / `db:status` / `db:stop` / `db:reset`.
4. ✅ Vercel project `luxichic` (Root Directory `apps/web`), live at https://luxichic.vercel.app.
   - Function region: Dublin (`dub1`, eu-west-1).
   - Preview uses the dev Supabase keys; Production uses the prod keys.
   - Server secrets are passed through Turbo's strict env mode (`turbo.json` → `passThroughEnv`).
5. ⏳ Sentry.
   - The code is set up.
   - **You:** create the Sentry project and add `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT` and
     `SENTRY_AUTH_TOKEN` to Vercel (Production).
   - Until then, the "No auth token provided" build warnings are expected and harmless.
6. ✅ Vercel Analytics in the root layout (enable it in the Vercel dashboard).
7. ✅ The empty shared packages are removed; `packages/config` stays.

## Phase 0.5: UI parity with the prototype

The Next.js port should look and behave exactly like `legacy/luxichic-react` before backend work starts.
Differences have been reported on the live site, including responsiveness.

- ✅ **Fixed:** horizontal overflow (pages up to 1875px wide on a 390px phone, so mobile browsers zoomed out).
  The prototype had it too. All 27 storefront routes now fit at 390, 768 and 1280px.
- ✅ **Checked:** the home page matches the prototype pixel-for-pixel at 390px and 1440px.
  The reported header and spacing differences are the prototype's original design, not migration changes:
  - The mobile header has no account icon.
  - Desktop has no hamburger menu.
  - Content is capped at 1280px and centred.

  Changing them is a design decision, tracked below.

- ✅ **Design decisions applied:**
  - Account icon added to the mobile header.
  - Desktop keeps the full menu (no hamburger).
  - Storefront width widened from 1280px to 1440px (`max-w-site`).
- ✅ **Small-phone fixes:** breakpoint-only grids now use `grid-cols-1`; the listing toolbar and product
  action row fit at 320px. All 28 storefront routes fit at 320, 390, 768 and 1280px.
- ⏳ **Remaining:** any other differences you spot. Report them with the page, screen size and a screenshot.

1. **Collect the differences.** For each one, record the page/URL, the screen size (mobile, tablet or desktop),
   what the prototype does, and what the Next.js app does. Screenshots of both side by side are best.
   Run the prototype locally for comparison:
   `cd legacy/luxichic-react && npm install && npm run dev`.
2. **Compare systematically** at 375px, 768px and 1280px on these pages:
   - Home, hairs/tools homes, a listing, a product page
   - Cart, checkout, salon, booking
   - Account, admin dashboard
3. **Fix the causes, not the symptoms.** Likely areas from the port:
   - Hydration/remount behaviour, so animations and layout don't shift after the stored data loads.
   - Layout wrappers: `SiteLayout`, `AccountLayout` and `AdminLayout` now wrap `children` instead of `<Outlet />`.
   - Active-link logic in the new `NavLink`.
   - React 19 / framer-motion differences.
   - Styles that depended on Vite-only behaviour.
4. One commit per fix (or per group of related fixes), each verified at all three screen sizes.
5. **Done when** every page on the list matches the prototype at all three sizes.

## Phase 1: Database schema (Drizzle)

Status: done locally. Applying to the hosted projects is the remaining step. See
[`docs/database/README.md`](docs/database/README.md).

1. ✅ **Identity:** `profiles` (1:1 with `auth.users`), `admins`, `admin_permissions`, `roles`, `role_permissions`,
   `permissions`, `login_history`.
2. ✅ **Catalog:** `categories`, `products`, `product_images`, `product_categories`, `product_options`,
   `product_option_values`, `inventory`, `stock_movements`.
3. ✅ **Commerce:** `carts` / `cart_items`, `discounts`, `orders`, `order_items`, `order_events`, `payments`,
   `delivery_rates`, `admin_notes`.
   - Unique internal `order_number` and unique 8-digit `transaction_reference` (check constraint), never equal.
   - `payment_confirmed` requires a confirmation time; customers can read but never write payments.
4. ✅ **Engagement:** `reviews`, `wishlists`, `addresses`, `newsletter_subscribers`.
5. ✅ **Salon:** `services`, `specialists`, `specialist_services`, `availability`, `blocks`, `appointments`,
   `appointment_events`.
6. ✅ **Content:** `site_content`, `faqs`, `policies`, `announcements`, `testimonials`, `media`, `social_links`,
   `settings`, `email_templates`.
7. ✅ **Operations:** `notifications`, `audit_logs`.
8. ✅ Migrations generated into `supabase/migrations` and applied locally (46 tables, all with RLS).
9. ✅ **Access:** RLS policies plus explicit Data API grants (`…_api_grants.sql`), so local and hosted behave
   the same.
   - pgTAP tests (`pnpm db:test`, 22 checks) pass on an empty and a seeded database.
   - Checked end to end through the API: visitors can't read orders, and customers see only their own orders and
     can't confirm payments or change their account status.
10. ✅ Seed script (`pnpm db:seed`) loads all prototype data (42 products, 33 orders, 42 appointments,
    25 customers, 2 admins, 11 reviews). Local by default; `--remote` for the dev project only.
11. ✅ Schema, access rules and workflow documented in `docs/database/README.md`.
12. ✅ Migrations applied to `luxichic-dev` and `luxichic-prod` (2026-10-08). `luxichic-dev` is seeded and
    checked through the API: visitors see 42 products and are refused orders and admins; a seeded customer signs
    in and sees only their own 3 orders. Production has the tables and no data. The CLI stays linked to dev.
13. ⏳ **Later:** run `pnpm db:test` in CI (needs Docker in GitHub Actions). Scheduled with Phase 10.

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
9. **Remove every demo credential from the code.** `DEMO_EMAIL`, `DEMO_PASSWORD`, `DEMO_ADMIN_*` and
   `DEMO_SUBADMIN_*` in `data/seed.ts` and `data/adminSeed.ts`, plus the seeded users' `password` fields, ship in the
   browser bundle today because the prototype checks logins in the browser.
   - Dev/preview test accounts are created by the seed script in Supabase instead.
   - Production gets no demo accounts.
   - (The visible demo boxes on both sign-in pages were removed on 2026-10-08.)

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

Follows the **Payment flow** section above. Guest checkout stays.

1. A `placeOrder` server action that:
   - Validates input with Zod.
   - Recalculates totals.
   - Applies the promo code.
   - Checks the delivery state is enabled and adds its fee.
   - Decrements stock in a transaction.
   - Generates a unique internal order number and a unique 8-digit transaction reference, retrying on a
     collision.
2. Payment methods:
   - Bank transfer: status `pending_verification`. The customer sees the bank details from settings, the amount
     and the transaction reference to use as the narration.
   - Pay on delivery: only if enabled in settings.
3. Optional "Send receipt on WhatsApp" button on the confirmation page and in the order account view.
   It opens a `wa.me` link with the order number, amount and transaction reference prefilled.
   It never changes the payment status.
4. Order confirmation page and order tracking read from the database. Guest tracking uses order number + email.
5. Link guest orders to an account when someone signs up with the same email.
6. Account orders list and order detail from the database.

## Phase 6: Salon booking

1. Compute availability on the server from specialist hours, blocks, service duration and existing appointments.
2. A `bookAppointment` server action, with a database constraint that prevents double-booking a specialist slot.
3. Appointment confirmation page and the account appointments list read from the database.
4. Customers can cancel or reschedule within the allowed window _(business rule to confirm, written down in
   `docs/business-rules/`)_.

## Phase 7: Reviews

1. Signed-in customers can review products. Optionally restrict this to verified purchasers
   _(business rule to confirm)_.
2. Admin moderation (approve, hide, delete) updates product ratings.

## Phase 8: Admin back office

Connect each admin section to the database through server actions. Each action checks a permission and writes to
`audit_logs`.

1. Orders: list, filters, detail, status changes, cancellations.
   - **Confirm Payment** action (permission-checked) moves `pending_verification` to `payment_confirmed`.
   - It writes to the audit log and sends the payment-confirmed email.
   - Filter for orders awaiting verification. The transaction reference is searchable, so it can be matched
     against the bank statement.
2. Products: list, product editor (images upload to Supabase Storage), inventory, low-stock flags.
3. Catalog: categories, discounts, review moderation.
4. Customers: list, detail, block and unblock, customer activity.
5. Salon: appointments, calendar, services and the service editor, specialists, availability.
6. Website content: homepage, about, FAQs, pages; media library on Supabase Storage. Saving revalidates
   the storefront cache.
7. Operations: delivery rates, payment settings (bank details), email settings
   (Resend sender, replacing the SMTP form), notifications.
   - New **Telegram settings** page (`/admin/telegram`, added to the sidebar under Operations):
     - Bot connection status
     - Alert chat ID
     - Toggles for new-order and new-appointment alerts
     - Message templates
     - A "send test message" button

     The bot token stays in env vars and is never stored in the database or shown.

   - **WhatsApp settings** (`/admin/whatsapp`) stays visible but **non-functional**. Inputs are disabled and a
     "Coming soon" note is shown; nothing is saved or sent.
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
   - Send new-order and new-appointment alerts to the team chat, using the toggles and templates from
     `/admin/telegram`.
3. In-app admin notifications (the `notifications` table) and the topbar badge counts.
4. Contact form: messages are stored in the database and emailed to the business address through Resend.
5. Newsletter: sign-ups are saved to `newsletter_subscribers`.
   - Duplicates are ignored and the email is validated.
   - The admin can view and export subscribers as CSV.
   - No email marketing tool at launch.

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
