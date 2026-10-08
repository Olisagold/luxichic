-- Table privileges for the Supabase Data API roles (anon = signed out, authenticated = signed in).
--
-- RLS policies decide WHICH ROWS a role sees; these grants decide WHICH TABLES/COLUMNS it can touch.
-- Local Supabase grants everything on new tables by default, while the hosted projects expose nothing
-- ("automatically expose new tables" is off). Revoking first and granting explicitly makes both identical.
--
-- The app's server code connects directly (Drizzle) or with the secret key and is not affected by this.

-- 1. Start from nothing, for existing and future tables.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

-- 2. Public storefront data (rows further limited by RLS, e.g. only published products).
GRANT SELECT ON
  categories,
  products,
  product_images,
  product_categories,
  product_options,
  product_option_values,
  inventory,
  delivery_rates,
  services,
  specialists,
  specialist_services,
  site_content,
  faqs,
  policies,
  announcements,
  testimonials,
  social_links
TO anon, authenticated;

-- Reviews: everything except the author's email.
GRANT SELECT (id, product_id, user_id, author_name, rating, title, body, images, verified, status, created_at, updated_at)
  ON reviews TO anon, authenticated;

-- 3. A signed-in customer's own data (rows limited to auth.uid() by RLS).
GRANT SELECT ON profiles TO authenticated;
-- Customers can change their name and phone, never their email, status or setup flag.
GRANT UPDATE (full_name, phone) ON profiles TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON addresses TO authenticated;
GRANT SELECT, INSERT, DELETE ON wishlists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON carts, cart_items TO authenticated;

-- Orders, payments and appointments are created and changed by server code only.
GRANT SELECT ON orders, order_items, order_events, payments, appointments, appointment_events TO authenticated;
