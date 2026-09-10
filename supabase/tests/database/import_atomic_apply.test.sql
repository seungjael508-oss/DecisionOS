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
  ('7f000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '841', '101'),
  ('7f000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '841', '102'),
  ('7f000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', '841', '103'),
  ('7f000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', '841', '104'),
  ('7f000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000001', '841', '106'),
  ('7f000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000002', '841', '101'),
  ('7f000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000002', '841', '102');

insert into public.customer (
  id, project_id, name, phone, phone_normalized, assigned_counselor_id
) values
  (
    '5f000000-0000-4000-8000-0000000000a1',
    '20000000-0000-4000-8000-000000000001',
    'Import Holder A',
    '01096000001',
    '01096000001',
    '40000000-0000-4000-8000-00000000000a'
  ),
  (
    '5f000000-0000-4000-8000-0000000000b1',
    '20000000-0000-4000-8000-000000000001',
    'Import Holder B',
    '01096000002',
    '01096000002',
    '40000000-0000-4000-8000-00000000000a'
  ),
  (
    '5f000000-0000-4000-8000-0000000000c3',
    '20000000-0000-4000-8000-000000000002',
    'Import Holder P2',
    '01096000001',
    '01096000001',
    '40000000-0000-4000-8000-00000000000b'
  );

select has_function('public'::name, 'apply_move_in_import_row'::name);

select ok(
  (
    select bool_and(has_function_privilege('authenticated', p.oid, 'EXECUTE'))
      and bool_and(not has_function_privilege('anon', p.oid, 'EXECUTE'))
      and bool_and(not has_function_privilege('public', p.oid, 'EXECUTE'))
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'apply_move_in_import_row'
  ),
  'ACL: authenticated only'
);

select pg_temp.impersonate('30000000-0000-4000-8000-00000000000a');
set local role authenticated;

select throws_ok(
  $$ select public.apply_move_in_import_row(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_unit_id := '7f000000-0000-4000-8000-000000000001',
       p_apply_mode := 'CREATE_CONTRACT',
       p_existing_customer_id := '5f000000-0000-4000-8000-0000000000a1'
     ) $$,
  '42501'
);

select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c1');

-- Existing customer + vacant unit
select is(
  (
    select r ->> 'result'
    from public.apply_move_in_import_row(
      p_project_id := '20000000-0000-4000-8000-000000000001',
      p_unit_id := '7f000000-0000-4000-8000-000000000001',
      p_apply_mode := 'CREATE_CONTRACT_AND_UPDATE_OCCUPANCY',
      p_existing_customer_id := '5f000000-0000-4000-8000-0000000000a1',
      p_occupancy_intent := 'SELF_MOVE_IN',
      p_funding_status := 'NORMAL',
      p_move_in_status := 'PLANNED'
    ) as r
  ),
  'CONTRACT_CREATED_AND_OCCUPANCY_UPDATED',
  'existing customer create + occupancy'
);

select is(
  (
    select occupancy_intent::text
    from public.unit_occupancy_status
    where unit_id = '7f000000-0000-4000-8000-000000000001'
  ),
  'SELF_MOVE_IN'
);

select isnt_empty(
  $$ select event_id from public.funnel_event
     where customer_id = '5f000000-0000-4000-8000-0000000000a1'
       and event_type = 'CONTRACT' $$,
  'funnel CONTRACT created'
);

select isnt_empty(
  $$ select history_id from public.contract_status_history
     where unit_id = '7f000000-0000-4000-8000-000000000001'
       and field_changed = 'occupancy_intent' $$,
  'occupancy history on new contract'
);

-- Idempotent re-apply
select is(
  (
    select r ->> 'result'
    from public.apply_move_in_import_row(
      p_project_id := '20000000-0000-4000-8000-000000000001',
      p_unit_id := '7f000000-0000-4000-8000-000000000001',
      p_apply_mode := 'CREATE_CONTRACT_AND_UPDATE_OCCUPANCY',
      p_existing_customer_id := '5f000000-0000-4000-8000-0000000000a1',
      p_expected_current_contract_id := (
        select contract_id from public.contract
        where unit_id = '7f000000-0000-4000-8000-000000000001'
          and contract_status = 'ACTIVE'
      ),
      p_occupancy_intent := 'SELF_MOVE_IN',
      p_funding_status := 'NORMAL',
      p_move_in_status := 'PLANNED'
    ) as r
  ),
  'NO_OP',
  'same holder and occupancy is NO_OP'
);

select is(
  (
    select count(*)::integer
    from public.contract
    where unit_id = '7f000000-0000-4000-8000-000000000001'
      and contract_status = 'ACTIVE'
  ),
  1
);

select is(
  (
    select count(*)::integer
    from public.funnel_event
    where customer_id = '5f000000-0000-4000-8000-0000000000a1'
      and event_type = 'CONTRACT'
      and (metadata ->> 'unit_id') = '7f000000-0000-4000-8000-000000000001'
  ),
  1,
  'no duplicate funnel'
);

-- New customer by phone
select lives_ok(
  $$ select public.apply_move_in_import_row(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_unit_id := '7f000000-0000-4000-8000-000000000002',
       p_apply_mode := 'CREATE_CONTRACT',
       p_new_customer_name := 'New Person',
       p_new_customer_phone_normalized := '01096000999'
     ) $$
);

select is(
  (
    select count(*)::integer from public.customer
    where project_id = '20000000-0000-4000-8000-000000000001'
      and phone_normalized = '01096000999'
  ),
  1
);

-- Reuse same phone on another unit
select lives_ok(
  $$ select public.apply_move_in_import_row(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_unit_id := '7f000000-0000-4000-8000-000000000003',
       p_apply_mode := 'CREATE_CONTRACT',
       p_new_customer_name := 'New Person',
       p_new_customer_phone_normalized := '01096000999'
     ) $$
);

select is(
  (
    select count(*)::integer from public.customer
    where project_id = '20000000-0000-4000-8000-000000000001'
      and phone_normalized = '01096000999'
  ),
  1,
  'phone match reuses customer'
);

select is(
  (
    select count(*)::integer from public.contract
    where customer_id = (
      select id from public.customer
      where phone_normalized = '01096000999'
        and project_id = '20000000-0000-4000-8000-000000000001'
    )
      and contract_status = 'ACTIVE'
  ),
  2,
  'same customer can hold two units'
);

-- Name-only does not reuse
select lives_ok(
  $$ select public.apply_move_in_import_row(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_unit_id := '7f000000-0000-4000-8000-000000000006',
       p_apply_mode := 'CREATE_CONTRACT',
       p_new_customer_name := 'Import Holder A',
       p_new_customer_phone_normalized := '01096000777'
     ) $$
);

select is(
  (
    select count(*)::integer from public.customer
    where project_id = '20000000-0000-4000-8000-000000000001'
      and name = 'Import Holder A'
  ),
  2,
  'same name different phone is not reused'
);

select throws_ok(
  $$ select public.apply_move_in_import_row(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_unit_id := '7f000000-0000-4000-8000-000000000004',
       p_apply_mode := 'CREATE_CONTRACT',
       p_new_customer_name := 'No Phone'
     ) $$,
  '23514'
);

-- Transfer without occupancy
select lives_ok(
  $$ select public.apply_move_in_import_row(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_unit_id := '7f000000-0000-4000-8000-000000000001',
       p_apply_mode := 'TRANSFER_HOLDER_AND_UPDATE_OCCUPANCY',
       p_existing_customer_id := '5f000000-0000-4000-8000-0000000000b1',
       p_expected_current_contract_id := (
         select contract_id from public.contract
         where unit_id = '7f000000-0000-4000-8000-000000000001'
           and contract_status = 'ACTIVE'
       ),
       p_occupancy_intent := 'MONTHLY_RENT',
       p_funding_status := 'FUNDING_SHORTAGE',
       p_move_in_status := 'DELAYED'
     ) $$
);

select is(
  (
    select cancellation_reason
    from public.contract
    where unit_id = '7f000000-0000-4000-8000-000000000001'
      and contract_status = 'CANCELLED'
    order by contract_id
    limit 1
  ),
  'HOLDER_CHANGED'
);

select is(
  (
    select occupancy_intent::text || '/' || (contract_id = (
      select contract_id from public.contract
      where unit_id = '7f000000-0000-4000-8000-000000000001'
        and contract_status = 'ACTIVE'
    ))::text
    from public.unit_occupancy_status
    where unit_id = '7f000000-0000-4000-8000-000000000001'
  ),
  'MONTHLY_RENT/true',
  'occupancy retargeted to NEW contract'
);

select isnt_empty(
  $$ select history_id from public.contract_status_history
     where contract_id = (
       select contract_id from public.contract
       where unit_id = '7f000000-0000-4000-8000-000000000001'
         and contract_status = 'ACTIVE'
     )
       and field_changed = 'occupancy_intent' $$,
  'history on NEW contract'
);

-- Duplicate transfer with old expected fails stale and does not change C2
select throws_ok(
  $$ select public.apply_move_in_import_row(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_unit_id := '7f000000-0000-4000-8000-000000000001',
       p_apply_mode := 'TRANSFER_HOLDER',
       p_existing_customer_id := '5f000000-0000-4000-8000-0000000000a1',
       p_expected_current_contract_id := (
         select contract_id from public.contract
         where unit_id = '7f000000-0000-4000-8000-000000000001'
           and contract_status = 'CANCELLED'
         order by contract_id
         limit 1
       )
     ) $$,
  '23514'
);

select is(
  (
    select customer_id from public.contract
    where unit_id = '7f000000-0000-4000-8000-000000000001'
      and contract_status = 'ACTIVE'
  ),
  '5f000000-0000-4000-8000-0000000000b1'::uuid,
  'stale transfer does not change current holder'
);

-- Transfer rollback: MOVED_IN without actual_move_in_date
select is(
  (
    select contract_status::text
    from public.contract
    where unit_id = '7f000000-0000-4000-8000-000000000002'
      and contract_status = 'ACTIVE'
  ),
  'ACTIVE'
);

select throws_ok(
  $$ select public.apply_move_in_import_row(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_unit_id := '7f000000-0000-4000-8000-000000000002',
       p_apply_mode := 'TRANSFER_HOLDER_AND_UPDATE_OCCUPANCY',
       p_existing_customer_id := '5f000000-0000-4000-8000-0000000000b1',
       p_expected_current_contract_id := (
         select contract_id from public.contract
         where unit_id = '7f000000-0000-4000-8000-000000000002'
           and contract_status = 'ACTIVE'
       ),
       p_move_in_status := 'MOVED_IN'
     ) $$,
  '23514'
);

select is(
  (
    select customer_id from public.contract
    where unit_id = '7f000000-0000-4000-8000-000000000002'
      and contract_status = 'ACTIVE'
  ),
  (
    select id from public.customer
    where phone_normalized = '01096000999'
      and project_id = '20000000-0000-4000-8000-000000000001'
  ),
  'failed occupancy rolls back transfer; OLD stays ACTIVE'
);

select is(
  (
    select count(*)::integer from public.contract
    where unit_id = '7f000000-0000-4000-8000-000000000002'
      and contract_status = 'CANCELLED'
  ),
  0,
  'no cancelled contract after rollback'
);

-- Occupancy create rollback of new customer: leftover occupancy unique
reset role;

insert into public.contract (
  contract_id, project_id, customer_id, unit_id, contract_status, cancellation_reason
) values (
  '6f000000-0000-4000-8000-000000000099',
  '20000000-0000-4000-8000-000000000001',
  '5f000000-0000-4000-8000-0000000000a1',
  '7f000000-0000-4000-8000-000000000004',
  'CANCELLED',
  'setup'
);

insert into public.unit_occupancy_status (
  project_id, unit_id, contract_id, updated_by
) values (
  '20000000-0000-4000-8000-000000000001',
  '7f000000-0000-4000-8000-000000000004',
  '6f000000-0000-4000-8000-000000000099',
  '40000000-0000-4000-8000-0000000000c1'
);

set local role authenticated;
select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c1');

select throws_ok(
  $$ select public.apply_move_in_import_row(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_unit_id := '7f000000-0000-4000-8000-000000000004',
       p_apply_mode := 'CREATE_CONTRACT_AND_UPDATE_OCCUPANCY',
       p_new_customer_name := 'Rollback Person',
       p_new_customer_phone_normalized := '01096000888',
       p_occupancy_intent := 'SALE'
     ) $$,
  '23505'
);

select is_empty(
  $$ select id from public.customer
     where phone_normalized = '01096000888'
       and project_id = '20000000-0000-4000-8000-000000000001' $$,
  'occupancy unique failure rolls back new customer'
);

-- Cross-project
select throws_ok(
  $$ select public.apply_move_in_import_row(
       p_project_id := '20000000-0000-4000-8000-000000000002',
       p_unit_id := '7f000000-0000-4000-8000-000000000005',
       p_apply_mode := 'CREATE_CONTRACT',
       p_existing_customer_id := '5f000000-0000-4000-8000-0000000000a1'
     ) $$,
  '42501'
);

select throws_ok(
  $$ select public.apply_move_in_import_row(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_unit_id := '7f000000-0000-4000-8000-000000000001',
       p_apply_mode := 'UPDATE_OCCUPANCY',
       p_existing_customer_id := '5f000000-0000-4000-8000-0000000000c3',
       p_expected_current_contract_id := (
         select contract_id from public.contract
         where unit_id = '7f000000-0000-4000-8000-000000000001'
           and contract_status = 'ACTIVE'
       ),
       p_occupancy_intent := 'SALE'
     ) $$,
  '23514'
);

select throws_ok(
  $$ select public.apply_move_in_import_row(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_unit_id := '7f000000-0000-4000-8000-000000000005',
       p_apply_mode := 'CREATE_CONTRACT',
       p_existing_customer_id := '5f000000-0000-4000-8000-0000000000a1'
     ) $$,
  '23514'
);

-- Other project same phone is independent (project 2 admin)
select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c2');

select lives_ok(
  $$ select public.apply_move_in_import_row(
       p_project_id := '20000000-0000-4000-8000-000000000002',
       p_unit_id := '7f000000-0000-4000-8000-000000000007',
       p_apply_mode := 'CREATE_CONTRACT',
       p_new_customer_name := 'P2 New',
       p_new_customer_phone_normalized := '01096000999'
     ) $$
);

reset role;

select is(
  (
    select count(*)::integer from public.customer
    where phone_normalized = '01096000999'
  ),
  2,
  'same phone in another project is a separate customer'
);

select is_empty(
  $$ select id from public.consultation
     where customer_id in (
       select id from public.customer where phone_normalized in ('01096000999', '01096000888')
     ) $$,
  'no consultation writes'
);

select is(
  (
    select occupancy_intent::text from public.unit_occupancy_status
    where unit_id = '7f000000-0000-4000-8000-000000000003'
  ),
  'UNDECIDED',
  'other unit occupancy unchanged'
);

select * from finish();
rollback;
