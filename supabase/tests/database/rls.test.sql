-- Row Level Security and API grant tests. Run with: pnpm db:test
-- Everything runs in a transaction that is rolled back, so no test data is left behind.
-- Assertions only look at the fixture rows below, so the suite passes on an empty or a seeded database.
begin;
create extension if not exists pgtap with schema extensions;

select plan(22);

-- ------------------------------------------------------------------
-- Fixtures (inserted as the postgres superuser, bypassing RLS)
-- ------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'ada@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'bola@test.local');

insert into profiles (id, full_name, email) values
  ('00000000-0000-0000-0000-00000000000a', 'Ada', 'ada@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'Bola', 'bola@test.local');

insert into products (id, division, slug, sku, name, price, status) values
  ('10000000-0000-0000-0000-000000000001', 'hairs', 'published-wig', 'T-1', 'Published wig', 1000, 'published'),
  ('10000000-0000-0000-0000-000000000002', 'hairs', 'draft-wig', 'T-2', 'Draft wig', 1000, 'draft');

insert into product_images (product_id, url) values
  ('10000000-0000-0000-0000-000000000001', '/a.jpg'),
  ('10000000-0000-0000-0000-000000000002', '/b.jpg');

insert into orders (id, order_number, transaction_reference, user_id, customer_name, customer_email, customer_phone,
                    ship_state, ship_city, ship_street, subtotal, total, payment_method)
values
  ('20000000-0000-0000-0000-00000000000a', 'LXC-TEST-A', '12345678', '00000000-0000-0000-0000-00000000000a',
   'Ada', 'ada@test.local', '080', 'Lagos', 'Ikeja', '1 Street', 1000, 1000, 'bank_transfer'),
  ('20000000-0000-0000-0000-00000000000b', 'LXC-TEST-B', '87654321', '00000000-0000-0000-0000-00000000000b',
   'Bola', 'bola@test.local', '080', 'Lagos', 'Ikeja', '2 Street', 1000, 1000, 'bank_transfer');

insert into payments (order_id, method, status, amount) values
  ('20000000-0000-0000-0000-00000000000a', 'bank_transfer', 'pending_verification', 1000);

insert into reviews (product_id, author_name, author_email, rating, title, body, status) values
  ('10000000-0000-0000-0000-000000000001', 'Ada', 'ada@test.local', 5, 'Great', 'Lovely', 'visible'),
  ('10000000-0000-0000-0000-000000000001', 'Spam', 'spam@test.local', 1, 'Hidden', 'Spam', 'hidden');

-- ------------------------------------------------------------------
-- Constraints
-- ------------------------------------------------------------------
select throws_ok(
  $$insert into orders (order_number, transaction_reference, customer_name, customer_email, customer_phone,
                        ship_state, ship_city, ship_street, subtotal, total, payment_method)
    values ('LXC-X', '1234', 'X', 'x@x', '0', 'Lagos', 'Ikeja', 'St', 1, 1, 'bank_transfer')$$,
  '23514', null, 'transaction reference must be exactly 8 digits'
);
select throws_ok(
  $$insert into orders (order_number, transaction_reference, customer_name, customer_email, customer_phone,
                        ship_state, ship_city, ship_street, subtotal, total, payment_method)
    values ('LXC-Y', '12345678', 'X', 'x@x', '0', 'Lagos', 'Ikeja', 'St', 1, 1, 'bank_transfer')$$,
  '23505', null, 'transaction reference must be unique'
);
select throws_ok(
  $$update payments set status = 'payment_confirmed' where order_id = '20000000-0000-0000-0000-00000000000a'$$,
  '23514', null, 'a confirmed payment must record when it was confirmed'
);

-- ------------------------------------------------------------------
-- Signed-out visitor (anon)
-- ------------------------------------------------------------------
set local role anon;

select is((select count(*)::int from products where sku in ('T-1', 'T-2')), 1, 'anon sees only published products');
select is(
  (select count(*)::int from product_images where product_id in ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002')),
  1, 'anon sees only images of published products'
);
select is(
  (select count(*)::int from reviews where product_id = '10000000-0000-0000-0000-000000000001'),
  1, 'anon sees only visible reviews'
);
select throws_ok('select author_email from reviews', '42501', null, 'anon cannot read reviewer emails');
select throws_ok('select * from orders', '42501', null, 'anon cannot read orders');
select throws_ok('select * from payments', '42501', null, 'anon cannot read payments');
select throws_ok('select * from profiles', '42501', null, 'anon cannot read profiles');
select throws_ok('select * from admins', '42501', null, 'anon cannot read admins');
select throws_ok('select * from settings', '42501', null, 'anon cannot read settings');
select throws_ok('select * from discounts', '42501', null, 'anon cannot read promo codes');

-- ------------------------------------------------------------------
-- Signed-in customer A
-- ------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select is((select count(*)::int from orders), 1, 'customer sees only their own orders');
select is((select order_number from orders), 'LXC-TEST-A', 'and it is their order');
select is((select count(*)::int from payments), 1, 'customer sees their own payment');
select is((select count(*)::int from profiles), 1, 'customer sees only their own profile');

select throws_ok(
  $$update payments set status = 'payment_confirmed', confirmed_at = now()$$,
  '42501', null, 'customer cannot confirm their own payment'
);
select throws_ok(
  $$update profiles set status = 'active' where id = '00000000-0000-0000-0000-00000000000a'$$,
  '42501', null, 'customer cannot change their account status'
);

update profiles set full_name = 'Ada O.' where id = '00000000-0000-0000-0000-00000000000b';
update profiles set full_name = 'Ada Okafor' where id = '00000000-0000-0000-0000-00000000000a';
reset role;
select is(
  (select full_name from profiles where id = '00000000-0000-0000-0000-00000000000b'),
  'Bola', 'customer cannot rename another customer'
);
select is(
  (select full_name from profiles where id = '00000000-0000-0000-0000-00000000000a'),
  'Ada Okafor', 'customer can rename themselves'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select throws_ok(
  $$insert into addresses (user_id, state, city, street) values ('00000000-0000-0000-0000-00000000000b', 'Lagos', 'Ikeja', 'St')$$,
  '42501', null, 'customer cannot add an address to another account'
);

select * from finish();
rollback;
