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

create function pg_temp.clear_auth()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', '', true);
end;
$$;

insert into public.project_unit (unit_id, project_id, building_no, unit_no)
values
  ('7a000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '801', '101'),
  ('7a000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '801', '102'),
  ('7a000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', '801', '103'),
  ('7a000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', '801', '101');

insert into public.customer (
  id, project_id, name, phone, phone_normalized, assigned_counselor_id
) values
  (
    '5a000000-0000-4000-8000-0000000000a1',
    '20000000-0000-4000-8000-000000000001',
    'RPC Customer A',
    '01092000001',
    '01092000001',
    '40000000-0000-4000-8000-00000000000a'
  ),
  (
    '5a000000-0000-4000-8000-0000000000f1',
    '20000000-0000-4000-8000-000000000001',
    'RPC Customer F',
    '01092000002',
    '01092000002',
    '40000000-0000-4000-8000-00000000000f'
  ),
  (
    '5a000000-0000-4000-8000-0000000000b1',
    '20000000-0000-4000-8000-000000000002',
    'RPC Customer B',
    '01092000003',
    '01092000003',
    '40000000-0000-4000-8000-00000000000b'
  );

insert into public.report_template (
  template_id, organization_id, project_id, report_phase, report_type,
  name, template_definition, mapping_definition, source_type
) values
  (
    'a7000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    null,
    'MOVE_IN',
    'DAILY',
    'Org1 shared rpc',
    '{}'::jsonb,
    '{}'::jsonb,
    'MANUAL'
  ),
  (
    'a7000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    'MOVE_IN',
    'DAILY',
    'P2 dedicated rpc',
    '{}'::jsonb,
    '{}'::jsonb,
    'MANUAL'
  );

select has_function('public'::name, 'create_contract'::name);
select has_function('public'::name, 'cancel_contract'::name);
select has_function('public'::name, 'transfer_contract_holder'::name);
select has_function('public'::name, 'update_unit_occupancy_status'::name);
select has_function('public'::name, 'generate_report'::name);
select has_function('public'::name, 'create_cs_ticket'::name);
select has_function('public'::name, 'update_cs_ticket'::name);

select ok(
  has_function_privilege(
    'authenticated',
    'public.create_contract(uuid,uuid,uuid,uuid)',
    'EXECUTE'
  ),
  'authenticated can execute create_contract'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.create_contract(uuid,uuid,uuid,uuid)',
    'EXECUTE'
  ),
  'anon cannot execute create_contract'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'private.write_rpc_actor(uuid)',
    'EXECUTE'
  ),
  'authenticated cannot execute write_rpc_actor'
);

select pg_temp.clear_auth();
set local role authenticated;

select throws_ok(
  $$ select public.create_contract(
       '20000000-0000-4000-8000-000000000001',
       '5a000000-0000-4000-8000-0000000000a1',
       '7a000000-0000-4000-8000-000000000001'
     ) $$,
  '42501'
);

select pg_temp.impersonate('30000000-0000-4000-8000-00000000000a');
select throws_ok(
  $$ select public.create_contract(
       '20000000-0000-4000-8000-000000000001',
       '5a000000-0000-4000-8000-0000000000a1',
       '7a000000-0000-4000-8000-000000000001'
     ) $$,
  '42501'
);

select pg_temp.impersonate('30000000-0000-4000-8000-00000000000e');
select throws_ok(
  $$ select public.create_contract(
       '20000000-0000-4000-8000-000000000001',
       '5a000000-0000-4000-8000-0000000000a1',
       '7a000000-0000-4000-8000-000000000001'
     ) $$,
  '42501'
);

select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c1');

select lives_ok(
  $$ select public.create_contract(
       '20000000-0000-4000-8000-000000000001',
       '5a000000-0000-4000-8000-0000000000a1',
       '7a000000-0000-4000-8000-000000000001'
     ) $$,
  'PROJECT_ADMIN create_contract succeeds'
);

