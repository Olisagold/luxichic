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

Status: the code side is done. Steps 3–5 still need your account setup; see
[`docs/deployment/environments.md`](docs/deployment/environments.md).

1. ✅ ESLint (Next.js rules) and Prettier. CI runs format check, lint, typecheck and build.
2. ✅ Environment variables validated with Zod (`apps/web/lib/env.ts`); invalid values fail dev/build immediately.
3. ⏳ Supabase.
   - ✅ The Supabase CLI is installed: `pnpm db:start` / `db:status` / `db:stop` / `db:reset`.
   - **You:** create the `luxichic-dev` and `luxichic-prod` projects.
4. ⏳ **You:** create the Vercel project (Root Directory `apps/web`), set Preview and Production env vars, and
   enable Analytics.
5. ⏳ Sentry.
   - ✅ Client, server and edge are set up; source maps upload when the Sentry env vars are present.
   - **You:** create the Sentry project and add its keys to Vercel.
6. ✅ Vercel Analytics in the root layout.
7. ✅ The empty shared packages are removed; `packages/config` stays.

## Phase 1: Database schema (Drizzle)

Translate the prototype types (`types/*.ts`, `lib/mock-db/db.ts`) into tables. Fill the existing `db/schema/*` files.

1. **Identity:** `profiles` (1:1 with `auth.users`), `admins`, `roles`, `permissions`, `role_permissions`.
2. **Catalog:** `categories` (division: hairs / tools), `products`, `product_variants`, `product_images`, `inventory`
   (stock, low-stock threshold, out-of-stock behaviour).
3. **Commerce:** `carts` / `cart_items` (signed-in users), `discounts` (promo codes), `orders`, `order_items`,
   `payments`, `delivery_rates` (fee per state, enabled, free).
   - `orders` has a unique `order_number` (internal) and a unique 8-digit `transaction_reference`
     (customer-facing, enforced with a check constraint).
   - `payments` holds the method and status (`pending_verification`, `payment_confirmed`, `pay_on_delivery`,
     `paid`) and who confirmed it and when.
4. **Engagement:** `reviews`, `wishlists`, `addresses`, `newsletter_subscribers` (email, source, subscribed/unsubscribed
   dates).
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
