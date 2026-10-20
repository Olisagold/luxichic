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
| Admin sign-in       | Email + password only (no Google). First owner admin on prod: olisaejezie@gmail.com                                    |
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

✅ **Done and live on 2026-10-10.** How it works and the setup checklist: `docs/auth/README.md`.

1. ✅ Supabase Auth email + password: sign up, sign in, sign out, forgot and reset password. The pages keep their
   UI; login and register gain a **Continue with Google** button.
2. ✅ Google sign-in (button + `/auth/callback`); Google Cloud OAuth client enabled in both Supabase projects.
   ⏳ The Google consent screen gets a final check at launch, with the custom domain (Phase 11).
3. ✅ Database triggers: a `profiles` row for every new login; confirmed email changes copied over; adding an
   admin removes their customer profile. pgTAP tests (29 checks in total) pass.
4. **Deferred to Phase 11** (no domain yet, decided 2026-10-08): Supabase Auth emails through Resend SMTP, with
   LUXICHIC-branded templates. Until then "Confirm email" stays off on the hosted projects so sign-up works, and
   the built-in mailer only reaches the Supabase team's own address (about 2 emails an hour).
5. ✅ Session refresh in `middleware.ts`, skipped for visitors with no session. Signed-out visitors to `/account`
   and `/admin` go to the right sign-in page, keeping the page they asked for.
6. ✅ `/account/*` checked on the server in the layout.
7. ✅ Admin auth:
   - Sign-in needs an active `admins` row.
   - `/admin/(dashboard)` layout checks this on the server; no admin content reaches anyone else.
   - `requirePermission()` helper for server actions.
   - Each sign-in recorded in `login_history` and `audit_logs`.
8. ✅ `AuthContext` and `AdminAuthContext` run on Supabase sessions. Their local-storage sessions, passwords and
   reset tokens are gone and cleared from visitors' browsers. The admin screens' customer list stays on prototype
   data until Phase 8.
9. ✅ Demo credentials removed from the code and the `User`/`AdminUser` types; verified no demo password appears
   in any script the browser loads. Dev logins come from the seed script; production gets none.
10. ✅ Live (2026-10-09/10):
    - Auth migration applied to both projects.
    - Auth settings set on both: URLs, "Confirm email" off, passwords of 8+ characters.
    - Owner admin created on prod; the temporary password has been changed.
    - Vercel env vars set (prod for Production, dev for Preview) and redeployed.
    - Google enabled.

Tested end to end in a browser against local Supabase (33 checks): redirects, sign-in, wrong password,
"Remember me", registration and duplicate emails, reset by real email (Mailpit) including used links, suspended
customers and admins, admin sign-in and its logging, customers kept out of `/admin`, addresses, and no demo
passwords in the bundle.

## Phase 3: Catalog and content (read side) ✅

**Decided 2026-10-10:** prod starts with a copy of the prototype's catalog: products, categories, salon
services, specialists and site content. No customers, orders, reviews or logins. The live shop looks the same
when it switches to the database, and the admin replaces items in Phase 8.

1. ✅ Data layer in `lib/storefront/`: `source.ts` reads products, categories, services, specialists, content and
   public settings; `derive.ts` turns them into what customers see; `data.ts` caches it. Checked field by field
   against the prototype: identical.
2. ✅ The storefront layout loads it on the server and hands it to `StorefrontProvider`; components use
   `useStorefront()` / `useCatalog()`. No more module-level arrays in the shop. Checkout data (bank, promo codes,
   delivery fees, pay on delivery) and salon booking rules stay on the prototype until Phases 5 and 6.
3. ✅ Cached with `unstable_cache` under the `storefront` tag, refreshed hourly. Phase 8's admin actions call
   `revalidateTag('storefront')` so edits show at once.
4. ✅ SEO: metadata and share image per product, category, service and policy page (prebuilt from the
   database), schema.org Product data, `sitemap.xml`, `robots.txt` (previews not indexed).