select isnt_empty(
  $$ select occupancy_status_id from public.unit_occupancy_status
     where unit_id = '7a000000-0000-4000-8000-000000000001' $$,
  'create_contract inserts occupancy row'
);

select throws_ok(
  $$ select public.create_contract(
       '20000000-0000-4000-8000-000000000001',
       '5a000000-0000-4000-8000-0000000000a1',
       '7a000000-0000-4000-8000-000000000001'
     ) $$,
  '23505'
);

select throws_ok(
  $$ select public.create_contract(
       '20000000-0000-4000-8000-000000000001',
       '5a000000-0000-4000-8000-0000000000a1',
       '7a000000-0000-4000-8000-000000000004'
     ) $$,
  '23514'
);

select lives_ok(
  $$ select public.create_contract(
       '20000000-0000-4000-8000-000000000001',
       '5a000000-0000-4000-8000-0000000000f1',
       '7a000000-0000-4000-8000-000000000002'
     ) $$,
  'PROJECT_ADMIN create_contract for other customer'
);

select lives_ok(
  $$ select public.transfer_contract_holder(
       '20000000-0000-4000-8000-000000000001',
       (select contract_id from public.contract
        where unit_id = '7a000000-0000-4000-8000-000000000002'),
       '5a000000-0000-4000-8000-0000000000a1'
     ) $$,
  'transfer_contract_holder to another same-project customer'
);

select is(
  (
    select customer_id from public.contract
    where unit_id = '7a000000-0000-4000-8000-000000000002'
      and contract_status = 'ACTIVE'
  ),
  '5a000000-0000-4000-8000-0000000000a1'::uuid,
  'transferred contract customer updated'
);

select lives_ok(
  $$ select public.create_contract(
       '20000000-0000-4000-8000-000000000001',
       '5a000000-0000-4000-8000-0000000000f1',
       '7a000000-0000-4000-8000-000000000003'
     ) $$,
  'third contract for cancel tests'
);

select lives_ok(
  $$ select public.cancel_contract(
       '20000000-0000-4000-8000-000000000001',
       (select contract_id from public.contract
        where unit_id = '7a000000-0000-4000-8000-000000000003'),
       '고객 변심'
     ) $$,
  'cancel_contract ACTIVE succeeds'
);

select throws_ok(
  $$ select public.cancel_contract(
       '20000000-0000-4000-8000-000000000001',
       (select contract_id from public.contract
        where unit_id = '7a000000-0000-4000-8000-000000000003'),
       'again'
     ) $$,
  '23514'
);

select throws_ok(
  $$ select public.create_cs_ticket(
       '20000000-0000-4000-8000-000000000001',
       (select contract_id from public.contract
        where unit_id = '7a000000-0000-4000-8000-000000000003'),
       '누수',
       'cancelled cs',
       '설명'
     ) $$,
  '23514'
);

-- occupancy as counselor A on A's contract (unit 001)
select pg_temp.impersonate('30000000-0000-4000-8000-00000000000a');

select lives_ok(
  $$ select public.update_unit_occupancy_status(
       '20000000-0000-4000-8000-000000000001',
       '7a000000-0000-4000-8000-000000000001',
       (select contract_id from public.contract
        where unit_id = '7a000000-0000-4000-8000-000000000001'),
       'SELF_MOVE_IN'
     ) $$,
  'counselor updates occupancy for assigned customer'
);

select is(
  (
    select count(*)::integer from public.contract_status_history
    where unit_id = '7a000000-0000-4000-8000-000000000001'
      and field_changed = 'occupancy_intent'
  ),
  1,
  'occupancy enum change writes history'
);

select lives_ok(
  $$ select public.update_unit_occupancy_status(
       '20000000-0000-4000-8000-000000000001',
       '7a000000-0000-4000-8000-000000000001',
       (select contract_id from public.contract
        where unit_id = '7a000000-0000-4000-8000-000000000001'),
       null, null, null,
       '2026-10-01'
     ) $$,
  'date-only occupancy update succeeds'
);

