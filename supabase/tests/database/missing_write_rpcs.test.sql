begin;

select no_plan();

do $roles$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
end
$roles$;

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create function pg_temp.impersonate(p_user_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', p_user_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
end;
$$;

insert into public.project_unit (unit_id, project_id, building_no, unit_no)
values
  ('7c000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '821', '101'),
  ('7c000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '821', '102'),
  ('7c000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', '821', '101');

insert into public.customer (
  id, project_id, name, phone, phone_normalized, assigned_counselor_id
) values
  (
    '5c000000-0000-4000-8000-0000000000a1',
    '20000000-0000-4000-8000-000000000001',
    'M10A Customer A',
    '01094000001',
    '01094000001',
    '40000000-0000-4000-8000-00000000000a'
  ),
  (
    '5c000000-0000-4000-8000-0000000000f1',
    '20000000-0000-4000-8000-000000000001',
    'M10A Customer F',
    '01094000002',
    '01094000002',
    '40000000-0000-4000-8000-00000000000f'
  ),
  (
    '5c000000-0000-4000-8000-0000000000e1',
    '20000000-0000-4000-8000-000000000001',
    'Existing Phone Customer',
    '01094100009',
    '01094100009',
    '40000000-0000-4000-8000-00000000000a'
  );

insert into public.entry_pool (
  entry_id, project_id, name_or_nickname, phone_normalized, acquisition_channel
) values
  (
    'e2000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'Entry A',
    '01094100001',
    'WEB'
  ),
  (
    'e2000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    'Entry B',
    '01094100002',
    'WEB'
  ),
  (
    'e2000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000001',
    'Entry reuse',
    '01094100009',
    'ADS'
  ),
  (
    'e2000000-0000-4000-8000-000000000004',
    '20000000-0000-4000-8000-000000000001',
    'Entry admin',
    '01094100004',
    'WEB'
  ),
  (
    'e2000000-0000-4000-8000-000000000005',
    '20000000-0000-4000-8000-000000000001',
    'Entry bad',
    'ABC',
    'WEB'
  );

insert into public.report_template (
  template_id, organization_id, project_id, report_phase, report_type,
  name, template_definition, mapping_definition, source_type
) values
  (
    'a8000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    null,
    'MOVE_IN',
    'WEEKLY',
    'Org1 weekly',
    '{}'::jsonb,
    '{}'::jsonb,
    'MANUAL'
  ),
  (
    'a8000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    'MOVE_IN',
    'WEEKLY',
    'P2 weekly',
    '{}'::jsonb,
    '{}'::jsonb,
    'MANUAL'
  );

set local role authenticated;
select pg_temp.impersonate('30000000-0000-4000-8000-00000000000a');

select lives_ok(
  $$ select public.promote_entry_to_customer(
       '20000000-0000-4000-8000-000000000001',
       'e2000000-0000-4000-8000-000000000001'
     ) $$,
  'COUNSELOR promotes own-project entry'
);

select is(
  (
    select status from public.entry_pool
    where entry_id = 'e2000000-0000-4000-8000-000000000001'
  ),
  'PROMOTED',
  'ENTRY status becomes PROMOTED'
);

select isnt_empty(
  $$ select entry_id from public.entry_pool
     where entry_id = 'e2000000-0000-4000-8000-000000000001' $$,
  'ENTRY row is preserved'
);

select is(
  (
    select count(*)::integer from public.customer
    where project_id = '20000000-0000-4000-8000-000000000001'
      and phone_normalized = '01094100001'
  ),
  1,
  'exactly one customer for promoted phone'
);

select is(
  (
    select count(*)::integer from public.funnel_event
    where event_type = 'ENTRY_PROMOTED'
      and metadata ->> 'entry_id' = 'e2000000-0000-4000-8000-000000000001'
  ),
  1,
  'FUNNEL_EVENT ENTRY_PROMOTED created'
);

select throws_ok(
  $$ select public.promote_entry_to_customer(
       '20000000-0000-4000-8000-000000000001',
       'e2000000-0000-4000-8000-000000000002'
     ) $$,
  '23514'
);

select is(
  (
    select public.promote_entry_to_customer(
      '20000000-0000-4000-8000-000000000001',
      'e2000000-0000-4000-8000-000000000003'
    )
  ),
  '5c000000-0000-4000-8000-0000000000e1'::uuid,
  'existing customer with same phone is reused'
);

select is(
  (
    select count(*)::integer from public.customer
    where project_id = '20000000-0000-4000-8000-000000000001'
      and phone_normalized = '01094100009'
  ),
  1,
  'reuse path does not duplicate customer'
);

select throws_ok(
  $$ select public.promote_entry_to_customer(
       '20000000-0000-4000-8000-000000000001',
       'e2000000-0000-4000-8000-000000000005'
     ) $$,
  '23514'
);

select is(
  (
    select status from public.entry_pool
    where entry_id = 'e2000000-0000-4000-8000-000000000005'
  ),
  'ACTIVE',
  'failed promote leaves ENTRY ACTIVE'
);

select is(
  (
    select count(*)::integer from public.funnel_event
    where metadata ->> 'entry_id' = 'e2000000-0000-4000-8000-000000000005'
  ),
  0,
  'failed promote does not write funnel_event'
);

select lives_ok(
  $$ select public.upsert_customer_unit_interest(
       '20000000-0000-4000-8000-000000000001',
       '5c000000-0000-4000-8000-0000000000a1',
       '7c000000-0000-4000-8000-000000000001',
       'HIGH',
       '전망'
     ) $$,
  'first CUI upsert inserts'
);

select is(
  (
    select count(*)::integer from public.customer_unit_interest
    where customer_id = '5c000000-0000-4000-8000-0000000000a1'
      and unit_id = '7c000000-0000-4000-8000-000000000001'
  ),
  1,
  'one CUI row after first upsert'
);

create temporary table cui_times as
select first_interested_at, last_interested_at, interest_id
from public.customer_unit_interest
where customer_id = '5c000000-0000-4000-8000-0000000000a1'
  and unit_id = '7c000000-0000-4000-8000-000000000001';

select lives_ok(
  $$ select public.upsert_customer_unit_interest(
       '20000000-0000-4000-8000-000000000001',
       '5c000000-0000-4000-8000-0000000000a1',
       '7c000000-0000-4000-8000-000000000001',
       'LOW',
       '가격'
     ) $$,
  'second CUI upsert updates same row'
);

select is(
  (
    select count(*)::integer from public.customer_unit_interest
    where customer_id = '5c000000-0000-4000-8000-0000000000a1'
      and unit_id = '7c000000-0000-4000-8000-000000000001'
  ),
  1,
  'second upsert does not add a row'
);

select is(
  (
    select first_interested_at from public.customer_unit_interest
    where customer_id = '5c000000-0000-4000-8000-0000000000a1'
      and unit_id = '7c000000-0000-4000-8000-000000000001'
  ),
  (select first_interested_at from cui_times),
  'first_interested_at is unchanged'
);

select cmp_ok(
  (
    select last_interested_at from public.customer_unit_interest
    where customer_id = '5c000000-0000-4000-8000-0000000000a1'
      and unit_id = '7c000000-0000-4000-8000-000000000001'
  ),
  '>',
  (select last_interested_at from cui_times),
  'last_interested_at increased'
);

select is(
  (
    select interest_level from public.customer_unit_interest
    where customer_id = '5c000000-0000-4000-8000-0000000000a1'
      and unit_id = '7c000000-0000-4000-8000-000000000001'
  ),
  'LOW',
  'interest_level updated'
);

select is(
  (
    select interest_reason from public.customer_unit_interest
    where customer_id = '5c000000-0000-4000-8000-0000000000a1'
      and unit_id = '7c000000-0000-4000-8000-000000000001'
  ),
  '가격',
  'interest_reason updated'
);

select throws_ok(
  $$ select public.upsert_customer_unit_interest(
       '20000000-0000-4000-8000-000000000001',
       '5c000000-0000-4000-8000-0000000000f1',
       '7c000000-0000-4000-8000-000000000002',
       'HIGH'
     ) $$,
  '42501'
);

select throws_ok(
  $$ select public.upsert_customer_unit_interest(
       '20000000-0000-4000-8000-000000000001',
       '5c000000-0000-4000-8000-0000000000a1',
       '7c000000-0000-4000-8000-000000000003',
       'HIGH'
     ) $$,
  '23514'
);

select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c1');

select lives_ok(
  $$ select public.promote_entry_to_customer(
       '20000000-0000-4000-8000-000000000001',
       'e2000000-0000-4000-8000-000000000004'
     ) $$,
  'PROJECT_ADMIN promotes entry'
);

select lives_ok(
  $$ select public.upsert_customer_unit_interest(
       '20000000-0000-4000-8000-000000000001',
       '5c000000-0000-4000-8000-0000000000f1',
       '7c000000-0000-4000-8000-000000000002',
       'HIGH',
       'admin'
     ) $$,
  'PROJECT_ADMIN upserts any project customer CUI'
);

-- generate_report regeneration
select lives_ok(
  $$ select public.generate_report(
       '20000000-0000-4000-8000-000000000001',
       '2026-09-12',
       'MOVE_IN',
       'WEEKLY',
       '{"n":1}'::jsonb,
       'a8000000-0000-4000-8000-000000000001'
     ) $$,
  'first generate_report'
);

create temporary table pg_temp.rpt as
select report_id, version, generated_data
from public.report
where project_id = '20000000-0000-4000-8000-000000000001'
  and report_date = '2026-09-12';

select lives_ok(
  $$ select public.generate_report(
       '20000000-0000-4000-8000-000000000001',
       '2026-09-12',
       'MOVE_IN',
       'WEEKLY',
       '{"n":2}'::jsonb
     ) $$,
  'regenerate_report'
);

select is(
  (
    select count(*)::integer from public.report
    where project_id = '20000000-0000-4000-8000-000000000001'
      and report_date = '2026-09-12'
  ),
  2,
  'previous report row preserved'
);

select isnt(
  (
    select report_id from public.report
    where project_id = '20000000-0000-4000-8000-000000000001'
      and report_date = '2026-09-12'
    order by version desc
    limit 1
  ),
  (select report_id from pg_temp.rpt),
  'regenerated report has a new id'
);

select is(
  (
    select version from public.report
    where project_id = '20000000-0000-4000-8000-000000000001'
      and report_date = '2026-09-12'
    order by version desc
    limit 1
  ),
  2,
  'regenerated version incremented'
);

select is(
  (
    select supersedes_report_id from public.report
    where project_id = '20000000-0000-4000-8000-000000000001'
      and report_date = '2026-09-12'
    order by version desc
    limit 1
  ),
  (select report_id from pg_temp.rpt),
  'supersedes_report_id points at previous report'
);

select is(
  (
    select generated_data from public.report
    where project_id = '20000000-0000-4000-8000-000000000001'
      and report_date = '2026-09-12'
    order by version desc
    limit 1
  ),
  '{"n":2}'::jsonb,
  'generated_data keeps caller snapshot'
);

select is(
  (
    select generated_data from public.report
    where report_id = (select report_id from pg_temp.rpt)
  ),
  '{"n":1}'::jsonb,
  'previous generated_data unchanged'
);

select throws_ok(
  $$ select public.generate_report(
       '20000000-0000-4000-8000-000000000001',
       '2026-09-12',
       'MOVE_IN',
       'WEEKLY',
       '{}'::jsonb,
       'a8000000-0000-4000-8000-000000000002'
     ) $$,
  '23514'
);

-- transfer_contract_holder invariance (M10, unmodified)
select lives_ok(
  $$ select public.create_contract(
       '20000000-0000-4000-8000-000000000001',
       '5c000000-0000-4000-8000-0000000000a1',
       '7c000000-0000-4000-8000-000000000001'
     ) $$,
  'create_contract for transfer fixture'
);

create temporary table pg_temp.old_ct as
select contract_id, customer_id, contract_status, unit_id
from public.contract
where unit_id = '7c000000-0000-4000-8000-000000000001'
  and contract_status = 'ACTIVE';

select lives_ok(
  $$ select public.transfer_contract_holder(
       '20000000-0000-4000-8000-000000000001',
       (select contract_id from pg_temp.old_ct),
       '5c000000-0000-4000-8000-0000000000f1'
     ) $$,
  'transfer_contract_holder executes'
);

select isnt_empty(
  $$ select contract_id from public.contract
     where contract_id = (select contract_id from pg_temp.old_ct) $$,
  'old contract row still exists'
);

select is(
  (
    select customer_id from public.contract
    where contract_id = (select contract_id from pg_temp.old_ct)
  ),
  (select customer_id from pg_temp.old_ct),
  'old contract customer_id unchanged'
);

select is(
  (
    select contract_status::text from public.contract
    where contract_id = (select contract_id from pg_temp.old_ct)
  ),
  'CANCELLED',
  'old contract status is CANCELLED'
);

select is(
  (
    select cancellation_reason from public.contract
    where contract_id = (select contract_id from pg_temp.old_ct)
  ),
  'HOLDER_CHANGED',
  'old cancellation_reason is HOLDER_CHANGED'
);

select isnt(
  (
    select contract_id from public.contract
    where unit_id = (select unit_id from pg_temp.old_ct)
      and contract_status = 'ACTIVE'
  ),
  (select contract_id from pg_temp.old_ct),
  'new contract_id differs from old'
);

select is(
  (
    select customer_id from public.contract
    where unit_id = (select unit_id from pg_temp.old_ct)
      and contract_status = 'ACTIVE'
  ),
  '5c000000-0000-4000-8000-0000000000f1'::uuid,
  'new contract customer is the transfer target'
);

select is(
  (
    select previous_contract_id from public.contract
    where unit_id = (select unit_id from pg_temp.old_ct)
      and contract_status = 'ACTIVE'
  ),
  (select contract_id from pg_temp.old_ct),
  'new previous_contract_id points at old contract'
);

select is(
  (
    select count(*)::integer from public.unit_occupancy_status
    where unit_id = (select unit_id from pg_temp.old_ct)
  ),
  1,
  'occupancy row for the unit is preserved (exactly 1)'
);

select isnt_empty(
  $$ select occupancy_status_id from public.unit_occupancy_status
     where contract_id = (
       select contract_id from public.contract
       where unit_id = (select unit_id from pg_temp.old_ct)
         and contract_status = 'ACTIVE'
     ) $$,
  'new contract has occupancy row'
);

reset role;

select * from finish();
rollback;