5. ✅ Images in Supabase Storage (public `media` bucket, only the server writes). Each image is resized once
   with sharp (`lib/media/variants.ts`): the untouched original plus WebP at 300, 600, 1200 and 1920px wide,
   keeping its shape (layouts crop with CSS). Storefront images use `<SiteImage>` (next/image) with a custom
   loader that picks the stored width; no Vercel or Supabase resizing. The database keeps the 1200px URL.
   `pnpm db:media` uploads `public/images` and rewrites the database URLs (safe to re-run). Phase 8's admin
   uploads use the same code: the browser sends the original straight to Storage (Vercel rejects requests over
   4.5 MB), then the server makes the sizes.
6. ✅ Product search on Postgres full-text search (`lib/storefront/search.ts`). `products.search_document`
   holds name, categories, attributes, lengths, descriptions and specs, weighted in that order and kept current
   by triggers (pgTAP tests in `supabase/tests/database/product_search.test.sql`). English stemming ("wigs" =
   "wig"), the last word may be unfinished, products whose name ends in a searched word lead ("Closure Wig"
   before "Wig Caps"), and a trigram fallback catches typos ("bone stright"). The `/search` page searches on
   the server; the search overlay and the in-category search call `GET /api/search` (ids only, cached).

Notes:

- `pnpm db:load-catalog` loaded the catalog into prod on 2026-10-10 (42 products, 68 categories, 11 services,
  6 specialists, content, FAQs, policies, delivery fees, email templates; no bank details).
- Prod payment settings set on 2026-10-12 with `pnpm db:set-payments` (until the admin Payments page saves to the
  database in Phase 8): bank transfer to MONIE POINT, LUXICHIC HAIRS, 5108508288; **Pay on Delivery off at
  launch**.
- Database reads run one at a time: parallel queries stalled on Supabase's transaction pooler (see `db/index.ts`).
- Unknown product/category/service slugs show the not-found page marked `noindex` (Next.js serves cached
  not-found results with status 200); unknown routes return a real 404.
- The ratings and review counts on products are prototype numbers. Phase 7 recalculates them from real reviews.

## Phase 4: Cart and wishlist ✅

Done 2026-10-12. No migration needed: `carts`, `cart_items` and `wishlists` came with Phase 1.

1. ✅ Cart (`lib/cart/actions.ts`, `contexts/CartContext.tsx`). Guests keep it in `localStorage`; signed-in
   customers keep it in `carts` / `cart_items`. On sign-in (password or Google) the guest cart merges into the
   account: a line in both keeps the larger quantity, and a line the guest added is moved out of "saved for
   later". After signing out the browser shows an empty guest cart, so a shared device doesn't show the account's
   cart.
2. ✅ Wishlist (`lib/wishlist/actions.ts`, `contexts/WishlistContext.tsx`) lives only in `wishlists`. A guest who
   taps the heart is asked to sign in, and that product is saved once they do (the prototype's browser wishlist
   merges the same way). `/wishlist` asks guests to sign in. Only published products can be saved.
3. ✅ Prices come from the server. The browser only sends product id, option selection and quantity
   (`lib/cart/items.ts`). The server prices each line from the catalog (`getStorefrontData()`, refreshed when
   the admin saves in Phase 8), and drops lines that can no longer be bought (product removed or unpublished, an
   option withdrawn), telling the customer. Guest carts are repriced each time a page loads.

Notes:

- Tested end to end in a browser against `luxichic-dev` with a throwaway customer (23 checks): guest cart,
  tampered prices and a fake product in `localStorage`, merge on sign-in, quantity / save for later / remove
  stored, signed-out cart empty and restored on sign-in, guest wishlist prompt and save-after-sign-in, wishlist
  add and remove, signed-out wishlist.
- Promo codes, delivery fees and "Buy Now" stay on the prototype until Phase 5. Stock is only checked when adding
  to the cart; `placeOrder` (Phase 5) re-reads prices and stock straight from the database, not the cached
  catalog.