select is(
  (
    select count(*)::integer from public.contract_status_history
    where unit_id = '7a000000-0000-4000-8000-000000000001'
  ),
  1,
  'date-only occupancy update does not write history'
);

select throws_ok(
  $$ select public.update_unit_occupancy_status(
       '20000000-0000-4000-8000-000000000001',
       '7a000000-0000-4000-8000-000000000001',
       (select contract_id from public.contract
        where unit_id = '7a000000-0000-4000-8000-000000000001'),
       null, null, null,
       '2026-11-01',
       null, null, null, null,
       true
     ) $$,
  '23514'
);

select lives_ok(
  $$ select public.create_cs_ticket(
       '20000000-0000-4000-8000-000000000001',
       (select contract_id from public.contract
        where unit_id = '7a000000-0000-4000-8000-000000000001'),
       '누수',
       '천장',
       '물이 샌다'
     ) $$,
  'counselor creates CS for assigned contract'
);

select throws_ok(
  $$ select public.create_cs_ticket(
       '20000000-0000-4000-8000-000000000002',
       (select contract_id from public.contract
        where unit_id = '7a000000-0000-4000-8000-000000000001'),
       '누수',
       'idor',
       '설명'
     ) $$,
  '42501'
);

select lives_ok(
  $$ select public.update_cs_ticket(
       '20000000-0000-4000-8000-000000000001',
       (select ticket_id from public.cs_ticket where title = '천장'),
       'RESOLVED'
     ) $$,
  'counselor resolves CS'
);

select isnt_empty(
  $$ select ticket_id from public.cs_ticket
     where title = '천장' and status = 'RESOLVED'
       and resolved_at is not null $$,
  'RESOLVED sets resolved_at'
);

select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c1');

select lives_ok(
  $$ select public.generate_report(
       '20000000-0000-4000-8000-000000000001',
       '2026-09-09',
       'MOVE_IN',
       'DAILY',
       '{"contacts":1}'::jsonb,
       'a7000000-0000-4000-8000-000000000001'
     ) $$,
  'generate_report with org-shared template'
);

select lives_ok(
  $$ select public.generate_report(
       '20000000-0000-4000-8000-000000000001',
       '2026-09-09',
       'MOVE_IN',
       'DAILY',
       '{"contacts":2}'::jsonb
     ) $$,
  'regenerate creates a new report row'
);

select is(
  (
    select count(*)::integer from public.report
    where project_id = '20000000-0000-4000-8000-000000000001'
      and report_date = '2026-09-09'
  ),
  2,
  'previous report snapshot is preserved'
);

select is(
  (
    select version from public.report
    where project_id = '20000000-0000-4000-8000-000000000001'
      and report_date = '2026-09-09'
    order by version desc
    limit 1
  ),
  2,
  'regenerate increments version'
);

select throws_ok(
  $$ select public.generate_report(
       '20000000-0000-4000-8000-000000000001',
       '2026-09-09',
       'MOVE_IN',
       'DAILY',
       '{}'::jsonb,
       'a7000000-0000-4000-8000-000000000002'
     ) $$,
  '23514'
);

select throws_ok(
  $$ insert into public.contract (
       project_id, customer_id, unit_id, contract_status
     ) values (
       '20000000-0000-4000-8000-000000000001',
       '5a000000-0000-4000-8000-0000000000a1',
       '7a000000-0000-4000-8000-000000000001',
       'ACTIVE'
     ) $$,
  '42501'
);
select throws_ok(
  $$ update public.report set generated_data = '{"x":1}'::jsonb $$,
  '42501'
);

select pg_temp.impersonate('30000000-0000-4000-8000-00000000000b');
select throws_ok(
  $$ select public.update_unit_occupancy_status(
       '20000000-0000-4000-8000-000000000001',
       '7a000000-0000-4000-8000-000000000001',
       (select contract_id from public.contract
        where unit_id = '7a000000-0000-4000-8000-000000000001'),
       'SALE'
     ) $$,
  '42501'
);

reset role;
select pg_temp.clear_auth();

select * from finish();
rollback;
