-- Product search document triggers (migration product_search). Run with: pnpm db:test
begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

insert into categories (id, division, slug, name, group_name) values
  ('00000000-0000-0000-0000-00000000ca01', 'hairs', 'test-glueless', 'Glueless Units', 'Test');

insert into products (id, division, slug, sku, name, short_description, description, price, status, attributes, specs)
values (
  '00000000-0000-0000-0000-00000000aa01', 'hairs', 'test-zanzibar-wig', 'TEST-ZW', 'Zanzibar Wave Wig',
  'Soft and bouncy.', 'Made for everyday wear.', 100000, 'published',
  '{"texture": "Loose wave", "lengths": [18, 26], "brand": "Kalahari"}',
  '[{"label": "Cap", "value": "Swiss lace"}]'
);

select ok((select search_document @@ to_tsquery('english', 'zanzibar') from products where sku = 'TEST-ZW'),
  'a new product is found by its name');
select ok((select search_document @@ to_tsquery('english', 'kalahari & 26 & inch') from products where sku = 'TEST-ZW'),
  'and by its attributes and lengths');
select ok((select search_document @@ to_tsquery('english', 'swiss') from products where sku = 'TEST-ZW'),
  'and by its specifications');

insert into product_categories (product_id, category_id) values
  ('00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-00000000ca01');
select ok((select search_document @@ to_tsquery('english', 'glueless') from products where sku = 'TEST-ZW'),
  'linking a category adds its name');

update categories set name = 'Pre-plucked Units' where id = '00000000-0000-0000-0000-00000000ca01';
select ok((select search_document @@ to_tsquery('english', 'pre-plucked') from products where sku = 'TEST-ZW'),
  'renaming the category updates its products');

delete from product_categories where product_id = '00000000-0000-0000-0000-00000000aa01';
select ok((select not search_document @@ to_tsquery('english', 'pre-plucked') from products where sku = 'TEST-ZW'),
  'unlinking the category removes its name');

update products set name = 'Mombasa Curl Wig' where sku = 'TEST-ZW';
select ok((select search_document @@ to_tsquery('english', 'mombasa') and not search_document @@ to_tsquery('english', 'zanzibar')
           from products where sku = 'TEST-ZW'),
  'renaming the product updates its document');

select is((select count(*)::int from products where search_document is null), 0, 'every product has a document');

select * from finish();
rollback;