## Phase 5: Checkout and orders ✅

Done 2026-10-12. Follows the **Payment flow** section above. Guest checkout stays. No migration needed.

1. ✅ `placeOrder` (`lib/orders/actions.ts`). Validates with Zod and recomputes everything from the database,
   uncached: prices and stock (`loadLiveProducts`), the delivery fee of an enabled state, the promo code and
   whether the payment method is offered. In one transaction it counts the promo use (only while under its
   limit), creates the order with its items, payment and timeline, takes the items out of stock (product and
   option stock, with `stock_movements`) and removes the ordered lines from a signed-in customer's saved cart.
   Order numbers and 8-digit transaction references come from the server (`node:crypto`) and retry on a clash.
   If the total differs from what the customer saw, nothing is placed: they see the new total and the cart is
   repriced. The cart now prices live too, so the two always agree.
2. ✅ Payment methods: bank transfer starts `pending_verification`, with the bank details from `settings`;
   Pay on Delivery (`pay_on_delivery`) only while it is switched on. Checkout reads bank details, delivery fees
   and Pay on Delivery from the database (`StorefrontData.checkout`).
3. ✅ "Send Payment Receipt on WhatsApp" on the confirmation page and the account order view (unchanged: it never
   changes the payment status).
4. ✅ The confirmation page shows an order only to its account or the browser that placed it (`lx_orders`
   cookie of order ids); anyone else tracks it with order number + email. The prototype's "simulate
   confirmation" email preview is gone (real emails come in Phase 9).
5. ✅ Guest orders join an account at sign-in, but only once its email is verified: a Google sign-in, or a
   confirmation email that was sent and clicked (`lib/orders/link.ts`). While "Confirm email" is off (until
   Phase 11), email + password sign-ups are auto-confirmed without any email, so their guest orders are not
   linked; otherwise anyone could read another person's orders by signing up with their email.
6. ✅ Account overview, orders list and order detail read the customer's own orders on the server.
7. ✅ Promo codes are checked on the server (`discounts`: active, dates, usage limit, minimum spend, store
   scope). `pnpm db:set-promo` creates or updates codes until the admin Discounts page saves (Phase 8).

Notes:

- Prod settings (2026-10-12): bank MONIE POINT / LUXICHIC HAIRS / 5108508288, Pay on Delivery off, promo code
  `LUXE10` (10% off everything, until 2026-12-31). Dev keeps the demo bank account and Pay on Delivery on.
- Tested end to end in a browser against `luxichic-dev` (36 checks), then cleaned up: guest bank transfer with
  LUXE10 and an option with its own stock; a price change between seeing and placing the order; the reference
  shown before placing is the order's; promo use counted; stock, option stock, movements and sales counts;
  confirmation hidden from other browsers and accounts; tracking needs the right email; signed-in Pay on
  Delivery from the saved cart; account order pages; not enough stock; Pay on Delivery switched off mid-checkout;
  guest orders linked for a verified email and not for an auto-confirmed one. Google sign-in linking follows the
  same rule but wasn't run headless.
- **Before launch:** the admin still shows the prototype's orders (Phase 8), so real orders can't be seen or
  confirmed in `/admin` yet, and no emails are sent (Phase 9). Cancelling an order doesn't return stock yet
  (Phase 8). Order tracking has no rate limit; add one with Phase 10's hardening.

## Phase 6: Salon booking ✅

Done 2026-10-12. Rules agreed and written down in [`docs/business-rules/salon.md`](docs/business-rules/salon.md).

1. ✅ Availability on the server (`lib/salon/availability.ts`, pure; `lib/salon/schedule.ts` loads it live):
   specialists who perform the service, their weekly hours, closed days/hours (`blocks`), the service's length
   and existing Pending/Confirmed/Rescheduled bookings. Hourly start times, Lagos time, up to 60 days ahead,
   at least 1 hour's notice. The prototype's random "taken" slots are gone.
