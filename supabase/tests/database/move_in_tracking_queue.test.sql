-- Clean-rebuild queue contract: a synthetic 851-unit project verifies set semantics and field-write access.
begin;
select no_plan();

create function pg_temp.hid(prefix text, n integer) returns uuid language sql immutable as $$
  select md5('tracking-rebuild-' || prefix || n::text)::uuid
$$;
create function pg_temp.login(u text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', u, true)::void
$$;

insert into public.project(id, organization_id, name)
values ('1283e198-5043-4027-96d6-edcc7a6686c6', '10000000-0000-4000-8000-000000000001', 'Synthetic tracking rebuild');
insert into public.project_member(id, project_id, user_id, role) values
  (pg_temp.hid('member', 1), '1283e198-5043-4027-96d6-edcc7a6686c6', '30000000-0000-4000-8000-0000000000c1', 'PROJECT_ADMIN'),
  (pg_temp.hid('member', 2), '1283e198-5043-4027-96d6-edcc7a6686c6', '30000000-0000-4000-8000-00000000000e', 'CLIENT_MANAGER');

insert into public.project_unit(unit_id, project_id, building_no, unit_no)
select pg_temp.hid('unit', n), '1283e198-5043-4027-96d6-edcc7a6686c6', '101', n::text
from generate_series(1, 851) n;
insert into public.customer(id, project_id, name, phone, phone_normalized)
select pg_temp.hid('customer', n), '1283e198-5043-4027-96d6-edcc7a6686c6', 'Synthetic ' || n,
       '010' || lpad(n::text, 8, '0'), '010' || lpad(n::text, 8, '0')
from generate_series(1, 851) n;
insert into public.contract(contract_id, project_id, unit_id, customer_id, contract_status)
select pg_temp.hid('contract', n), '1283e198-5043-4027-96d6-edcc7a6686c6',
       pg_temp.hid('unit', n), pg_temp.hid('customer', n), 'ACTIVE'
from generate_series(1, 851) n;
insert into public.unit_occupancy_status(project_id, unit_id, contract_id, legacy_grade, last_contact_at, next_contact_at)
select '1283e198-5043-4027-96d6-edcc7a6686c6', pg_temp.hid('unit', n), pg_temp.hid('contract', n),
       case when n % 7 = 0 then 'D' when n % 5 = 0 then 'C' when n % 11 = 0 then '부재' else 'A' end,
       now() - interval '30 days',
       case when n = 1 then now() - interval '1 hour' else null end
from generate_series(1, 851) n;

-- Production receives no default policy rows; the synthetic test adds only the rows needed to exercise policy reasons.
insert into public.move_in_tracking_policy(project_id, reason_code, stale_after, created_by) values
  ('1283e198-5043-4027-96d6-edcc7a6686c6', 'D_GRADE_STALE', interval '7 days', pg_temp.hid('member', 1)),
  ('1283e198-5043-4027-96d6-edcc7a6686c6', 'C_GRADE_STALE', interval '14 days', pg_temp.hid('member', 1)),
  ('1283e198-5043-4027-96d6-edcc7a6686c6', 'ABSENCE_RETRY', interval '21 days', pg_temp.hid('member', 1));

select pg_temp.login('30000000-0000-4000-8000-00000000000e');
set local role authenticated;

select is(
  (select count(*) from public.get_move_in_today_queue('1283e198-5043-4027-96d6-edcc7a6686c6', now())),
  (select count(distinct unit_id) from public.get_move_in_today_queue('1283e198-5043-4027-96d6-edcc7a6686c6', now())),
  '851 synthetic units: one current active unit produces at most one queue row'
);
select ok(
  exists (
    select 1 from public.get_move_in_today_queue('1283e198-5043-4027-96d6-edcc7a6686c6', now())
    where unit_id = pg_temp.hid('unit', 1)
      and reason_codes @> array['FOLLOW_UP_DUE']::text[]
  ),
  'one unit can retain its due-follow-up reason inside the reason array'
);
select is(
  position('where c.unit_id = b.unit_id' in lower(pg_get_functiondef(
    'public.get_move_in_today_queue(uuid,timestamptz)'::regprocedure
  ))),
  0,
  'queue avoids a per-unit correlated consultation lookup'
);

select lives_ok(
  $$ select public.create_move_in_consultation(
    '1283e198-5043-4027-96d6-edcc7a6686c6', pg_temp.hid('unit', 2), pg_temp.hid('customer', 2),
    'OUTBOUND', 'Synthetic tracking consultation', p_legacy_grade := 'C', p_next_contact_at := now() + interval '7 days'
  ) $$,
  'CLIENT_MANAGER may record consultation, grade, and next contact'
);
select is(
  (select legacy_grade from public.unit_occupancy_status where unit_id = pg_temp.hid('unit', 2)),
  'C',
  'consultation grade updates the current master snapshot'
);

select lives_ok(
  $$ select public.complete_or_snooze_move_in_tracking(
    '1283e198-5043-4027-96d6-edcc7a6686c6', pg_temp.hid('unit', 1), 'COMPLETE'
  ) $$,
  'CLIENT_MANAGER may complete only today''s tracking action'
);
select is(
  (select count(*) from public.get_move_in_today_queue('1283e198-5043-4027-96d6-edcc7a6686c6', now()) where unit_id = pg_temp.hid('unit', 1)),
  0::bigint,
  'COMPLETE suppresses the identical same-day source fingerprint'
);
select is(
  (select count(*) from public.get_move_in_today_queue('1283e198-5043-4027-96d6-edcc7a6686c6', now() + interval '1 day') where unit_id = pg_temp.hid('unit', 1)),
  1::bigint,
  'today completion does not terminate the tracking lifecycle on the next KST date'
);

reset role;
select ok(
  not has_table_privilege('authenticated', 'public.customer', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.contract', 'INSERT,UPDATE,DELETE'),
  'CLIENT_MANAGER still has no direct customer-master or contract-master DML'
);
select ok(
  to_regclass('public.payment_transaction') is null
  or not has_table_privilege('authenticated', 'public.payment_transaction', 'INSERT,UPDATE,DELETE'),
  'CLIENT_MANAGER has no payment ledger DML when a ledger exists'
);

select * from finish();
rollback;
