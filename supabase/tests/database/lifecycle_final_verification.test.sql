begin;

select no_plan();

-- M11 final verification. No production SQL changes.
-- Actor map (plus existing seed org1/org2):
-- Org A = 1000…0001  A1 = 2000…0001  A2 = 2100…00a2
-- Org B = 1000…0002  B1 = 2000…0002
-- A1 COUNSELOR A1=…00a  A1 COUNSELOR F=…00f  A1 ADMIN=…0c1
-- A2 ADMIN=…0c3  A2 COUNSELOR=…0d1
-- B1 COUNSELOR=…00b  B1 ADMIN=…0c2

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

insert into auth.users (id) values
  ('31000000-0000-4000-8000-0000000000c3'),
  ('31000000-0000-4000-8000-0000000000d1');

insert into public.project (id, organization_id, name, status)
values (
  '21000000-0000-4000-8000-0000000000a2',
  '10000000-0000-4000-8000-000000000001',
  'Project A2 M11',
  'ACTIVE'
);

insert into public.project_member (id, project_id, user_id, role, active)
values
  (
    '41000000-0000-4000-8000-0000000000c3',
    '21000000-0000-4000-8000-0000000000a2',
    '31000000-0000-4000-8000-0000000000c3',
    'PROJECT_ADMIN',
    true
  ),
  (
    '41000000-0000-4000-8000-0000000000d1',
    '21000000-0000-4000-8000-0000000000a2',
    '31000000-0000-4000-8000-0000000000d1',
    'COUNSELOR',
    true
  );