2. ✅ `bookAppointment` (`lib/salon/actions.ts`) checks availability again. "No preference" gets the free
   specialist with the fewest bookings that day. Migration `appointment_duration` stores each booking's length
   and adds `appointments_no_double_booking`, an exclusion constraint: a specialist can't have two active
   appointments that overlap, even when booked at the same moment (pgTAP: `appointments.test.sql`). If it
   refuses, the next free specialist is tried or the customer picks another time. Applied to dev and prod.
3. ✅ The appointment page (`/salon/appointment/[reference]`) shows a booking only to its account or the browser
   that made it (`lx_appointments` cookie). Account appointments and the overview read the database.
4. ✅ **Decided 2026-10-12:** customers can cancel or reschedule online **any time before the appointment
   starts**, from its page; a rescheduled appointment goes **back to Pending**. Each change is in its history.
5. ✅ Guest appointments join an account under the same verified-email rule as orders.

Notes:

- Tested end to end in a browser against `luxichic-dev` (21 checks), then cleaned up: closed weekdays and
  closed-salon days, times taken only when every specialist is busy, a service that doesn't fit before closing,
  choosing a specialist, guest booking with automatic assignment, hidden from other browsers, reschedule (new
  time, Pending, same specialist, history), cancel, a time taken between choosing and submitting, signed-in
  booking on the account pages, guest appointment linked to a verified account.
- **Before launch:** the admin still shows the prototype's appointments until Phase 8 (confirm, reject,
  admin reschedule, closed days), and no emails or Telegram alerts are sent until Phase 9.

## Phase 7: Reviews ✅

Done 2026-10-12.

1. ✅ **Decided 2026-10-12:** any signed-in customer can review any product, not only online buyers (many buy
   in the physical store). "Verified purchase" marks reviewers with an online order for it that wasn't
   cancelled. One review per customer per product (unique index); they edit or delete it from the product page
   or their account (`lib/reviews/actions.ts`). Product pages load visible reviews on the server, cached under
   the `reviews` tag, and add `aggregateRating` to the structured data once there are reviews.
2. ✅ Review photos: shrunk in the browser (`lib/media/shrink.ts`), then stored as resized WebP only. No original
   is kept, so nothing from the camera (such as location) is published.
3. ✅ Ratings are real: a trigger (migration `review_ratings`) keeps each product's `rating` and `review_count`
   in step with its visible reviews, so moderation updates them too. This replaced the prototype's sample
   ratings; on prod every product starts with "No reviews yet". Applied to dev and prod.
4. ✅ Admin moderation (`/admin/reviews`, `lib/reviews/admin-actions.ts`): restore, hide, archive and delete,
   checked against `reviews.moderate` on the server and written to `audit_logs`. Brought forward from
   Phase 8's catalog item.

Notes:

- Tested end to end in a browser against `luxichic-dev` (21 checks), then cleaned up: guest sign-in prompt,
  posting with a photo (WebP sizes only, no original), rating follows each change, one review each, editing,
  verified after an online order, account page, admin sees author and product, hide (rating cleared, hidden
  review still visible to its author, audit log), delete. pgTAP: `review_ratings.test.sql`.
- Photos from abandoned review drafts stay in storage; a cleanup can come with the media library in Phase 8.

## Phase 8: Admin back office (in progress)

Connect each admin section to the database through server actions. Each action checks a permission and writes to
`audit_logs`. Done section by section.

1. ✅ **Orders** (2026-10-12; `lib/orders/admin-actions.ts`, `admin-queries.ts`): list and detail from the
   database, "Payment verification" tab, transaction reference searchable.
   - **Confirm Payment** (`orders.confirmPayment`) moves a pending bank transfer to `payment_confirmed` and the
     order to Confirmed, recording the admin and time on the payment and in `audit_logs`.
   - Status only moves forward, filling in skipped timeline steps; a transfer can't move on until its payment is
     confirmed; Pay on Delivery becomes Paid when delivered.
   - Cancelling needs a reason and returns the stock and the promo-code use; deleting does too unless the order
     was cancelled or delivered. Bulk changes report the orders left unchanged. Internal notes in `admin_notes`.
   - Tested in a browser against dev (17 checks) with real orders placed through the shop, then cleaned up.
   - Still to come: the payment-confirmed and status emails (Phase 9).
