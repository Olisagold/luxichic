-- No double-booking (migration appointment_duration). Run with: pnpm db:test
begin;
create extension if not exists pgtap with schema extensions;

select plan(5);

insert into specialists (id, name, title) values
  ('00000000-0000-0000-0000-00000000bb01'::uuid, 'Test Specialist', 'Stylist'),
  ('00000000-0000-0000-0000-00000000bb02'::uuid, 'Other Specialist', 'Stylist');

create function pg_temp.book(ref text, specialist uuid, at time, minutes int, state appointment_status default 'pending')
returns void language sql as $$
  insert into appointments (reference, service_name, specialist_id, date, time, duration_minutes,
                            customer_name, customer_email, customer_phone, status)
  values (ref, 'Test service', specialist, '2030-01-07', at, minutes, 'Test', 'test@example.com', '0800', state);
$$;

select lives_ok($$ select pg_temp.book('APT-T00001', '00000000-0000-0000-0000-00000000bb01', '10:00', 120) $$,
  'a booking from 10:00 to 12:00');
select throws_ok($$ select pg_temp.book('APT-T00002', '00000000-0000-0000-0000-00000000bb01', '11:00', 60) $$,
  '23P01', null, 'an overlapping booking for the same specialist is refused');
select lives_ok($$ select pg_temp.book('APT-T00003', '00000000-0000-0000-0000-00000000bb01', '12:00', 60) $$,
  'a booking that starts when the last one ends is fine');
select lives_ok($$ select pg_temp.book('APT-T00004', '00000000-0000-0000-0000-00000000bb02', '10:30', 60) $$,
  'another specialist can take the same time');

update appointments set status = 'cancelled' where reference = 'APT-T00001';
select lives_ok($$ select pg_temp.book('APT-T00005', '00000000-0000-0000-0000-00000000bb01', '10:00', 60) $$,
  'a cancelled booking frees its time');

select * from finish();
rollback;