insert into public.project_unit (unit_id, project_id, building_no, unit_no)
values
  ('7f000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '851', '101'),
  ('7f000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '851', '102'),
  ('7f000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', '851', '103'),
  ('7f000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', '851', '104'),
  ('7f000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000001', '851', '105'),
  ('7f000000-0000-4000-8000-0000000000a2', '21000000-0000-4000-8000-0000000000a2', '851', '101'),
  ('7f000000-0000-4000-8000-0000000000b1', '20000000-0000-4000-8000-000000000002', '851', '101');

insert into public.customer (
  id, project_id, name, phone, phone_normalized, assigned_counselor_id
) values
  (
    '5f000000-0000-4000-8000-0000000000a1',
    '20000000-0000-4000-8000-000000000001',
    'M11 A1',
    '01097000001',
    '01097000001',
    '40000000-0000-4000-8000-00000000000a'
  ),
  (
    '5f000000-0000-4000-8000-0000000000f1',
    '20000000-0000-4000-8000-000000000001',
    'M11 A1 F',
    '01097000002',
    '01097000002',
    '40000000-0000-4000-8000-00000000000f'
  ),
  (
    '5f000000-0000-4000-8000-0000000000e1',
    '20000000-0000-4000-8000-000000000001',
    'M11 A1 E',
    '01097000005',
    '01097000005',
    '40000000-0000-4000-8000-00000000000a'
  ),
  (
    '5f000000-0000-4000-8000-0000000000a2',
    '21000000-0000-4000-8000-0000000000a2',
    'M11 A2',
    '01097000003',
    '01097000003',
    '41000000-0000-4000-8000-0000000000d1'
  ),
  (
    '5f000000-0000-4000-8000-0000000000b1',
    '20000000-0000-4000-8000-000000000002',
    'M11 B1',
    '01097000004',
    '01097000004',
    '40000000-0000-4000-8000-00000000000b'
  );

insert into public.report_template (
  template_id, organization_id, project_id, report_phase, report_type,
  name, template_definition, mapping_definition, source_type
) values
  (
    'a9000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    null,
    'MOVE_IN',
    'WEEKLY',
    'M11 OrgA shared',
    '{}'::jsonb,
    '{}'::jsonb,
    'MANUAL'
  ),
  (
    'a9000000-0000-4000-8000-0000000000a1',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'MOVE_IN',
    'WEEKLY',
    'M11 A1 dedicated',
    '{}'::jsonb,
    '{}'::jsonb,
    'MANUAL'
  ),
  (
    'a9000000-0000-4000-8000-0000000000a2',
    '10000000-0000-4000-8000-000000000001',
    '21000000-0000-4000-8000-0000000000a2',
    'MOVE_IN',
    'WEEKLY',
    'M11 A2 dedicated',
    '{}'::jsonb,
    '{}'::jsonb,
    'MANUAL'
  ),
  (
    'a9000000-0000-4000-8000-0000000000b1',
    '10000000-0000-4000-8000-000000000002',
    null,
    'MOVE_IN',
    'WEEKLY',
    'M11 OrgB shared',
    '{}'::jsonb,
    '{}'::jsonb,
    'MANUAL'
  );

-- Catalog: RLS, broad policies, SECURITY DEFINER, ACL, CASCADE, triggers
select is(
  (
    select count(*)::integer
    from unnest(array[
      'project_unit','customer_unit_interest','subscription','contract',
      'unit_occupancy_status','contract_status_history','market_data',
      'report_template','report','cs_ticket','entry_pool','contact_schedule',
      'funnel_event','community_notice','consultation'
    ]) as t(rel)
    join pg_class c on c.relname = t.rel
    join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
    where c.relrowsecurity is not true
  ),
  0,
  'required tables have RLS enabled'
);

select is_empty(
  $$
    select n.nspname || '.' || c.relname || '.' || p.polname
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and (
        pg_get_expr(p.polqual, p.polrelid) in ('true', '(true)')
        or pg_get_expr(p.polwithcheck, p.polrelid) in ('true', '(true)')
      )
  $$,
  'no USING(true) or WITH CHECK(true) policies'
);

select is(
  (
    select count(*)::integer from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'create_contract','cancel_contract','transfer_contract_holder',
        'update_unit_occupancy_status','generate_report','create_cs_ticket',
        'update_cs_ticket','promote_entry_to_customer',
        'upsert_customer_unit_interest','apply_move_in_import_row'
      )
      and (
        p.prosecdef is not true
        or not exists (
          select 1 from unnest(coalesce(p.proconfig, array[]::text[])) cfg
          where cfg in ('search_path=""', 'search_path=''''')
        )
      )
  ),
  0,
  'lifecycle RPCs are SECURITY DEFINER with empty search_path'
);

select ok(
  (
    select bool_and(not has_function_privilege('public', p.oid, 'EXECUTE'))
      and bool_and(not has_function_privilege('anon', p.oid, 'EXECUTE'))
      and bool_and(has_function_privilege('authenticated', p.oid, 'EXECUTE'))
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'create_contract','cancel_contract','transfer_contract_holder',
        'update_unit_occupancy_status','generate_report','create_cs_ticket',
        'update_cs_ticket','promote_entry_to_customer',
        'upsert_customer_unit_interest','apply_move_in_import_row'
      )
  ),
  'lifecycle RPCs: no PUBLIC/anon EXECUTE, authenticated EXECUTE'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'private.write_rpc_actor(uuid)',
    'EXECUTE'
  ),
  'authenticated cannot execute write_rpc_actor'
);

select is(
  (
    select count(*)::integer
    from pg_constraint
    where connamespace = 'public'::regnamespace
      and contype = 'f'
      and confdeltype = 'c'
  ),
  0,
  'no ON DELETE CASCADE foreign keys in public'
);

select is_empty(
  $$
    select event_object_table || '.' || trigger_name
    from information_schema.triggers
    where trigger_schema = 'public'
      and action_statement not like '%private.set_updated_at%'
  $$,
  'lifecycle triggers are only private.set_updated_at'
);

select is(
  (
    select count(*)::integer from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('report','market_data','contract_status_history')
      and not t.tgisinternal
  ),
  0,
  'no user triggers on report, market_data, or history'
);

set local role authenticated;
select pg_temp.impersonate('30000000-0000-4000-8000-00000000000a');

-- 4. project_unit IDOR
select isnt_empty(
  $$ select unit_id from public.project_unit
     where unit_id = '7f000000-0000-4000-8000-000000000001' $$,
  'A1 member selects A1 unit'
);
select is_empty(
  $$ select unit_id from public.project_unit
     where unit_id = '7f000000-0000-4000-8000-0000000000a2' $$,
  'A1 member cannot select A2 unit'
);
select is_empty(
  $$ select unit_id from public.project_unit
     where unit_id = '7f000000-0000-4000-8000-0000000000b1' $$,
  'A1 member cannot select B1 unit'
);
select throws_ok(
  $$ insert into public.project_unit (project_id, building_no, unit_no)
     values ('20000000-0000-4000-8000-000000000001', '851', '201') $$,
  '42501'
);

select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c1');
select lives_ok(
  $$ insert into public.project_unit (project_id, building_no, unit_no)
     values ('20000000-0000-4000-8000-000000000001', '851', '202') $$,
  'PROJECT_ADMIN A inserts A1 unit'
);
select throws_ok(
  $$ insert into public.project_unit (project_id, building_no, unit_no)
     values ('21000000-0000-4000-8000-0000000000a2', '851', '202') $$,
  '42501'
);
select throws_ok(
  $$ delete from public.project_unit
     where unit_id = '7f000000-0000-4000-8000-000000000001' $$,
  '42501'
);

-- 5. CUI IDOR / upsert
select pg_temp.impersonate('30000000-0000-4000-8000-00000000000a');
select lives_ok(
  $$ select public.upsert_customer_unit_interest(
       '20000000-0000-4000-8000-000000000001',
       '5f000000-0000-4000-8000-0000000000a1',
       '7f000000-0000-4000-8000-000000000001',
       'HIGH'
     ) $$,
  'COUNSELOR A1 upserts assigned customer'
);
select throws_ok(
  $$ select public.upsert_customer_unit_interest(
       '20000000-0000-4000-8000-000000000001',
       '5f000000-0000-4000-8000-0000000000f1',
       '7f000000-0000-4000-8000-000000000001',
       'HIGH'
     ) $$,
  '42501'
);
select throws_ok(
  $$ select public.upsert_customer_unit_interest(
       '20000000-0000-4000-8000-000000000001',
       '5f000000-0000-4000-8000-0000000000a1',
       '7f000000-0000-4000-8000-0000000000a2'
     ) $$,
  '23514'
);
select throws_ok(
  $$ select public.upsert_customer_unit_interest(
       '20000000-0000-4000-8000-000000000001',
       '5f000000-0000-4000-8000-0000000000a1',
       '7f000000-0000-4000-8000-0000000000b1'
     ) $$,
  '23514'
);

select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c1');
select lives_ok(
  $$ select public.upsert_customer_unit_interest(
       '20000000-0000-4000-8000-000000000001',
       '5f000000-0000-4000-8000-0000000000f1',
       '7f000000-0000-4000-8000-000000000002',
       'MID'
     ) $$,
  'PROJECT_ADMIN upserts any A1 customer'
);

create temporary table m11_cui as
select interest_id, first_interested_at, last_interested_at
from public.customer_unit_interest
where customer_id = '5f000000-0000-4000-8000-0000000000a1'
  and unit_id = '7f000000-0000-4000-8000-000000000001';

select lives_ok(
  $$ select public.upsert_customer_unit_interest(
       '20000000-0000-4000-8000-000000000001',
       '5f000000-0000-4000-8000-0000000000a1',
       '7f000000-0000-4000-8000-000000000001',
       'LOW'
     ) $$,
  'repeat upsert'
);

select is(
  (
    select count(*)::integer from public.customer_unit_interest
    where customer_id = '5f000000-0000-4000-8000-0000000000a1'
      and unit_id = '7f000000-0000-4000-8000-000000000001'
  ),
  1,
  'repeat upsert does not add rows'
);
select is(
  (
    select first_interested_at from public.customer_unit_interest
    where interest_id = (select interest_id from m11_cui)
  ),
  (select first_interested_at from m11_cui),
  'first_interested_at is immutable'
);
select isnt(
  (
    select last_interested_at from public.customer_unit_interest
    where interest_id = (select interest_id from m11_cui)
  ),
  (select last_interested_at from m11_cui),
  'last_interested_at advances on upsert'
);
select throws_ok(
  $$ delete from public.customer_unit_interest
     where customer_id = '5f000000-0000-4000-8000-0000000000a1' $$,
  '42501'
);

-- 6. ENTRY_POOL / promote
select lives_ok(
  $$ insert into public.entry_pool (entry_id, project_id, phone_normalized, acquisition_channel)
     values (
       'e3000000-0000-4000-8000-000000000001',
       '20000000-0000-4000-8000-000000000001',
       '01097100001',
       'WEB'
     ) $$,
  'A1 entry insert'
);
select throws_ok(
  $$ insert into public.entry_pool (project_id, phone_normalized)
     values ('20000000-0000-4000-8000-000000000001', '01097100001') $$,
  '23505'
);

reset role;
insert into public.entry_pool (entry_id, project_id, phone_normalized, acquisition_channel)
values
  (
    'e3000000-0000-4000-8000-0000000000a2',
    '21000000-0000-4000-8000-0000000000a2',
    '01097100001',
    'WEB'
  ),
  (
    'e3000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    '01097000001',
    'ADS'
  );

set local role authenticated;
select pg_temp.impersonate('30000000-0000-4000-8000-00000000000a');
select lives_ok(
  $$ select public.promote_entry_to_customer(
       '20000000-0000-4000-8000-000000000001',
       'e3000000-0000-4000-8000-000000000001'
     ) $$,
  'COUNSELOR promotes same-project entry'
);
select throws_ok(
  $$ select public.promote_entry_to_customer(
       '20000000-0000-4000-8000-000000000001',
       'e3000000-0000-4000-8000-0000000000a2'
     ) $$,
  '23514'
);

select is(
  (
    select count(*)::integer from public.customer
    where project_id = '20000000-0000-4000-8000-000000000001'
      and phone_normalized = '01097000001'
  ),
  1,
  'existing phone is unique before reuse promote'
);

select lives_ok(
  $$ select public.promote_entry_to_customer(
       '20000000-0000-4000-8000-000000000001',
       'e3000000-0000-4000-8000-000000000002'
     ) $$,
  'promote reuses existing customer phone'
);

select is(
  (
    select count(*)::integer from public.customer
    where project_id = '20000000-0000-4000-8000-000000000001'
      and phone_normalized = '01097000001'
  ),
  1,
  'reuse promote does not duplicate customer'
);
select is(
  (
    select status from public.entry_pool
    where entry_id = 'e3000000-0000-4000-8000-000000000002'
  ),
  'PROMOTED',
  'entry status PROMOTED'
);
select isnt_empty(
  $$ select entry_id from public.entry_pool
     where entry_id = 'e3000000-0000-4000-8000-000000000002' $$,
  'entry row is not hard-deleted'
);
select is(
  (
    select count(*)::integer from public.funnel_event
    where event_type = 'ENTRY_PROMOTED'
      and metadata ->> 'entry_id' = 'e3000000-0000-4000-8000-000000000002'
  ),
  1,
  'ENTRY_PROMOTED funnel once'
);

select lives_ok(
  $$ select public.promote_entry_to_customer(
       '20000000-0000-4000-8000-000000000001',
       'e3000000-0000-4000-8000-000000000002'
     ) $$,
  're-promote already PROMOTED'
);
select is(
  (
    select count(*)::integer from public.funnel_event
    where event_type = 'ENTRY_PROMOTED'
      and metadata ->> 'entry_id' = 'e3000000-0000-4000-8000-000000000002'
  ),
  1,
  're-promote does not duplicate funnel'
);

-- 7. subscription tenant
select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c1');
select lives_ok(
  $$ insert into public.subscription (subscription_id, project_id, customer_id, subscription_round)
     values (
       '8f000000-0000-4000-8000-0000000000a1',
       '20000000-0000-4000-8000-000000000001',
       '5f000000-0000-4000-8000-0000000000a1',
       '1'
     ) $$,
  'A1 customer subscription'
);
select throws_ok(
  $$ insert into public.subscription (project_id, customer_id, subscription_round)
     values (
       '20000000-0000-4000-8000-000000000001',
       '5f000000-0000-4000-8000-0000000000a2',
       '1'
     ) $$,
  '23503'
);
select throws_ok(
  $$ insert into public.subscription (project_id, customer_id, subscription_round)
     values (
       '20000000-0000-4000-8000-000000000001',
       '5f000000-0000-4000-8000-0000000000b1',
       '1'
     ) $$,
  '23503'
);
select throws_ok(
  $$ insert into public.subscription (project_id, customer_id, subscription_round)
     values (
       '20000000-0000-4000-8000-000000000001',
       '5f000000-0000-4000-8000-00000000ffff',
       '1'
     ) $$,
  '23503'
);
select throws_ok($$ delete from public.subscription $$, '42501');

reset role;
insert into public.subscription (subscription_id, project_id, customer_id, subscription_round)
values (
  '8f000000-0000-4000-8000-0000000000f1',
  '20000000-0000-4000-8000-000000000001',
  '5f000000-0000-4000-8000-0000000000f1',
  '1'
);

set local role authenticated;
select pg_temp.impersonate('30000000-0000-4000-8000-00000000000a');

-- 8. create_contract authorization
select throws_ok(
  $$ select public.create_contract(
       '20000000-0000-4000-8000-000000000001',
       '5f000000-0000-4000-8000-0000000000a1',
       '7f000000-0000-4000-8000-000000000001'
     ) $$,
  '42501'
);

select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c1');
select lives_ok(
  $$ select public.create_contract(
       '20000000-0000-4000-8000-000000000001',
       '5f000000-0000-4000-8000-0000000000a1',
       '7f000000-0000-4000-8000-000000000001',
       '8f000000-0000-4000-8000-0000000000a1'
     ) $$,
  'PROJECT_ADMIN creates A1 contract'
);
select throws_ok(
  $$ select public.create_contract(
       '20000000-0000-4000-8000-000000000001',
       '5f000000-0000-4000-8000-0000000000a2',
       '7f000000-0000-4000-8000-000000000002'
     ) $$,
  '23514'
);
select throws_ok(
  $$ select public.create_contract(
       '20000000-0000-4000-8000-000000000001',
       '5f000000-0000-4000-8000-0000000000a1',
       '7f000000-0000-4000-8000-0000000000b1'
     ) $$,
  '23514'
);
select throws_ok(
  $$ select public.create_contract(
       '20000000-0000-4000-8000-000000000001',
       '5f000000-0000-4000-8000-0000000000a1',
       '7f000000-0000-4000-8000-000000000002',
       '8f000000-0000-4000-8000-0000000000f1'
     ) $$,
  '23514'
);

-- 9. ACTIVE unique / same building string / cancel then recontract
select throws_ok(
  $$ select public.create_contract(
       '20000000-0000-4000-8000-000000000001',
       '5f000000-0000-4000-8000-0000000000f1',
       '7f000000-0000-4000-8000-000000000001'
     ) $$,
  '23505'
);

select pg_temp.impersonate('31000000-0000-4000-8000-0000000000c3');
select lives_ok(
  $$ select public.create_contract(
       '21000000-0000-4000-8000-0000000000a2',
       '5f000000-0000-4000-8000-0000000000a2',
       '7f000000-0000-4000-8000-0000000000a2'
     ) $$,
  'other project same building/unit string can be ACTIVE'
);

select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c1');

-- 10. create_contract atomicity (happy path already on unit 001)
select is(
  (
    select current_status::text from public.customer_unit_interest
    where customer_id = '5f000000-0000-4000-8000-0000000000a1'
      and unit_id = '7f000000-0000-4000-8000-000000000001'
  ),
  'CONTRACTED',
  'interest CONTRACTED after create_contract'
);
select isnt_empty(
  $$ select occupancy_status_id from public.unit_occupancy_status
     where unit_id = '7f000000-0000-4000-8000-000000000001' $$,
  'occupancy created'
);
select is(
  (
    select count(*)::integer from public.funnel_event
    where customer_id = '5f000000-0000-4000-8000-0000000000a1'
      and event_type = 'CONTRACT'
  ),
  1,
  'CONTRACT funnel appended'
);

select lives_ok(
  $$ select public.create_contract(
       '20000000-0000-4000-8000-000000000001',
       '5f000000-0000-4000-8000-0000000000f1',
       '7f000000-0000-4000-8000-000000000004'
     ) $$,
  'blocker source contract'
);
select lives_ok(
  $$ select public.cancel_contract(
       '20000000-0000-4000-8000-000000000001',
       (select contract_id from public.contract
        where unit_id = '7f000000-0000-4000-8000-000000000004'
          and contract_status = 'ACTIVE'),
       'blocker'
     ) $$,
  'cancel blocker source'
);

reset role;
select lives_ok(
  $$ insert into public.unit_occupancy_status (
       project_id, unit_id, contract_id, updated_by
     )
     select project_id, unit_id, contract_id,
            '40000000-0000-4000-8000-0000000000c1'
     from public.contract
     where unit_id = '7f000000-0000-4000-8000-000000000004'
       and contract_status = 'CANCELLED' $$,
  'rebind occupancy onto cancelled contract'
);
select is(
  (
    select count(*)::integer from public.unit_occupancy_status
    where unit_id = '7f000000-0000-4000-8000-000000000004'
  ),
  1,
  'occupancy blocker exists before failed create'
);

set local role authenticated;
select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c1');
select lives_ok(
  $$ select public.upsert_customer_unit_interest(
       '20000000-0000-4000-8000-000000000001',
       '5f000000-0000-4000-8000-0000000000e1',
       '7f000000-0000-4000-8000-000000000004',
       'HIGH'
     ) $$,
  'interest for occupancy-collision create'
);
select throws_ok(
  $$ select public.create_contract(
       '20000000-0000-4000-8000-000000000001',
       '5f000000-0000-4000-8000-0000000000e1',
       '7f000000-0000-4000-8000-000000000004'
     ) $$,
  '23505'
);
select is(
  (
    select count(*)::integer from public.contract
    where customer_id = '5f000000-0000-4000-8000-0000000000e1'
      and unit_id = '7f000000-0000-4000-8000-000000000004'
  ),
  0,
  'failed create rolls back contract'
);
select is(
  (
    select current_status::text from public.customer_unit_interest
    where customer_id = '5f000000-0000-4000-8000-0000000000e1'
      and unit_id = '7f000000-0000-4000-8000-000000000004'
  ),
  'ACTIVE',
  'failed create keeps CUI ACTIVE'
);
select is(
  (
    select count(*)::integer from public.funnel_event
    where customer_id = '5f000000-0000-4000-8000-0000000000e1'
      and event_type = 'CONTRACT'
      and (metadata ->> 'unit_id') = '7f000000-0000-4000-8000-000000000004'
  ),
  0,
  'failed create rolls back funnel'
);

-- 11. cancel_contract
select lives_ok(
  $$ select public.create_contract(
       '20000000-0000-4000-8000-000000000001',
       '5f000000-0000-4000-8000-0000000000a1',
       '7f000000-0000-4000-8000-000000000003'
     ) $$,
  'contract for cancel/recontract'
);
select lives_ok(
  $$ select public.update_unit_occupancy_status(
       '20000000-0000-4000-8000-000000000001',
       '7f000000-0000-4000-8000-000000000003',
       (select contract_id from public.contract
        where unit_id = '7f000000-0000-4000-8000-000000000003'
          and contract_status = 'ACTIVE'),
       'SELF_MOVE_IN'
     ) $$,
  'history before cancel'
);

create temporary table m11_cancel as
select contract_id, customer_id, unit_id, project_id,
       (select count(*)::integer from public.contract_status_history h
        where h.contract_id = c.contract_id) as hist_n
from public.contract c
where unit_id = '7f000000-0000-4000-8000-000000000003'
  and contract_status = 'ACTIVE';

select throws_ok(
  $$ select public.cancel_contract(
       '20000000-0000-4000-8000-000000000001',
       (select contract_id from m11_cancel),
       ''
     ) $$,
  '23514'
);

select lives_ok(
  $$ select public.cancel_contract(
       '20000000-0000-4000-8000-000000000001',
       (select contract_id from m11_cancel),
       '일반 해지'
     ) $$,
  'cancel ACTIVE'
);
select throws_ok(
  $$ select public.cancel_contract(
       '20000000-0000-4000-8000-000000000001',
       (select contract_id from m11_cancel),
       'again'
     ) $$,
  '23514'
);
select is(
  (select customer_id from public.contract where contract_id = (select contract_id from m11_cancel)),
  (select customer_id from m11_cancel),
  'cancelled customer_id unchanged'
);
select is(
  (select unit_id from public.contract where contract_id = (select contract_id from m11_cancel)),
  (select unit_id from m11_cancel),
  'cancelled unit_id unchanged'
);
select is(
  (select project_id from public.contract where contract_id = (select contract_id from m11_cancel)),
  (select project_id from m11_cancel),
  'cancelled project_id unchanged'
);
select is(
  (
    select count(*)::integer from public.unit_occupancy_status
    where unit_id = '7f000000-0000-4000-8000-000000000003'
  ),
  0,
  'cancel deletes occupancy'
);
select is(
  (
    select count(*)::integer from public.contract_status_history
    where contract_id = (select contract_id from m11_cancel)
  ),
  (select hist_n from m11_cancel),
  'cancel preserves history'
);
select lives_ok(
  $$ select public.create_contract(
       '20000000-0000-4000-8000-000000000001',
       '5f000000-0000-4000-8000-0000000000f1',
       '7f000000-0000-4000-8000-000000000003'
     ) $$,
  'recontract after cancel'
);
select is(
  (
    select count(*)::integer from public.unit_occupancy_status
    where unit_id = '7f000000-0000-4000-8000-000000000003'
  ),
  1,
  'recontract occupancy is 1'
);

-- 12. transfer_contract_holder
select lives_ok(
  $$ select public.create_contract(
       '20000000-0000-4000-8000-000000000001',
       '5f000000-0000-4000-8000-0000000000a1',
       '7f000000-0000-4000-8000-000000000002'
     ) $$,
  'OLD contract for transfer'
);
select lives_ok(
  $$ select public.update_unit_occupancy_status(
       '20000000-0000-4000-8000-000000000001',
       '7f000000-0000-4000-8000-000000000002',
       (select contract_id from public.contract
        where unit_id = '7f000000-0000-4000-8000-000000000002'
          and contract_status = 'ACTIVE'),
       'JEONSE', 'LOAN_NEEDED', 'CONTACTED',
       '2026-11-01', null, null,
       '2026-09-01 00:00:00+00', '2026-09-15 00:00:00+00'
     ) $$,
  'occupancy axes before transfer'
);

create temporary table m11_xfer as
select c.contract_id as old_id, c.customer_id, c.subscription_id,
       o.occupancy_intent::text as intent,
       o.funding_status::text as funding,
       o.move_in_status::text as move,
       o.planned_move_in_date, o.balance_paid_at, o.actual_move_in_date,
       (select count(*)::integer from public.contract_status_history h
        where h.contract_id = c.contract_id) as hist_n
from public.contract c
join public.unit_occupancy_status o on o.contract_id = c.contract_id
where c.unit_id = '7f000000-0000-4000-8000-000000000002'
  and c.contract_status = 'ACTIVE';

select lives_ok(
  $$ select public.transfer_contract_holder(
       '20000000-0000-4000-8000-000000000001',
       (select old_id from m11_xfer),
       '5f000000-0000-4000-8000-0000000000f1'
     ) $$,
  'transfer A → F'
);

select is(
  (select customer_id from public.contract where contract_id = (select old_id from m11_xfer)),
  '5f000000-0000-4000-8000-0000000000a1'::uuid,
  'OLD customer_id unchanged'
);
select is(
  (select contract_status::text from public.contract where contract_id = (select old_id from m11_xfer)),
  'CANCELLED',
  'OLD CANCELLED'
);
select is(
  (select cancellation_reason from public.contract where contract_id = (select old_id from m11_xfer)),
  'HOLDER_CHANGED',
  'OLD HOLDER_CHANGED'
);
select isnt(
  (
    select contract_id from public.contract
    where unit_id = '7f000000-0000-4000-8000-000000000002'
      and contract_status = 'ACTIVE'
  ),
  (select old_id from m11_xfer),
  'NEW contract_id differs'
);
select is(
  (
    select customer_id from public.contract
    where unit_id = '7f000000-0000-4000-8000-000000000002'
      and contract_status = 'ACTIVE'
  ),
  '5f000000-0000-4000-8000-0000000000f1'::uuid,
  'NEW customer is F'
);
select is(
  (
    select previous_contract_id from public.contract
    where unit_id = '7f000000-0000-4000-8000-000000000002'
      and contract_status = 'ACTIVE'
  ),
  (select old_id from m11_xfer),
  'NEW previous_contract_id is OLD'
);
select is(
  (
    select subscription_id from public.contract
    where unit_id = '7f000000-0000-4000-8000-000000000002'
      and contract_status = 'ACTIVE'
  ),
  null,
  'NEW subscription_id is NULL'
);
select is(
  (
    select count(*)::integer from public.unit_occupancy_status
    where unit_id = '7f000000-0000-4000-8000-000000000002'
  ),
  1,
  'occupancy still 1 after transfer'
);
select is(
  (
    select occupancy_intent::text || funding_status::text || move_in_status::text
    from public.unit_occupancy_status
    where unit_id = '7f000000-0000-4000-8000-000000000002'
  ),
  (select intent || funding || move from m11_xfer),
  'occupancy 3-axis preserved'
);
select is(
  (
    select count(*)::integer from public.contract_status_history
    where contract_id = (select old_id from m11_xfer)
  ),
  (select hist_n from m11_xfer),
  'OLD history preserved'
);

select lives_ok(
  $$ select public.update_unit_occupancy_status(
       '20000000-0000-4000-8000-000000000001',
       '7f000000-0000-4000-8000-000000000002',
       (select contract_id from public.contract
        where unit_id = '7f000000-0000-4000-8000-000000000002'
          and contract_status = 'ACTIVE'),
       'SALE'
     ) $$,
  'post-transfer occupancy change'
);
select isnt_empty(
  $$ select history_id from public.contract_status_history
     where contract_id = (
       select contract_id from public.contract
       where unit_id = '7f000000-0000-4000-8000-000000000002'
         and contract_status = 'ACTIVE'
     )
       and field_changed = 'occupancy_intent'
       and new_value = 'SALE' $$,
  'new history uses NEW contract_id'
);

select lives_ok(
  $$ select public.create_contract(
       '20000000-0000-4000-8000-000000000001',
       '5f000000-0000-4000-8000-0000000000a1',
       '7f000000-0000-4000-8000-000000000005'
     ) $$,
  'contract for transfer rollback'
);
select throws_ok(
  $$ select public.transfer_contract_holder(
       '20000000-0000-4000-8000-000000000001',
       (select contract_id from public.contract
        where unit_id = '7f000000-0000-4000-8000-000000000005'
          and contract_status = 'ACTIVE'),
       '5f000000-0000-4000-8000-0000000000b1'
     ) $$,
  '23514'
);
select is(
  (
    select contract_status::text from public.contract
    where unit_id = '7f000000-0000-4000-8000-000000000005'
      and contract_status = 'ACTIVE'
  ),
  'ACTIVE',
  'failed transfer keeps OLD ACTIVE'
);
select isnt_empty(
  $$ select occupancy_status_id from public.unit_occupancy_status
     where unit_id = '7f000000-0000-4000-8000-000000000005'
       and contract_id = (
         select contract_id from public.contract
         where unit_id = '7f000000-0000-4000-8000-000000000005'
           and contract_status = 'ACTIVE'
       ) $$,
  'failed transfer keeps occupancy on OLD'
);

-- 13. occupancy direct write
select throws_ok(
  $$ insert into public.unit_occupancy_status (project_id, unit_id, contract_id)
     values (
       '20000000-0000-4000-8000-000000000001',
       '7f000000-0000-4000-8000-000000000001',
       (select contract_id from public.contract
        where unit_id = '7f000000-0000-4000-8000-000000000001'
          and contract_status = 'ACTIVE')
     ) $$,
  '42501'
);
select throws_ok(
  $$ update public.unit_occupancy_status set occupancy_intent = 'SALE' $$,
  '42501'
);
select throws_ok($$ delete from public.unit_occupancy_status $$, '42501');

select pg_temp.impersonate('30000000-0000-4000-8000-00000000000a');
select throws_ok(
  $$ update public.unit_occupancy_status set occupancy_intent = 'SALE' $$,
  '42501'
);

-- 14. occupancy RPC authorization
select lives_ok(
  $$ select public.update_unit_occupancy_status(
       '20000000-0000-4000-8000-000000000001',
       '7f000000-0000-4000-8000-000000000001',
       (select contract_id from public.contract
        where unit_id = '7f000000-0000-4000-8000-000000000001'
          and contract_status = 'ACTIVE'),
       'MONTHLY_RENT'
     ) $$,
  'COUNSELOR updates assigned occupancy'
);
select throws_ok(
  $$ select public.update_unit_occupancy_status(
       '20000000-0000-4000-8000-000000000001',
       '7f000000-0000-4000-8000-000000000003',
       (select contract_id from public.contract
        where unit_id = '7f000000-0000-4000-8000-000000000003'
          and contract_status = 'ACTIVE'),
       'SALE'
     ) $$,
  '42501'
);
select throws_ok(
  $$ select public.update_unit_occupancy_status(
       '20000000-0000-4000-8000-000000000002',
       '7f000000-0000-4000-8000-0000000000b1',
       '00000000-0000-4000-8000-000000000001',
       'SALE'
     ) $$,
  '42501'
);

select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c1');
select lives_ok(
  $$ select public.update_unit_occupancy_status(
       '20000000-0000-4000-8000-000000000001',
       '7f000000-0000-4000-8000-000000000003',
       (select contract_id from public.contract
        where unit_id = '7f000000-0000-4000-8000-000000000003'
          and contract_status = 'ACTIVE'),
       'SALE'
     ) $$,
  'PROJECT_ADMIN updates any A1 occupancy'
);
select throws_ok(
  $$ select public.update_unit_occupancy_status(
       '21000000-0000-4000-8000-0000000000a2',
       '7f000000-0000-4000-8000-0000000000a2',
       (select contract_id from public.contract
        where unit_id = '7f000000-0000-4000-8000-0000000000a2'
          and contract_status = 'ACTIVE'),
       'SALE'
     ) $$,
  '42501'
);

-- 15-16 occupancy history + CHECK
create temporary table m11_occ as
select occupancy_intent::text as intent, funding_status::text as funding,
       move_in_status::text as move
from public.unit_occupancy_status
where unit_id = '7f000000-0000-4000-8000-000000000001';

select lives_ok(
  $$ select public.update_unit_occupancy_status(
       '20000000-0000-4000-8000-000000000001',
       '7f000000-0000-4000-8000-000000000001',
       (select contract_id from public.contract
        where unit_id = '7f000000-0000-4000-8000-000000000001'
          and contract_status = 'ACTIVE'),
       null, 'NORMAL'
     ) $$,
  'funding_status change'
);
select isnt_empty(
  $$ select history_id from public.contract_status_history
     where unit_id = '7f000000-0000-4000-8000-000000000001'
       and field_changed = 'funding_status'
       and previous_value = (select funding from m11_occ)
       and new_value = 'NORMAL'
       and changed_by = '40000000-0000-4000-8000-0000000000c1' $$,
  'funding history row accurate'
);

select lives_ok(
  $$ select public.update_unit_occupancy_status(
       '20000000-0000-4000-8000-000000000001',
       '7f000000-0000-4000-8000-000000000001',
       (select contract_id from public.contract
        where unit_id = '7f000000-0000-4000-8000-000000000001'
          and contract_status = 'ACTIVE'),
       null, null, null, '2026-12-01'
     ) $$,
  'date-only occupancy update'
);

create temporary table m11_hist_n as
select count(*)::integer as n from public.contract_status_history
where unit_id = '7f000000-0000-4000-8000-000000000001';

select lives_ok(
  $$ select public.update_unit_occupancy_status(
       '20000000-0000-4000-8000-000000000001',
       '7f000000-0000-4000-8000-000000000001',
       (select contract_id from public.contract
        where unit_id = '7f000000-0000-4000-8000-000000000001'
          and contract_status = 'ACTIVE'),
       null, null, null, '2026-12-15'
     ) $$,
  'second date-only update'
);
select is(
  (select count(*)::integer from public.contract_status_history
   where unit_id = '7f000000-0000-4000-8000-000000000001'),
  (select n from m11_hist_n),
  'date-only update writes no history'
);

select throws_ok(
  $$ select public.update_unit_occupancy_status(
       '20000000-0000-4000-8000-000000000001',
       '7f000000-0000-4000-8000-000000000001',
       (select contract_id from public.contract
        where unit_id = '7f000000-0000-4000-8000-000000000001'
          and contract_status = 'ACTIVE'),
       null, null, 'BALANCE_PAID'
     ) $$,
  '23514'
);
select is(
  (select move_in_status::text from public.unit_occupancy_status
   where unit_id = '7f000000-0000-4000-8000-000000000001'),
  (select move from m11_occ),
  'failed BALANCE_PAID rolls back current'
);

select lives_ok(
  $$ select public.update_unit_occupancy_status(
       '20000000-0000-4000-8000-000000000001',
       '7f000000-0000-4000-8000-000000000001',
       (select contract_id from public.contract
        where unit_id = '7f000000-0000-4000-8000-000000000001'
          and contract_status = 'ACTIVE'),
       null, null, 'BALANCE_PAID',
       null, '2026-09-09 00:00:00+00'
     ) $$,
  'BALANCE_PAID with timestamp'
);
select throws_ok(
  $$ select public.update_unit_occupancy_status(
       '20000000-0000-4000-8000-000000000001',
       '7f000000-0000-4000-8000-000000000001',
       (select contract_id from public.contract
        where unit_id = '7f000000-0000-4000-8000-000000000001'
          and contract_status = 'ACTIVE'),
       null, null, 'MOVED_IN'
     ) $$,
  '23514'
);
select lives_ok(
  $$ select public.update_unit_occupancy_status(
       '20000000-0000-4000-8000-000000000001',
       '7f000000-0000-4000-8000-000000000001',
       (select contract_id from public.contract
        where unit_id = '7f000000-0000-4000-8000-000000000001'
          and contract_status = 'ACTIVE'),
       null, null, 'MOVED_IN',
       null, null, '2026-09-10 00:00:00+00'
     ) $$,
  'MOVED_IN with timestamp'
);
select lives_ok(
  $$ select public.update_unit_occupancy_status(
       '20000000-0000-4000-8000-000000000001',
       '7f000000-0000-4000-8000-000000000001',
       (select contract_id from public.contract
        where unit_id = '7f000000-0000-4000-8000-000000000001'
          and contract_status = 'ACTIVE'),
       null, null, null,
       null, '2026-09-11 00:00:00+00'
     ) $$,
  'date without auto status change'
);
select is(
  (select move_in_status::text from public.unit_occupancy_status
   where unit_id = '7f000000-0000-4000-8000-000000000001'),
  'MOVED_IN',
  'timestamp alone does not change move_in_status'
);

-- 17. history immutable
select throws_ok(
  $$ insert into public.contract_status_history (
       project_id, contract_id, unit_id, field_changed, new_value, changed_by
     ) values (
       '20000000-0000-4000-8000-000000000001',
       (select contract_id from public.contract
        where unit_id = '7f000000-0000-4000-8000-000000000001'
          and contract_status = 'ACTIVE'),
       '7f000000-0000-4000-8000-000000000001',
       'occupancy_intent', 'SALE',
       '40000000-0000-4000-8000-0000000000c1'
     ) $$,
  '42501'
);
select throws_ok($$ update public.contract_status_history set new_value = 'X' $$, '42501');
select throws_ok($$ delete from public.contract_status_history $$, '42501');

-- 18. consultation FK (owner insert) + 19 contact_schedule
reset role;

insert into public.consultation (
  id, project_id, customer_id, counselor_id, consulted_at, content, created_by,
  unit_id, contact_type
) values (
  'c1000000-0000-4000-8000-0000000000a1',
  '20000000-0000-4000-8000-000000000001',
  '5f000000-0000-4000-8000-0000000000a1',
  '40000000-0000-4000-8000-00000000000a',
  now(),
  'M11 log',
  '40000000-0000-4000-8000-00000000000a',
  '7f000000-0000-4000-8000-000000000001',
  'CALL'
);

select is(
  (select ai_analysis_status::text from public.consultation
   where id = 'c1000000-0000-4000-8000-0000000000a1'),
  'PENDING',
  'consultation AI PENDING default'
);
select is(
  (select content_version from public.consultation
   where id = 'c1000000-0000-4000-8000-0000000000a1'),
  1,
  'consultation content_version default'
);

select throws_ok(
  $$ insert into public.consultation (
       project_id, customer_id, counselor_id, consulted_at, content, created_by, unit_id
     ) values (
       '20000000-0000-4000-8000-000000000001',
       '5f000000-0000-4000-8000-0000000000a1',
       '40000000-0000-4000-8000-00000000000a',
       now(), 'x', '40000000-0000-4000-8000-00000000000a',
       '7f000000-0000-4000-8000-0000000000a2'
     ) $$,
  '23503'
);
select throws_ok(
  $$ insert into public.consultation (
       project_id, customer_id, counselor_id, consulted_at, content, created_by
     ) values (
       '20000000-0000-4000-8000-000000000001',
       '5f000000-0000-4000-8000-0000000000b1',
       '40000000-0000-4000-8000-00000000000a',
       now(), 'x', '40000000-0000-4000-8000-00000000000a'
     ) $$,
  '23503'
);
select throws_ok(
  $$ insert into public.consultation (
       project_id, customer_id, counselor_id, consulted_at, content, created_by
     ) values (
       '20000000-0000-4000-8000-000000000001',
       '5f000000-0000-4000-8000-0000000000a1',
       '40000000-0000-4000-8000-00000000000b',
       now(), 'x', '40000000-0000-4000-8000-00000000000a'
     ) $$,
  '23503'
);

set local role authenticated;
select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c1');
select lives_ok(
  $$ select public.update_unit_occupancy_status(
       '20000000-0000-4000-8000-000000000001',
       '7f000000-0000-4000-8000-000000000001',
       (select contract_id from public.contract
        where unit_id = '7f000000-0000-4000-8000-000000000001'
          and contract_status = 'ACTIVE'),
       'SELF_MOVE_IN',
       null, null, null, null, null, null, null,
       false, false, false, false, false,
       'c1000000-0000-4000-8000-0000000000a1',
       'contact link'
     ) $$,
  'history.contact_id same project'
);

reset role;
select throws_ok(
  $$ insert into public.contract_status_history (
       project_id, contract_id, unit_id, field_changed, new_value, changed_by, contact_id
     )
     select
       '20000000-0000-4000-8000-000000000002',
       contract_id, unit_id, 'occupancy_intent', 'SALE',
       '40000000-0000-4000-8000-00000000000b',
       'c1000000-0000-4000-8000-0000000000a1'
     from public.contract
     where unit_id = '7f000000-0000-4000-8000-0000000000a2'
       and contract_status = 'ACTIVE'
     $$,
  '23503'
);

select throws_ok(
  $$ delete from public.consultation
     where id = 'c1000000-0000-4000-8000-0000000000a1' $$,
  '23503'
);

insert into public.contact_schedule (
  schedule_id, project_id, customer_id, created_by, contact_type, planned_at, status
) values (
  'd1000000-0000-4000-8000-0000000000a1',
  '20000000-0000-4000-8000-000000000001',
  '5f000000-0000-4000-8000-0000000000a1',
  '40000000-0000-4000-8000-0000000000c1',
  'CALL',
  now(),
  'PENDING'
);

select throws_ok(
  $$ insert into public.contact_schedule (
       project_id, customer_id, created_by, contact_type, planned_at, status
     ) values (
       '20000000-0000-4000-8000-000000000001',
       '5f000000-0000-4000-8000-0000000000a1',
       '40000000-0000-4000-8000-0000000000c1',
       'CALL', now(), 'SENT'
     ) $$,
  '23514'
);
select lives_ok(
  $$ insert into public.contact_schedule (
       project_id, customer_id, created_by, contact_type, planned_at, status, actual_sent_at
     ) values (
       '20000000-0000-4000-8000-000000000001',
       '5f000000-0000-4000-8000-0000000000a1',
       '40000000-0000-4000-8000-0000000000c1',
       'CALL', now(), 'SENT', now()
     ) $$,
  'SENT with actual_sent_at'
);
select throws_ok(
  $$ insert into public.contact_schedule (
       project_id, customer_id, created_by, contact_type, planned_at
     ) values (
       '20000000-0000-4000-8000-000000000001',
       '5f000000-0000-4000-8000-0000000000b1',
       '40000000-0000-4000-8000-0000000000c1',
       'CALL', now()
     ) $$,
  '23503'
);

set local role authenticated;
select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c1');
select isnt_empty(
  $$ select schedule_id from public.contact_schedule
     where schedule_id = 'd1000000-0000-4000-8000-0000000000a1' $$,
  'A1 admin selects A1 contact_schedule'
);
select pg_temp.impersonate('30000000-0000-4000-8000-00000000000b');
select is_empty(
  $$ select schedule_id from public.contact_schedule
     where schedule_id = 'd1000000-0000-4000-8000-0000000000a1' $$,
  'B1 cannot select A1 contact_schedule'
);
select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c1');
select throws_ok(
  $$ insert into public.contact_schedule (
       project_id, customer_id, created_by, contact_type, planned_at
     ) values (
       '20000000-0000-4000-8000-000000000001',
       '5f000000-0000-4000-8000-0000000000a1',
       '40000000-0000-4000-8000-0000000000c1',
       'CALL', now()
     ) $$,
  '42501'
);
select throws_ok($$ update public.contact_schedule set status = 'SENT' $$, '42501');
select throws_ok($$ delete from public.contact_schedule $$, '42501');

-- 20. funnel
select throws_ok(
  $$ insert into public.funnel_event (project_id, customer_id, event_type, created_by)
     values (
       '20000000-0000-4000-8000-000000000001',
       '5f000000-0000-4000-8000-0000000000a1',
       'CONTRACT',
       '40000000-0000-4000-8000-0000000000c1'
     ) $$,
  '42501'
);
select throws_ok($$ update public.funnel_event set event_type = 'X' $$, '42501');
select throws_ok($$ delete from public.funnel_event $$, '42501');
select isnt_empty(
  $$ select event_id from public.funnel_event
     where customer_id = '5f000000-0000-4000-8000-0000000000a1'
       and event_type = 'CONTRACT' $$,
  'A1 selects own-project funnel'
);
select pg_temp.impersonate('30000000-0000-4000-8000-00000000000b');
select is_empty(
  $$ select event_id from public.funnel_event
     where customer_id = '5f000000-0000-4000-8000-0000000000a1' $$,
  'B1 cannot select A1 funnel'
);

-- 21-22 market_data
select pg_temp.impersonate('30000000-0000-4000-8000-00000000000a');
select throws_ok(
  $$ insert into public.market_data (project_id, data_scope, period)
     values ('20000000-0000-4000-8000-000000000001', 'INTERNAL', '2026-09-01') $$,
  '42501'
);

select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c1');
select lives_ok(
  $$ insert into public.market_data (
       market_data_id, project_id, data_scope, period, source, unit_type, complex_name
     ) values (
       '99f00000-0000-4000-8000-000000000001',
       '20000000-0000-4000-8000-000000000001',
       'INTERNAL', '2026-09-01', 'SRC1', '84', null
     ) $$,
  'admin inserts INTERNAL'
);
select lives_ok(
  $$ insert into public.market_data (
       project_id, data_scope, period, source, unit_type, complex_name
     ) values (
       '20000000-0000-4000-8000-000000000001',
       'INTERNAL', '2026-09-01', 'SRC2', '84', null
     ) $$,
  'same month/type multiple sources allowed'
);
select throws_ok(
  $$ insert into public.market_data (
       project_id, data_scope, period, complex_name
     ) values (
       '20000000-0000-4000-8000-000000000001', 'COMPETITOR', '2026-09-01', null
     ) $$,
  '23514'
);
select throws_ok(
  $$ insert into public.market_data (project_id, data_scope, period)
     values ('20000000-0000-4000-8000-000000000001', 'INTERNAL', '2026-09-15') $$,
  '23514'
);
select throws_ok(
  $$ insert into public.market_data (
       project_id, data_scope, period, sale_listing_count
     ) values (
       '20000000-0000-4000-8000-000000000001', 'INTERNAL', '2026-09-01', -1
     ) $$,
  '23514'
);
select throws_ok(
  $$ insert into public.market_data (
       project_id, data_scope, period
     ) values (
       '20000000-0000-4000-8000-000000000002', 'INTERNAL', '2026-09-01'
     ) $$,
  '42501'
);
select throws_ok($$ delete from public.market_data $$, '42501');
select isnt_empty(
  $$ select market_data_id from public.market_data
     where market_data_id = '99f00000-0000-4000-8000-000000000001' $$,
  'A1 selects A1 market_data'
);
select pg_temp.impersonate('30000000-0000-4000-8000-00000000000b');
select is_empty(
  $$ select market_data_id from public.market_data
     where market_data_id = '99f00000-0000-4000-8000-000000000001' $$,
  'B1 cannot select A1 market_data'
);

-- 23-25 report
select pg_temp.impersonate('30000000-0000-4000-8000-00000000000a');
select isnt_empty(
  $$ select template_id from public.report_template
     where template_id = 'a9000000-0000-4000-8000-000000000001' $$,
  'A1 counselor sees Org A shared template'
);
select isnt_empty(
  $$ select template_id from public.report_template
     where template_id = 'a9000000-0000-4000-8000-0000000000a1' $$,
  'A1 counselor sees A1 dedicated template'
);
select is_empty(
  $$ select template_id from public.report_template
     where template_id = 'a9000000-0000-4000-8000-0000000000a2' $$,
  'A1 member cannot see A2 dedicated template'
);
select is_empty(
  $$ select template_id from public.report_template
     where template_id = 'a9000000-0000-4000-8000-0000000000b1' $$,
  'A1 member cannot see Org B template'
);
select throws_ok(
  $$ insert into public.report_template (
       organization_id, project_id, report_phase, report_type, name,
       template_definition, mapping_definition, source_type
     ) values (
       '10000000-0000-4000-8000-000000000001',
       '20000000-0000-4000-8000-000000000001',
       'MOVE_IN', 'DAILY', 'nope', '{}'::jsonb, '{}'::jsonb, 'MANUAL'
     ) $$,
  '42501'
);

select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c1');
select lives_ok(
  $$ insert into public.report_template (
       organization_id, project_id, report_phase, report_type, name,
       template_definition, mapping_definition, source_type
     ) values (
       '10000000-0000-4000-8000-000000000001',
       '20000000-0000-4000-8000-000000000001',
       'MOVE_IN', 'MONTHLY', 'A1 admin tpl', '{}'::jsonb, '{}'::jsonb, 'MANUAL'
     ) $$,
  'PROJECT_ADMIN writes project template'
);
select throws_ok(
  $$ insert into public.report_template (
       organization_id, project_id, report_phase, report_type, name,
       template_definition, mapping_definition, source_type
     ) values (
       '10000000-0000-4000-8000-000000000001',
       null,
       'MOVE_IN', 'DAILY', 'org-wide', '{}'::jsonb, '{}'::jsonb, 'MANUAL'
     ) $$,
  '42501'
);

select pg_temp.impersonate('30000000-0000-4000-8000-00000000000a');
select throws_ok(
  $$ select public.generate_report(
       '20000000-0000-4000-8000-000000000001',
       '2026-09-21', 'MOVE_IN', 'WEEKLY', '{"n":1}'::jsonb
     ) $$,
  '42501'
);
select pg_temp.impersonate('31000000-0000-4000-8000-0000000000c3');
select throws_ok(
  $$ select public.generate_report(
       '20000000-0000-4000-8000-000000000001',
       '2026-09-21', 'MOVE_IN', 'WEEKLY', '{"n":1}'::jsonb
     ) $$,
  '42501'
);
select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c1');
select throws_ok(
  $$ select public.generate_report(
       '20000000-0000-4000-8000-000000000001',
       '2026-09-21', 'MOVE_IN', 'WEEKLY', '{"n":1}'::jsonb,
       'a9000000-0000-4000-8000-0000000000a2'
     ) $$,
  '23514'
);
select lives_ok(
  $$ select public.generate_report(
       '20000000-0000-4000-8000-000000000001',
       '2026-09-21', 'MOVE_IN', 'WEEKLY', '{"n":1}'::jsonb,
       'a9000000-0000-4000-8000-000000000001'
     ) $$,
  'admin generate with org-shared template'
);

create temporary table m11_rpt as
select report_id, generated_data, version, generated_by
from public.report
where project_id = '20000000-0000-4000-8000-000000000001'
  and report_date = '2026-09-21';

select is(
  (select generated_by from m11_rpt),
  '40000000-0000-4000-8000-0000000000c1'::uuid,
  'generated_by is caller actor'
);
select is((select generated_data from m11_rpt), '{"n":1}'::jsonb, 'snapshot stored');
select is((select version from m11_rpt), 1, 'first version is 1');

select lives_ok(
  $$ select public.generate_report(
       '20000000-0000-4000-8000-000000000001',
       '2026-09-21', 'MOVE_IN', 'WEEKLY', '{"n":2}'::jsonb
     ) $$,
  'regenerate'
);
select is(
  (select generated_data from public.report where report_id = (select report_id from m11_rpt)),
  '{"n":1}'::jsonb,
  'old snapshot immutable'
);
select is(
  (
    select version from public.report
    where project_id = '20000000-0000-4000-8000-000000000001'
      and report_date = '2026-09-21'
    order by version desc limit 1
  ),
  2,
  'regenerated version +1'
);
select is(
  (
    select supersedes_report_id from public.report
    where project_id = '20000000-0000-4000-8000-000000000001'
      and report_date = '2026-09-21'
    order by version desc limit 1
  ),
  (select report_id from m11_rpt),
  'supersedes_report_id points at OLD'
);
select throws_ok(
  $$ insert into public.report (
       project_id, report_phase, report_type, report_date, generated_data, generated_by
     ) values (
       '20000000-0000-4000-8000-000000000001',
       'MOVE_IN', 'DAILY', '2026-09-22', '{}'::jsonb,
       '40000000-0000-4000-8000-0000000000c1'
     ) $$,
  '42501'
);
select throws_ok($$ update public.report set generated_data = '{}'::jsonb $$, '42501');
select throws_ok($$ delete from public.report $$, '42501');

select throws_ok(
  $$ select public.generate_report(
       '20000000-0000-4000-8000-000000000001',
       '2026-09-21', 'MOVE_IN', 'WEEKLY', '{"n":3}'::jsonb,
       'a9000000-0000-4000-8000-0000000000b1'
     ) $$,
  '23514'
);
select is(
  (select generated_data from public.report where report_id = (select report_id from m11_rpt)),
  '{"n":1}'::jsonb,
  'failed regenerate leaves old report'
);

-- 26-27 CS
select throws_ok(
  $$ insert into public.cs_ticket (
       project_id, contract_id, unit_id, customer_id, category, title, description, created_by
     )
     select project_id, contract_id, unit_id, customer_id, '누수', 't', 'd',
            '40000000-0000-4000-8000-0000000000c1'
     from public.contract
     where unit_id = '7f000000-0000-4000-8000-000000000001'
       and contract_status = 'ACTIVE' $$,
  '42501'
);

select pg_temp.impersonate('30000000-0000-4000-8000-00000000000a');
select lives_ok(
  $$ select public.create_cs_ticket(
       '20000000-0000-4000-8000-000000000001',
       (select contract_id from public.contract
        where unit_id = '7f000000-0000-4000-8000-000000000001'
          and contract_status = 'ACTIVE'),
       '누수', 'assigned', 'desc'
     ) $$,
  'COUNSELOR CS on assigned contract'
);
select throws_ok(
  $$ select public.create_cs_ticket(
       '20000000-0000-4000-8000-000000000001',
       (select contract_id from public.contract
        where unit_id = '7f000000-0000-4000-8000-000000000003'
          and contract_status = 'ACTIVE'),
       '누수', 'other', 'desc'
     ) $$,
  '42501'
);

select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c1');
select lives_ok(
  $$ select public.create_cs_ticket(
       '20000000-0000-4000-8000-000000000001',
       (select contract_id from public.contract
        where unit_id = '7f000000-0000-4000-8000-000000000003'
          and contract_status = 'ACTIVE'),
       '소음', 'admin cs', 'desc'
     ) $$,
  'PROJECT_ADMIN CS on A1'
);
select throws_ok(
  $$ select public.create_cs_ticket(
       '21000000-0000-4000-8000-0000000000a2',
       (select contract_id from public.contract
        where unit_id = '7f000000-0000-4000-8000-0000000000a2'
          and contract_status = 'ACTIVE'),
       '소음', 'x', 'desc'
     ) $$,
  '42501'
);
select throws_ok(
  $$ select public.create_cs_ticket(
       '20000000-0000-4000-8000-000000000001',
       (select contract_id from m11_cancel),
       '누수', 'cancelled', 'desc'
     ) $$,
  '23514'
);

reset role;
update public.contract
set contract_status = 'COMPLETED'
where unit_id = '7f000000-0000-4000-8000-0000000000a2'
  and contract_status = 'ACTIVE';

set local role authenticated;
select pg_temp.impersonate('31000000-0000-4000-8000-0000000000c3');
select lives_ok(
  $$ select public.create_cs_ticket(
       '21000000-0000-4000-8000-0000000000a2',
       (select contract_id from public.contract
        where unit_id = '7f000000-0000-4000-8000-0000000000a2'),
       '하자', 'completed ok', 'desc'
     ) $$,
  'CS allowed on COMPLETED'
);

select pg_temp.impersonate('30000000-0000-4000-8000-00000000000a');
select lives_ok(
  $$ select public.update_cs_ticket(
       '20000000-0000-4000-8000-000000000001',
       (select ticket_id from public.cs_ticket where title = 'assigned'),
       'RESOLVED'
     ) $$,
  'assigned counselor resolves CS'
);
select throws_ok(
  $$ select public.update_cs_ticket(
       '20000000-0000-4000-8000-000000000001',
       (select ticket_id from public.cs_ticket where title = 'assigned'),
       'OPEN'
     ) $$,
  '23514'
);

select pg_temp.impersonate('30000000-0000-4000-8000-00000000000f');
select throws_ok(
  $$ select public.update_cs_ticket(
       '20000000-0000-4000-8000-000000000001',
       (select ticket_id from public.cs_ticket where title = 'assigned'),
       'CLOSED'
     ) $$,
  '42501'
);

select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c1');
select lives_ok(
  $$ select public.update_cs_ticket(
       '20000000-0000-4000-8000-000000000001',
       (select ticket_id from public.cs_ticket where title = 'admin cs'),
       'CLOSED'
     ) $$,
  'admin closes CS'
);
select throws_ok(
  $$ select public.update_cs_ticket(
       '20000000-0000-4000-8000-000000000001',
       (select ticket_id from public.cs_ticket where title = 'admin cs'),
       'OPEN'
     ) $$,
  '23514'
);
select throws_ok(
  $$ select public.update_cs_ticket(
       '20000000-0000-4000-8000-000000000001',
       (select ticket_id from public.cs_ticket where title = 'assigned'),
       null, 'INVALID'
     ) $$,
  '23514'
);

-- ticket survives later cancel of a still-ACTIVE CS contract (unit 001)
select isnt_empty(
  $$ select ticket_id from public.cs_ticket where title = 'assigned' $$,
  'CS row remains after status changes'
);

-- 28 community_notice
select pg_temp.impersonate('30000000-0000-4000-8000-00000000000a');
select throws_ok(
  $$ insert into public.community_notice (
       project_id, target_type, title, content, created_by
     ) values (
       '20000000-0000-4000-8000-000000000001',
       'GENERAL', 't', 'c', '40000000-0000-4000-8000-00000000000a'
     ) $$,
  '42501'
);

select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c1');
select lives_ok(
  $$ insert into public.community_notice (
       notice_id, project_id, target_type, title, content, created_by
     ) values (
       'b1000000-0000-4000-8000-0000000000a1',
       '20000000-0000-4000-8000-000000000001',
       'GENERAL', 'notice', 'body',
       '40000000-0000-4000-8000-0000000000c1'
     ) $$,
  'admin inserts community_notice'
);
select throws_ok(
  $$ insert into public.community_notice (
       project_id, target_type, title, content, created_by
     ) values (
       '20000000-0000-4000-8000-000000000001',
       'GENERAL', '   ', 'body',
       '40000000-0000-4000-8000-0000000000c1'
     ) $$,
  '23514'
);
select throws_ok($$ delete from public.community_notice $$, '42501');
select isnt_empty(
  $$ select notice_id from public.community_notice
     where notice_id = 'b1000000-0000-4000-8000-0000000000a1' $$,
  'A1 member selects notice'
);
select pg_temp.impersonate('30000000-0000-4000-8000-00000000000b');
select is_empty(
  $$ select notice_id from public.community_notice
     where notice_id = 'b1000000-0000-4000-8000-0000000000a1' $$,
  'B1 cannot select A1 notice'
);
select throws_ok(
  $$ insert into public.community_notice (
       project_id, target_type, title, content, created_by
     ) values (
       '20000000-0000-4000-8000-000000000001',
       'GENERAL', 'x', 'y', '40000000-0000-4000-8000-00000000000b'
     ) $$,
  '42501'
);

-- 29 hard-delete RESTRICT as table owner
reset role;
select throws_ok(
  $$ delete from public.project_unit
     where unit_id = '7f000000-0000-4000-8000-000000000001' $$,
  '23503'
);
select throws_ok(
  $$ delete from public.customer
     where id = '5f000000-0000-4000-8000-0000000000a1' $$,
  '23503'
);
select throws_ok(
  $$ delete from public.contract
     where contract_id = (select old_id from m11_xfer) $$,
  '23503'
);
select throws_ok(
  $$ delete from public.report_template
     where template_id = 'a9000000-0000-4000-8000-000000000001' $$,
  '23503'
);
select throws_ok(
  $$ delete from public.project_member
     where id = '40000000-0000-4000-8000-0000000000c1' $$,
  '23503'
);

-- 36 promote rollback: dormant entry
insert into public.entry_pool (entry_id, project_id, phone_normalized, status)
values (
  'e3000000-0000-4000-8000-000000000099',
  '20000000-0000-4000-8000-000000000001',
  '01097100999',
  'DORMANT'
);

set local role authenticated;
select pg_temp.impersonate('30000000-0000-4000-8000-00000000000a');
select throws_ok(
  $$ select public.promote_entry_to_customer(
       '20000000-0000-4000-8000-000000000001',
       'e3000000-0000-4000-8000-00000000ffff'
     ) $$,
  '23503'
);
select is(
  (
    select count(*)::integer from public.customer
    where phone_normalized = '01097100999'
  ),
  0,
  'failed promote creates no customer'
);
select is(
  (
    select count(*)::integer from public.funnel_event
    where metadata ->> 'entry_id' = 'e3000000-0000-4000-8000-00000000ffff'
  ),
  0,
  'failed promote creates no funnel'
);

select throws_ok(
  $$ select public.promote_entry_to_customer(
       '20000000-0000-4000-8000-000000000001',
       'e3000000-0000-4000-8000-000000000099'
     ) $$,
  '23514'
);
select is(
  (select status from public.entry_pool where entry_id = 'e3000000-0000-4000-8000-000000000099'),
  'DORMANT',
  'dormant promote leaves entry DORMANT'
);

reset role;
select * from finish();
rollback;