2. ✅ **Products** (2026-10-12; `lib/catalog/admin-actions.ts`): list, editor and inventory read the catalog on the
   server (every status, uncached) and save through permission-checked actions that write `audit_logs` and refresh
   the storefront at once. Products are stored the same way as the catalog loader stores them
   (`lib/catalog/product-rows.ts`).
   - Editor: images, categories, options, stock; SKU and URL unique; publishing needs an image.
   - Image uploads (`lib/media/admin-upload.ts`): the browser sends the original straight to Storage with a
     signed URL, the server makes the WebP sizes and records it in the media library. The editor's library
     picker reads the database.
   - List: duplicate as draft, publish/unpublish/archive, feature/bestseller, add category, delete (single or bulk).
   - Inventory: product and option stock adjustments and low-stock thresholds, all in the stock history.
   - Tested in a browser against dev (16 checks, including a real image upload and the change showing on the shop
     at once), then cleaned up. Low-stock alerts to the team come with Phase 9's notifications.
3. ✅ **Catalog** (2026-10-12): categories (`lib/catalog/category-actions.ts`) and promo codes
   (`lib/checkout/discount-actions.ts`) from the database; review moderation was done in Phase 7.
   - Categories: create, edit, rename, delete per store, with image uploads. The homepage's featured collections
     follow a rename or delete; the built-in listings (all, new arrivals, bestsellers, discounted) are protected.
   - Promo codes: create, edit, switch off, delete; unique ignoring case, stored in capitals; "no end date" is
     kept as 2099-12-31. Checkout uses changes at once, so `pnpm db:set-promo` is no longer needed.
   - Admin actions now share `lib/auth/admin-action.ts` (permission check, messages, cache refresh, audit log).
   - Tested in a browser against dev (15 checks, including a new code working at checkout and a switched-off
     one refused); the orders and reviews tests were rerun after the refactor and still pass.
4. ✅ **Customers** (2026-10-12; `lib/customers/admin-actions.ts`): list, detail and activity from the database
   (guests who only ordered or booked show as guest rows). Block/unblock (refused at sign-in, checkout and
   booking), edit name/phone/email (a new email becomes the login), add a customer (no password: they use
   "Forgot password" until invitation emails arrive in Phase 11), delete (orders, bookings and reviews stay),
   internal notes. Tested in a browser against dev (13 checks, including a blocked customer refused at sign-in
   and signing in with a changed email), then cleaned up.
