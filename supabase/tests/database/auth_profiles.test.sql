-- Auth → profiles triggers. Run with: pnpm db:test
begin;
create extension if not exists pgtap with schema extensions;

select plan(7);

-- Email + password sign-up with name and phone.
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000c1', 'chi@test.local',
   '{"full_name": "Chioma Eze", "phone": "08030000000"}', '{"provider": "email"}');
select is((select full_name from profiles where id = '00000000-0000-0000-0000-0000000000c1'), 'Chioma Eze',
  'sign-up creates a profile with the full name');
select is((select phone from profiles where id = '00000000-0000-0000-0000-0000000000c1'), '08030000000',
  'and the phone number');
select is((select status::text from profiles where id = '00000000-0000-0000-0000-0000000000c1'), 'active',
  'new profiles are active');

-- Google sign-in sends "name" rather than "full_name".
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000c2', 'tolu@test.local', '{"name": "Tolu Ade"}', '{"provider": "google"}');
select is((select full_name from profiles where id = '00000000-0000-0000-0000-0000000000c2'), 'Tolu Ade',
  'Google sign-in uses the Google name');

-- No name at all falls back to the email's local part.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000c3', 'nobody@test.local');
select is((select full_name from profiles where id = '00000000-0000-0000-0000-0000000000c3'), 'nobody',
  'missing name falls back to the email');

-- Admin logins don't stay customers.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000d1', 'staff@test.local');
insert into admins (id, full_name, email) values ('00000000-0000-0000-0000-0000000000d1', 'Staff', 'staff@test.local');
select is((select count(*)::int from profiles where id = '00000000-0000-0000-0000-0000000000d1'), 0,
  'adding an admin removes their customer profile');

-- A confirmed email change is copied to the profile.
update auth.users set email = 'chioma@test.local' where id = '00000000-0000-0000-0000-0000000000c1';
select is((select email from profiles where id = '00000000-0000-0000-0000-0000000000c1'), 'chioma@test.local',
  'email changes in Auth are copied to the profile');

select * from finish();
rollback;
