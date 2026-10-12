-- Product ratings follow visible reviews (migration review_ratings). Run with: pnpm db:test
begin;
create extension if not exists pgtap with schema extensions;

select plan(7);

insert into products (id, division, slug, sku, name, short_description, description, price, status)
values ('00000000-0000-0000-0000-00000000ab01', 'tools', 'test-rated-comb', 'TEST-RC', 'Rated Comb', 'A comb.',
        'A comb for testing.', 5000, 'published');

create function pg_temp.rating() returns text language sql as $$
  select rating::text || '/' || review_count from products where sku = 'TEST-RC';
$$;

select is(pg_temp.rating(), '0.0/0', 'a new product has no rating');

insert into reviews (id, product_id, author_name, rating, title, body) values
  ('00000000-0000-0000-0000-00000000ae01', '00000000-0000-0000-0000-00000000ab01', 'A', 5, 'Great', 'Really great comb');
select is(pg_temp.rating(), '5.0/1', 'a review sets the rating');

insert into reviews (id, product_id, author_name, rating, title, body) values
  ('00000000-0000-0000-0000-00000000ae02', '00000000-0000-0000-0000-00000000ab01', 'B', 2, 'Meh', 'Not for my hair');
select is(pg_temp.rating(), '3.5/2', 'the rating is the average of the reviews');

update reviews set status = 'hidden' where id = '00000000-0000-0000-0000-00000000ae02';
select is(pg_temp.rating(), '5.0/1', 'hidden reviews don''t count');

update reviews set rating = 4 where id = '00000000-0000-0000-0000-00000000ae01';
select is(pg_temp.rating(), '4.0/1', 'editing a rating updates the product');

delete from reviews where id = '00000000-0000-0000-0000-00000000ae01';
select is(pg_temp.rating(), '0.0/0', 'deleting the last review clears the rating');

select is((select count(*)::int from products p
            where p.review_count <> (select count(*) from reviews r where r.product_id = p.id and r.status = 'visible')),
          0, 'every product''s review count matches its visible reviews');

select * from finish();
rollback;