5. ✅ **Salon** (2026-10-12; `lib/salon/admin-actions.ts`): appointments, calendar, services, specialists and
   closed days from the database, permission-checked and logged; services, specialists and closed days refresh
   the storefront at once.
   - Appointments: confirm, complete, reject, cancel (with reasons, in the appointment's history); reschedule
     offers the server's free times and keeps the originally requested time; the database still refuses a
     double booking.
   - Calendar open days and hours follow the active specialists' working hours.
   - Services (with image upload and specialist assignment) and specialists (working days and hours, services,
     status; deleting refused while they have upcoming bookings).
   - Tested in a browser against dev (14 checks, including a closed day showing as fully booked to customers and
     a new service live on the salon pages), then cleaned up. A new service's default WhatsApp number still comes
     from the prototype config until the Settings section (now the business WhatsApp number).
6. ✅ **Website content** (2026-10-12; `lib/content/admin-actions.ts`): homepage, About, FAQs, contact and
   policies load on the server and save only what changed (blocks in `site_content`; announcements,
   testimonials, FAQs and policies in their tables), with `content.homepage` / `content.pages` checked per part;
   the storefront refreshes at once. Media library and image picker upload to Storage; deleting an image is
   refused while anything still shows it, otherwise its files are removed too. Tested in a browser against dev
   (12 checks, each change seen on the live pages), with the content snapshotted and restored afterwards.
7. ✅ **Operations** (2026-10-12; `lib/settings/admin-actions.ts`), each permission-checked and logged:
   - Payments (bank details, Pay on Delivery; replaces `pnpm db:set-payments`) and delivery (fee, free and
     on/off per state, delivery text). Checkout follows at once.
   - Email: Resend sender name/address/reply-to (replaces the SMTP form; the key stays in `RESEND_API_KEY`) and
     the email templates. Sending starts in Phase 9.
   - Notifications: mark read and alert preferences. New **Telegram** page (`/admin/telegram`, in the sidebar
     under Operations, permission `settings.general`): bot status via the Bot API, alert chat ID, new-order and
     new-appointment toggles, message templates, test message. The bot token stays in `TELEGRAM_BOT_TOKEN`.
   - **WhatsApp** stays visible with a "Coming soon" note; its fields are disabled and nothing is saved.
   - Tested in a browser against dev (15 checks, including checkout showing the new fee and bank and refusing a
     state switched off), with the settings snapshotted and restored afterwards.
8. ✅ **Administration** (2026-10-13; `lib/admins/admin-actions.ts`): admin users, roles page and activity log
   (`audit_logs`, with filters and CSV) from the database.
   - Add an admin with a role, permissions and a **temporary password** (a Supabase Auth login). Until the email
     setup at launch there's no invitation email; Phase 11 switches this to an emailed invite.
   - Edit, suspend (refused at sign-in), reset password, delete. Server rules: the owner can't be changed; nobody
     changes their own permissions or status or deletes themselves; only the owner can grant `admins.manage`.
   - Tested in a browser against dev (13 checks: new admin signs in with only their permissions, suspended one is
     refused, reset password works, a non-owner can't escalate), then cleaned up.
9. ✅ **Settings** (2026-10-13; `lib/settings/admin-actions.ts`), each permission-checked and logged:
   - General and business details (`settings.general`): the storefront footer, contact details and WhatsApp
     button follow at once; a new salon service defaults to this WhatsApp number.
   - Social links: saved to `social_links` in order (URL checked per platform), with the floating chat number.
   - Security (every admin): change password, recent sign-ins from `login_history` (own, or everyone's for the
     owner and `admins.manage`). Sign-in protection (`settings.general`): the idle timeout signs admins out
     after inactivity across tabs; login alert emails are sent from Phase 9.
   - Tested in a browser against dev (21 checks, including the old password refused after a change and an idle
     sign-out at 15 minutes), with the settings snapshotted and restored afterwards.
10. ✅ **Dashboard and analytics** (2026-10-13; `lib/analytics/admin-queries.ts`): figures are aggregated in
    Postgres for the range in the URL (`?range=30d`, or `custom` with from/to; Lagos days, compared with the
    previous period). Revenue excludes cancelled orders.
    - Sidebar badges (pending orders and appointments, low stock, unread) and the topbar bell come from the
      admin layout; marking notifications read is saved.
    - The ⌘K search runs on the server and only searches sections the admin may see. Fixed the dialog taking
      focus away from the search box.
    - Tested in a browser against dev (16 checks, each figure compared with SQL), then cleaned up.
    - Left on prototype data for later phases: the email preview dialog (Phase 9) and the unused
      `hooks/useAdminOps.ts` (cleanup in Phase 10).

## Phase 9: Notifications

Set up on 2026-10-14: Resend with the verified domain `mail.luxichic.online` (bought at Hostinger), the Telegram bot
@luxichic_alerts_bot in the "Luxichic Team" group, and their keys in `.env.local` and Vercel.

1. ✅ **Email (Resend)** (`lib/email/*`): a branded layout (logo, details, items, button, contact footer) around each
   template's text, which the admin edits under Email → Templates; the sender comes from Email → Sender. Sent after
   the response (`after()`), never blocking the change:
   - Checkout: bank-transfer instructions (with the bank details) or order received (Pay on Delivery).
   - Payment confirmed, order confirmed, shipped, delivered, cancelled (Processing sends nothing).
   - Appointment requested (also when the customer moves it), confirmed, rejected, cancelled, rescheduled, and a
     reminder the day before (Vercel Cron at 08:00 UTC, `CRON_SECRET`; noted in the appointment's history so it's
     sent once).
   - Welcome once per account (flag in the login's app metadata); admin sign-in alert when switched on.
   - The order and appointment "Preview email" shows the real email as sent, and says if sending is off.
   - Still for Phase 11: the admin invite email (replaces temporary passwords) and Supabase's own auth emails
     (confirm email, password reset) through Resend SMTP, which is free on the Supabase plan.
2. ✅ **Telegram** (`lib/notify/team.ts`, `lib/telegram/*`): new-order and new-appointment alerts to the team chat
   (toggles and templates from `/admin/telegram`), plus the customer's own cancel or reschedule. The webhook
   (`pnpm telegram:webhook`, registered for luxichic.vercel.app) answers `/start` and `/chatid` with the chat ID.
3. ✅ **In-app notifications**: new orders, appointments (and customer changes), reviews, and low-stock/sold-out
   when an order takes a product to its threshold, each following its switch under Notifications.
4. ✅ **Contact form**: kept as a team notification (full text in Notifications) and emailed to the business address
   with the customer as reply-to; a hidden field catches bots; 3 messages an hour per address.
5. ✅ **Newsletter**: sign-ups saved (validated, one per address); Admin → Customers → Newsletter lists, searches,
   exports CSV and removes. No email marketing tool at launch.
6. ✅ Tested in a browser against dev (2026-10-14), with emails sent to Resend's test inboxes
   (`delivered+…@resend.dev`): 29 checks across alerts (8), emails and reminders (10), contact and newsletter (11),
   then cleaned up.
7. ✅ **CEO's routing request** (2026-10-19/20):
   - Specialist logins: an admin linked to a specialist profile (Admin users) sees and manages only their own
     bookings; built-in Specialist role (view, confirm, reschedule).
   - Telegram: bookings to the appointments group and privately to the specialist (new and every change); orders
     only to the orders group. Groups and specialists connect with one-tap links from Admin → Telegram.
   - Each admin's bell follows their permissions with per-admin read state; contact-form messages go to the owner,
     Super Admins and Customer Support only; store-wide switches only for settings managers.
8. ✅ **Phone notifications (web push)** (2026-10-20): installable apps "LUXICHIC" (shop) and "LUXICHIC Admin"
   (`/admin`), service worker `public/sw.js`, `push_subscriptions` table, `lib/push/*`.
   - Admins get exactly what their bell shows (Admin → Notifications → "Turn on notifications"; link in the bell).
   - Signed-in customers get payment confirmed, shipped, delivered, cancelled and appointment confirmed, moved,
     cancelled, rejected and the day-before reminder (Account page).
   - iPhone/iPad: only from the app added to the Home Screen (iOS 16.4+); the button explains this.
   - Needs `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` in Vercel.
   - Tested with real Chrome through Google's push service: a contact message reached the owner's device and not
     the Order Manager's.
9. ✅ **Earlier guest orders join a new account** (2026-10-20; `lib/auth/guest-records.ts`): when someone signs up
   with an email that has guest orders or appointments, they get a "Confirm your email" message (signed link,
   3 days); confirming adds those orders and appointments to the account, saves their delivery addresses (first
   as default, no duplicates) and fills an empty phone. Until then the account shows only how many were found.
   Google sign-ins link straight away; later guest orders with a confirmed email join on the next visit.
   Tested on dev (11 checks, including tampered/expired links and opening the link signed out).

## Phase 10: Quality

1. ✅ **Unit tests (Vitest)** (2026-10-20; `pnpm test`, run in CI): 51 tests in `apps/web/lib/**/*.test.ts` for
   promo codes, option prices and cart lines, delivery fees, sale dates, salon availability (hours, notice, window,
   Sundays, closed hours, no double-booking), order/transfer references, the Telegram order message, guest-order
   linking proof and confirmation links, and who sees which notification. Checked that deliberately broken rules fail.
2. ✅ **End-to-end tests (Playwright)** (2026-10-20; `apps/web/e2e`, `pnpm --filter @luxichic/web test:e2e`): a
   production build against the local Supabase (`pnpm db:start`, `supabase db reset`, `SEED_PASSWORD=E2e-Test-pw1
pnpm db:seed`), with email, Telegram and push switched off. Journeys: bank-transfer checkout, Pay on Delivery
   (switched on in Admin → Payments), booking, sign up / sign in (with a wrong password refused), admin confirms a
   payment. Each checks the database too. Stable over 3 runs.
3. ✅ **CI** runs format, lint, typecheck, unit tests and build, and a second job runs the end-to-end tests against
   a throwaway Supabase in Docker (report uploaded on failure).
4. ✅ **Accessibility and performance pass** (2026-10-20; Lighthouse, mobile, on the live site):
   - The slowest thing on the home page was the logo: every page loaded the ~500 KB logo originals and cropped them
     in CSS. Pre-cropped WebP logos (`public/images/logos`, ~10 KB each).
   - Fonts self-hosted with `next/font` instead of a render-blocking Google Fonts `@import` (~1 s).
   - Booking page: named "Book Now" link on phones, date picker as a group of buttons, readable "Closed" legend,
     step headings in order.
   - Before → after: home performance 59 → 75 (first paint 3.9 → 2.1 s, largest paint 8.7 → 4.7 s, 2.7 → 1.6 MB),
     product page 76 → 98, booking 75 → 87 (accessibility 87 → 100), contact 75 → 87. Accessibility, best practices
     and SEO 100 elsewhere (cart and admin login are hidden from search on purpose).
   - Left for later: shop photos are stored at 300/600/1200px, so phones needing ~720px get the 1200px file; an
     800px size in the upload pipeline would save ~200 KB on the home page.
5. ✅ The local build message ("TypeError … reading 'toISOString'" while refreshing a stale `storefront-data-v2`
   entry) could not be reproduced on 2026-10-20 (a dev session cached 87 entries, then a clean build). Builds always
   passed, CI builds from a clean cache, and the live site uses a cache key per deployment and has refreshed hourly
   without trouble. If it comes back, clear `.next/cache/fetch-cache`.

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

- **Faster admin image uploads** (measured 2026-10-12; waiting for the CEO's review). Resizing is fast (~0.15s);
  the time is network calls. Options, best first: (1) shrink photos in the browser to ~2560px before upload, which
  means the stored "original" is that copy, not the camera file (needs the CEO's OK); (2) upload the 4 sizes in
  parallel; (3) move the original into place instead of uploading it twice; (4) resize in parallel with a lighter
  WebP setting; (5) upload several images at once in the editor. All in `lib/media/admin-upload.ts`,
  `upload-client.ts` and the editor's images section.
- **Google sign-in shows the Supabase address** ("continue to dfiqnpqhyeittcmgjdrk.supabase.co"). Decided
  2026-10-14: fix after launch with (1) Google brand verification (app name LUXICHIC and logo on the consent
  screen) and/or (3) Google's own sign-in button on our pages (`signInWithIdToken`), whichever works best then.
  **No paid Supabase plan or custom-domain add-on**, now or later.
- Online payments (Paystack or Flutterwave), if manual verification becomes a bottleneck.
- WhatsApp Cloud API for customer messages.
- Marketing analytics (GA4) with a consent banner.
