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
  ('7e000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '841', '101'),
  ('7e000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '841', '102'),
  ('7e000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', '841', '103'),
  ('7e000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', '841', '104'),
  ('7e000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000001', '841', '105');

insert into public.customer (
  id, project_id, name, phone, phone_normalized, assigned_counselor_id
) values
  (
    '5e000000-0000-4000-8000-0000000000a1',
    '20000000-0000-4000-8000-000000000001',
    'M10C Customer A',
    '01096000001',
    '01096000001',
    '40000000-0000-4000-8000-00000000000a'
  ),
  (
    '5e000000-0000-4000-8000-0000000000f1',
    '20000000-0000-4000-8000-000000000001',
    'M10C Customer F',
    '01096000002',
    '01096000002',
    '40000000-0000-4000-8000-00000000000f'
  ),
  (
    '5e000000-0000-4000-8000-0000000000a2',
    '20000000-0000-4000-8000-000000000001',
    'M10C Customer A2',
    '01096000003',
    '01096000003',
    '40000000-0000-4000-8000-00000000000a'
  );

set local role authenticated;
select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c1');

select lives_ok(
  $$ select public.upsert_customer_unit_interest(
       '20000000-0000-4000-8000-000000000001',
       '5e000000-0000-4000-8000-0000000000a1',
       '7e000000-0000-4000-8000-000000000001',
       'HIGH'
     ) $$,
  'seed interest for unit 001'
);

select lives_ok(
  $$ select public.create_contract(
       '20000000-0000-4000-8000-000000000001',
       '5e000000-0000-4000-8000-0000000000a1',
       '7e000000-0000-4000-8000-000000000001'
     ) $$,
  'create_contract with existing interest'
);

select is(
  (
    select current_status::text from public.customer_unit_interest
    where customer_id = '5e000000-0000-4000-8000-0000000000a1'
      and unit_id = '7e000000-0000-4000-8000-000000000001'
  ),
  'CONTRACTED',
  'existing interest becomes CONTRACTED'
);

select is(
  (
    select count(*)::integer from public.funnel_event
    where customer_id = '5e000000-0000-4000-8000-0000000000a1'
      and event_type = 'CONTRACT'
  ),
  1,
  'CONTRACT funnel event appended once'
);

select ok(
  (
    select metadata ? 'contract_id' and metadata ? 'unit_id'
    from public.funnel_event
    where customer_id = '5e000000-0000-4000-8000-0000000000a1'
      and event_type = 'CONTRACT'
  ),
  'funnel metadata contains contract_id and unit_id'
);

select is(
  (
    select (metadata ->> 'unit_id')::uuid from public.funnel_event
    where customer_id = '5e000000-0000-4000-8000-0000000000a1'
      and event_type = 'CONTRACT'
  ),
  '7e000000-0000-4000-8000-000000000001'::uuid,
  'funnel metadata unit_id matches contract unit'
);

select isnt_empty(
  $$ select occupancy_status_id from public.unit_occupancy_status
     where unit_id = '7e000000-0000-4000-8000-000000000001' $$,
  'create_contract inserts occupancy'
);

select is(
  (
    select count(*)::integer from public.customer_unit_interest
    where customer_id = '5e000000-0000-4000-8000-0000000000f1'
      and unit_id = '7e000000-0000-4000-8000-000000000002'
  ),
  0,
  'no-interest fixture has no CUI row'
);

select lives_ok(
  $$ select public.create_contract(
       '20000000-0000-4000-8000-000000000001',
       '5e000000-0000-4000-8000-0000000000f1',
       '7e000000-0000-4000-8000-000000000002'
     ) $$,
  'create_contract without interest succeeds'
);

select is(
  (
    select count(*)::integer from public.customer_unit_interest
    where customer_id = '5e000000-0000-4000-8000-0000000000f1'
      and unit_id = '7e000000-0000-4000-8000-000000000002'
  ),
  0,
  'create_contract does not invent interest rows'
);

select throws_ok(
  $$ select public.create_contract(
       '20000000-0000-4000-8000-000000000001',
       '5e000000-0000-4000-8000-0000000000a1',
       '7e000000-0000-4000-8000-000000000001'
     ) $$,
  '23505'
);

-- Later-step occupancy unique failure rolls back contract, interest, funnel.
-- Uses existing UNIQUE(project_id, unit_id); no dummy trigger.
select lives_ok(
  $$ select public.create_contract(
       '20000000-0000-4000-8000-000000000001',
       '5e000000-0000-4000-8000-0000000000a1',
       '7e000000-0000-4000-8000-000000000004'
     ) $$,
  'blocker source contract'
);

select lives_ok(
  $$ select public.cancel_contract(
       '20000000-0000-4000-8000-000000000001',
       (select contract_id from public.contract
        where unit_id = '7e000000-0000-4000-8000-000000000004'
          and contract_status = 'ACTIVE'),
       'occupancy blocker setup'
     ) $$,
  'cancel blocker source'
);

reset role;

insert into public.unit_occupancy_status (
  project_id, unit_id, contract_id, updated_by
)
select
  project_id,
  unit_id,
  contract_id,
  '40000000-0000-4000-8000-0000000000c1'
from public.contract
where unit_id = '7e000000-0000-4000-8000-000000000004'
  and contract_status = 'CANCELLED';

set local role authenticated;
select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c1');

select lives_ok(
  $$ select public.upsert_customer_unit_interest(
       '20000000-0000-4000-8000-000000000001',
       '5e000000-0000-4000-8000-0000000000a2',
       '7e000000-0000-4000-8000-000000000004',
       'MID'
     ) $$,
  'interest for occupancy-collision customer'
);

select is(
  (
    select current_status::text from public.customer_unit_interest
    where customer_id = '5e000000-0000-4000-8000-0000000000a2'
      and unit_id = '7e000000-0000-4000-8000-000000000004'
  ),
  'ACTIVE',
  'interest starts ACTIVE before failed create'
);

select throws_ok(
  $$ select public.create_contract(
       '20000000-0000-4000-8000-000000000001',
       '5e000000-0000-4000-8000-0000000000a2',
       '7e000000-0000-4000-8000-000000000004'
     ) $$,
  '23505'
);

select is(
  (
    select count(*)::integer from public.contract
    where customer_id = '5e000000-0000-4000-8000-0000000000a2'
      and unit_id = '7e000000-0000-4000-8000-000000000004'
  ),
  0,
  'failed occupancy insert rolls back contract'
);

select is(
  (
    select current_status::text from public.customer_unit_interest
    where customer_id = '5e000000-0000-4000-8000-0000000000a2'
      and unit_id = '7e000000-0000-4000-8000-000000000004'
  ),
  'ACTIVE',
  'failed occupancy insert rolls back interest CONTRACTED'
);

select is(
  (
    select count(*)::integer from public.funnel_event
    where customer_id = '5e000000-0000-4000-8000-0000000000a2'
      and event_type = 'CONTRACT'
  ),
  0,
  'failed occupancy insert rolls back funnel'
);

-- cancel → recontract
select lives_ok(
  $$ select public.create_contract(
       '20000000-0000-4000-8000-000000000001',
       '5e000000-0000-4000-8000-0000000000a1',
       '7e000000-0000-4000-8000-000000000003'
     ) $$,
  'contract A on unit 003'
);

select lives_ok(
  $$ select public.update_unit_occupancy_status(
       '20000000-0000-4000-8000-000000000001',
       '7e000000-0000-4000-8000-000000000003',
       (select contract_id from public.contract
        where unit_id = '7e000000-0000-4000-8000-000000000003'
          and contract_status = 'ACTIVE'),
       'SELF_MOVE_IN'
     ) $$,
  'occupancy history on contract A'
);

create temporary table m10c_hist as
select
  count(*)::integer as n,
  (array_agg(contract_id))[1] as contract_id
from public.contract_status_history
where unit_id = '7e000000-0000-4000-8000-000000000003';

select isnt(
  (select n from m10c_hist),
  0,
  'history exists before cancel'
);

select lives_ok(
  $$ select public.cancel_contract(
       '20000000-0000-4000-8000-000000000001',
       (select contract_id from public.contract
        where unit_id = '7e000000-0000-4000-8000-000000000003'
          and contract_status = 'ACTIVE'),
       '일반 해지'
     ) $$,
  'cancel_contract A'
);

select is(
  (
    select contract_status::text from public.contract
    where unit_id = '7e000000-0000-4000-8000-000000000003'
    order by contracted_at
    limit 1
  ),
  'CANCELLED',
  'contract A CANCELLED'
);

select is(
  (
    select count(*)::integer from public.unit_occupancy_status
    where unit_id = '7e000000-0000-4000-8000-000000000003'
  ),
  0,
  'cancel deletes current occupancy'
);

select is(
  (
    select count(*)::integer from public.contract_status_history
    where contract_id = (select contract_id from m10c_hist)
  ),
  (select n from m10c_hist),
  'cancel does not delete or rewrite history'
);

select lives_ok(
  $$ select public.create_contract(
       '20000000-0000-4000-8000-000000000001',
       '5e000000-0000-4000-8000-0000000000f1',
       '7e000000-0000-4000-8000-000000000003'
     ) $$,
  'recontract customer F on unit 003'
);

select is(
  (
    select count(*)::integer from public.contract
    where unit_id = '7e000000-0000-4000-8000-000000000003'
      and contract_status = 'ACTIVE'
  ),
  1,
  'unit has exactly one ACTIVE contract after recontract'
);

select is(
  (
    select customer_id from public.contract
    where unit_id = '7e000000-0000-4000-8000-000000000003'
      and contract_status = 'ACTIVE'
  ),
  '5e000000-0000-4000-8000-0000000000f1'::uuid,
  'new ACTIVE contract is customer F'
);

select is(
  (
    select count(*)::integer from public.unit_occupancy_status
    where unit_id = '7e000000-0000-4000-8000-000000000003'
      and contract_id = (
        select contract_id from public.contract
        where unit_id = '7e000000-0000-4000-8000-000000000003'
          and contract_status = 'ACTIVE'
      )
  ),
  1,
  'new occupancy row for recontract'
);

-- cancel rollback via pre-mutation constraint (no dummy trigger)
select lives_ok(
  $$ select public.create_contract(
       '20000000-0000-4000-8000-000000000001',
       '5e000000-0000-4000-8000-0000000000a1',
       '7e000000-0000-4000-8000-000000000005'
     ) $$,
  'contract for cancel rollback'
);

select throws_ok(
  $$ select public.cancel_contract(
       '20000000-0000-4000-8000-000000000001',
       (select contract_id from public.contract
        where unit_id = '7e000000-0000-4000-8000-000000000005'
          and contract_status = 'ACTIVE'),
       ''
     ) $$,
  '23514'
);

select is(
  (
    select contract_status::text from public.contract
    where unit_id = '7e000000-0000-4000-8000-000000000005'
      and contract_status = 'ACTIVE'
  ),
  'ACTIVE',
  'failed cancel keeps contract ACTIVE'
);

select isnt_empty(
  $$ select occupancy_status_id from public.unit_occupancy_status
     where unit_id = '7e000000-0000-4000-8000-000000000005' $$,
  'failed cancel keeps occupancy'
);

-- generate_report authorization and versioning
select pg_temp.impersonate('30000000-0000-4000-8000-00000000000a');
select throws_ok(
  $$ select public.generate_report(
       '20000000-0000-4000-8000-000000000001',
       '2026-09-20',
       'MOVE_IN',
       'DAILY',
       '{"contacts":1}'::jsonb
     ) $$,
  '42501'
);

select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c2');
select throws_ok(
  $$ select public.generate_report(
       '20000000-0000-4000-8000-000000000001',
       '2026-09-20',
       'MOVE_IN',
       'DAILY',
       '{"contacts":1}'::jsonb
     ) $$,
  '42501'
);

select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c1');
select lives_ok(
  $$ select public.generate_report(
       '20000000-0000-4000-8000-000000000001',
       '2026-09-20',
       'MOVE_IN',
       'DAILY',
       '{"contacts":1}'::jsonb
     ) $$,
  'PROJECT_ADMIN generate_report'
);

select is(
  (
    select version from public.report
    where project_id = '20000000-0000-4000-8000-000000000001'
      and report_date = '2026-09-20'
  ),
  1,
  'first report version is 1'
);

create temporary table m10c_rpt as
select report_id, generated_data, version
from public.report
where project_id = '20000000-0000-4000-8000-000000000001'
  and report_date = '2026-09-20';

select lives_ok(
  $$ select public.generate_report(
       '20000000-0000-4000-8000-000000000001',
       '2026-09-20',
       'MOVE_IN',
       'DAILY',
       '{"contacts":9}'::jsonb
     ) $$,
  'regenerate report'
);

select is(
  (
    select version from public.report
    where project_id = '20000000-0000-4000-8000-000000000001'
      and report_date = '2026-09-20'
    order by version desc
    limit 1
  ),
  2,
  'regenerated version is 2'
);

select is(
  (
    select generated_data from public.report
    where report_id = (select report_id from m10c_rpt)
  ),
  '{"contacts":1}'::jsonb,
  'old report snapshot unchanged'
);

select is(
  (
    select supersedes_report_id from public.report
    where project_id = '20000000-0000-4000-8000-000000000001'
      and report_date = '2026-09-20'
    order by version desc
    limit 1
  ),
  (select report_id from m10c_rpt),
  'supersedes_report_id points at previous report'
);

select is(
  (
    select generated_data from public.report
    where project_id = '20000000-0000-4000-8000-000000000001'
      and report_date = '2026-09-20'
    order by version desc
    limit 1
  ),
  '{"contacts":9}'::jsonb,
  'new report stores caller snapshot'
);

reset role;
select * from finish();
rollback;
