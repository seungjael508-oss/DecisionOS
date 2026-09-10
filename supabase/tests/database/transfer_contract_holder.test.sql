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
  ('7d000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '831', '101'),
  ('7d000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '831', '102');

insert into public.customer (
  id, project_id, name, phone, phone_normalized, assigned_counselor_id
) values
  (
    '5d000000-0000-4000-8000-0000000000a1',
    '20000000-0000-4000-8000-000000000001',
    'Transfer A',
    '01095000001',
    '01095000001',
    '40000000-0000-4000-8000-00000000000a'
  ),
  (
    '5d000000-0000-4000-8000-0000000000f1',
    '20000000-0000-4000-8000-000000000001',
    'Transfer F',
    '01095000002',
    '01095000002',
    '40000000-0000-4000-8000-00000000000f'
  ),
  (
    '5d000000-0000-4000-8000-0000000000b1',
    '20000000-0000-4000-8000-000000000002',
    'Transfer B',
    '01095000003',
    '01095000003',
    '40000000-0000-4000-8000-00000000000b'
  );

insert into public.subscription (
  subscription_id, project_id, customer_id, subscription_round
) values (
  '8d000000-0000-4000-8000-0000000000a1',
  '20000000-0000-4000-8000-000000000001',
  '5d000000-0000-4000-8000-0000000000a1',
  '1'
);

set local role authenticated;
select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c1');

select lives_ok(
  $$ select public.create_contract(
       '20000000-0000-4000-8000-000000000001',
       '5d000000-0000-4000-8000-0000000000a1',
       '7d000000-0000-4000-8000-000000000001',
       '8d000000-0000-4000-8000-0000000000a1'
     ) $$,
  'create_contract with subscription'
);

select lives_ok(
  $$ select public.update_unit_occupancy_status(
       '20000000-0000-4000-8000-000000000001',
       '7d000000-0000-4000-8000-000000000001',
       (select contract_id from public.contract
        where unit_id = '7d000000-0000-4000-8000-000000000001'
          and contract_status = 'ACTIVE'),
       'SELF_MOVE_IN',
       'LOAN_NEEDED',
       'PLANNED',
       '2026-11-01',
       '2026-10-01 00:00:00+00',
       '2026-12-01 00:00:00+00'
     ) $$,
  'seed occupancy axes and dates before transfer'
);

create temporary table xfer_before as
select
  c.contract_id as old_contract_id,
  c.customer_id as old_customer_id,
  c.subscription_id as old_subscription_id,
  u.occupancy_status_id,
  u.occupancy_intent,
  u.funding_status,
  u.move_in_status,
  u.planned_move_in_date,
  u.balance_paid_at,
  u.actual_move_in_date
from public.contract as c
join public.unit_occupancy_status as u
  on u.contract_id = c.contract_id
where c.unit_id = '7d000000-0000-4000-8000-000000000001'
  and c.contract_status = 'ACTIVE';

select is(
  (select count(*)::integer from public.unit_occupancy_status
   where unit_id = '7d000000-0000-4000-8000-000000000001'),
  1,
  'occupancy row count is 1 before transfer'
);

select is(
  (
    select count(*)::integer from public.contract_status_history
    where contract_id = (select old_contract_id from xfer_before)
  ),
  3,
  'history exists on old contract before transfer'
);

select lives_ok(
  $$ select public.transfer_contract_holder(
       '20000000-0000-4000-8000-000000000001',
       (select old_contract_id from xfer_before),
       '5d000000-0000-4000-8000-0000000000f1'
     ) $$,
  'transfer_contract_holder succeeds'
);

select isnt_empty(
  $$ select contract_id from public.contract
     where contract_id = (select old_contract_id from xfer_before) $$,
  'old contract row exists'
);

select is(
  (select customer_id from public.contract
   where contract_id = (select old_contract_id from xfer_before)),
  (select old_customer_id from xfer_before),
  'old customer_id unchanged'
);

select is(
  (select contract_status::text from public.contract
   where contract_id = (select old_contract_id from xfer_before)),
  'CANCELLED',
  'old status CANCELLED'
);

select is(
  (select cancellation_reason from public.contract
   where contract_id = (select old_contract_id from xfer_before)),
  'HOLDER_CHANGED',
  'old cancellation_reason HOLDER_CHANGED'
);

select isnt(
  (select contract_id from public.contract
   where unit_id = '7d000000-0000-4000-8000-000000000001'
     and contract_status = 'ACTIVE'),
  (select old_contract_id from xfer_before),
  'new contract_id differs'
);

select is(
  (select customer_id from public.contract
   where unit_id = '7d000000-0000-4000-8000-000000000001'
     and contract_status = 'ACTIVE'),
  '5d000000-0000-4000-8000-0000000000f1'::uuid,
  'new customer_id is transfer target'
);

select is(
  (select contract_status::text from public.contract
   where unit_id = '7d000000-0000-4000-8000-000000000001'
     and contract_status = 'ACTIVE'),
  'ACTIVE',
  'new contract is ACTIVE'
);

select is(
  (select previous_contract_id from public.contract
   where unit_id = '7d000000-0000-4000-8000-000000000001'
     and contract_status = 'ACTIVE'),
  (select old_contract_id from xfer_before),
  'new previous_contract_id is old contract'
);

select is(
  (select count(*)::integer from public.unit_occupancy_status
   where unit_id = '7d000000-0000-4000-8000-000000000001'),
  1,
  'occupancy row count is still 1'
);

select is(
  (select contract_id from public.unit_occupancy_status
   where unit_id = '7d000000-0000-4000-8000-000000000001'),
  (select contract_id from public.contract
   where unit_id = '7d000000-0000-4000-8000-000000000001'
     and contract_status = 'ACTIVE'),
  'occupancy.contract_id is the new contract'
);

select is(
  (select occupancy_intent::text from public.unit_occupancy_status
   where unit_id = '7d000000-0000-4000-8000-000000000001'),
  (select occupancy_intent::text from xfer_before),
  'occupancy_intent preserved'
);

select is(
  (select funding_status::text from public.unit_occupancy_status
   where unit_id = '7d000000-0000-4000-8000-000000000001'),
  (select funding_status::text from xfer_before),
  'funding_status preserved'
);

select is(
  (select move_in_status::text from public.unit_occupancy_status
   where unit_id = '7d000000-0000-4000-8000-000000000001'),
  (select move_in_status::text from xfer_before),
  'move_in_status preserved'
);

select is(
  (select planned_move_in_date from public.unit_occupancy_status
   where unit_id = '7d000000-0000-4000-8000-000000000001'),
  (select planned_move_in_date from xfer_before),
  'planned_move_in_date preserved'
);

select is(
  (select balance_paid_at from public.unit_occupancy_status
   where unit_id = '7d000000-0000-4000-8000-000000000001'),
  (select balance_paid_at from xfer_before),
  'balance_paid_at preserved'
);

select is(
  (select actual_move_in_date from public.unit_occupancy_status
   where unit_id = '7d000000-0000-4000-8000-000000000001'),
  (select actual_move_in_date from xfer_before),
  'actual_move_in_date preserved'
);

select is(
  (select count(*)::integer from public.contract_status_history
   where contract_id = (select old_contract_id from xfer_before)),
  3,
  'old contract history row count preserved'
);

select lives_ok(
  $$ select public.update_unit_occupancy_status(
       '20000000-0000-4000-8000-000000000001',
       '7d000000-0000-4000-8000-000000000001',
       (select contract_id from public.contract
        where unit_id = '7d000000-0000-4000-8000-000000000001'
          and contract_status = 'ACTIVE'),
       'SALE'
     ) $$,
  'post-transfer occupancy update'
);

select isnt_empty(
  $$ select history_id from public.contract_status_history
     where contract_id = (
       select contract_id from public.contract
       where unit_id = '7d000000-0000-4000-8000-000000000001'
         and contract_status = 'ACTIVE'
     )
       and field_changed = 'occupancy_intent'
       and new_value = 'SALE' $$,
  'new history uses new contract_id'
);

select is(
  (select subscription_id from public.contract
   where contract_id = (select old_contract_id from xfer_before)),
  (select old_subscription_id from xfer_before),
  'old contract keeps subscription_id'
);

select is(
  (select subscription_id from public.contract
   where unit_id = '7d000000-0000-4000-8000-000000000001'
     and contract_status = 'ACTIVE'),
  null,
  'new transferred contract subscription_id is NULL'
);

-- rollback fixture
select lives_ok(
  $$ select public.create_contract(
       '20000000-0000-4000-8000-000000000001',
       '5d000000-0000-4000-8000-0000000000a1',
       '7d000000-0000-4000-8000-000000000002'
     ) $$,
  'second contract for rollback test'
);

create temporary table xfer_rb as
select contract_id, customer_id
from public.contract
where unit_id = '7d000000-0000-4000-8000-000000000002'
  and contract_status = 'ACTIVE';

select throws_ok(
  $$ select public.transfer_contract_holder(
       '20000000-0000-4000-8000-000000000001',
       (select contract_id from xfer_rb),
       '5d000000-0000-4000-8000-0000000000b1'
     ) $$,
  '23514'
);

select is(
  (select contract_status::text from public.contract
   where contract_id = (select contract_id from xfer_rb)),
  'ACTIVE',
  'rollback keeps old contract ACTIVE'
);

select is(
  (select customer_id from public.contract
   where contract_id = (select contract_id from xfer_rb)),
  (select customer_id from xfer_rb),
  'rollback keeps old customer'
);

select is(
  (
    select count(*)::integer from public.contract
    where unit_id = '7d000000-0000-4000-8000-000000000002'
  ),
  1,
  'rollback does not insert a new contract'
);

select is(
  (select contract_id from public.unit_occupancy_status
   where unit_id = '7d000000-0000-4000-8000-000000000002'),
  (select contract_id from xfer_rb),
  'rollback keeps occupancy on old contract'
);

reset role;

select * from finish();
rollback;
