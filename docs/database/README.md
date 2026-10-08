# Database

LUXICHIC runs on Supabase Postgres. The schema is defined in TypeScript with Drizzle
([`apps/web/db/schema`](../../apps/web/db/schema)) and shipped as SQL migrations in
[`supabase/migrations`](../../supabase/migrations).

## Conventions

- **IDs:** UUIDs (`gen_random_uuid()`). Business keys stay unique alongside them: product/service `slug`, `sku`,
  `order_number`, `transaction_reference`, and the appointment `reference`.
- **Money:** whole naira in `integer` columns (no kobo).
- **Time:** `timestamptz` for moments, `date` / `time` for appointment slots, blocks and discount windows.
- **Snapshots:** orders, order items and appointments copy the customer, address, product and service details at
  checkout or booking time, so later edits never rewrite history.
- **Status values:** Postgres enums in snake_case, e.g. `pending_verification` or `on_leave`. All enums are listed in
  [`_shared.ts`](../../apps/web/db/schema/_shared.ts).
- **Secrets:** never stored in tables. API keys and bot tokens live in environment variables; `settings` holds
  only non-secret configuration.

## Tables

| Area       | Tables                                                                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity   | `profiles` (1:1 with `auth.users`), `admins`, `admin_permissions`, `roles`, `role_permissions`, `permissions`, `login_history`               |
| Catalog    | `categories`, `products`, `product_images`, `product_categories`, `product_options`, `product_option_values`, `inventory`, `stock_movements` |
| Commerce   | `carts`, `cart_items`, `discounts`, `orders`, `order_items`, `order_events`, `payments`, `delivery_rates`, `admin_notes`                     |
| Engagement | `reviews`, `wishlists`, `addresses`, `newsletter_subscribers`                                                                                |
| Salon      | `services`, `specialists`, `specialist_services`, `availability`, `blocks`, `appointments`, `appointment_events`                             |
| Content    | `site_content`, `faqs`, `policies`, `announcements`, `testimonials`, `media`, `social_links`, `settings`, `email_templates`                  |
| Operations | `notifications`, `audit_logs`                                                                                                                |

### Payment rules enforced by the database

- `orders.transaction_reference` must be exactly 8 digits and unique. It is customer-facing and used as the
  bank-transfer narration.
- `orders.order_number` is the internal identifier; it is unique and can never equal the transaction reference.
- `orders.total` must equal `subtotal + delivery_fee - discount_amount`.
- `payments.status = 'payment_confirmed'` requires `confirmed_at`. Only server code (the admin's
  **Confirm Payment** action) can write payments; customers can only read their own.

## Access model

Two layers protect the Supabase Data API (what a browser can reach with the publishable key):

1. **Grants** ([`…_api_grants.sql`](../../supabase/migrations)) decide which tables and columns the `anon`
   (signed out) and `authenticated` (signed in) roles can touch at all.
2. **RLS policies** (in the Drizzle schema) decide which rows they see.

| Who                | Can read                                                                                                                                                                                                                                                                      | Can write                                              |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Anyone             | Published products and their images, options and stock; categories; published services; active specialists; site content, FAQs, policies, enabled announcements and social links; active testimonials; enabled delivery rates; visible reviews (without the reviewer's email) | Nothing                                                |
| Signed-in customer | The above, plus their own profile, addresses, wishlist, cart, orders (with items, timeline and payment), appointments and reviews                                                                                                                                             | Their own name and phone, addresses, wishlist and cart |
| Server code        | Everything                                                                                                                                                                                                                                                                    | Everything, after checking the admin's permissions     |

Tables with no policies (admins, roles, settings, discounts, audit logs, availability, blocks, media,
notifications, newsletter subscribers and so on) are **server-only**: RLS is on and nothing is granted, so the
Data API can't reach them.

Server code uses `db` from [`apps/web/db/index.ts`](../../apps/web/db/index.ts), which bypasses RLS. Every
admin action must call a permission check first; that check arrives in Phase 2.

## Working locally

Requires Docker Desktop to be running. Stop everything afterwards to free memory.

```bash
corepack pnpm db:start     # start local Supabase and apply all migrations
corepack pnpm db:seed      # load the prototype's demo data (prints the login password)
corepack pnpm db:test      # run the RLS and constraint tests (supabase/tests)
corepack pnpm db:reset     # wipe the local database and re-apply migrations
corepack pnpm db:stop      # stop the containers
```

Studio (a table browser) runs at http://127.0.0.1:54323 while Supabase is up.

## Changing the schema

1. Edit the Drizzle files in `apps/web/db/schema`.
2. Generate a migration: `cd apps/web && npx drizzle-kit generate --name <what_changed>`.
   For grants, functions or anything Drizzle can't express, add `--custom` and write the SQL by hand.
3. Apply it locally with `corepack pnpm db:reset`, then run `corepack pnpm db:test`.
4. If the change touches access, add tests to `supabase/tests/database/`.
5. Commit the migration together with the schema change.

Never edit a migration that has been applied to a hosted project. Write a new one instead.

## Hosted projects

Migrations are applied to `luxichic-dev` and `luxichic-prod` with the Supabase CLI
(`supabase link --project-ref <ref>` and then `supabase db push`). The seed script is for local and dev only:
`pnpm db:seed -- --remote` needs the dev project's `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL` and
`SUPABASE_SECRET_KEY`, and it refuses anything that looks like production. Production never gets demo data or
demo accounts.
