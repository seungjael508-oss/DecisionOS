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
  ('8f000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '401', '101'),
  ('8f000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '401', '102');

select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c1');
set local role authenticated;

select lives_ok(
  $$ select public.create_contract(
       '20000000-0000-4000-8000-000000000001',
       '50000000-0000-4000-8000-0000000000a1',
       '8f000000-0000-4000-8000-000000000001'
     ) $$,
  'admin contract A'
);

select lives_ok(
  $$ select public.create_contract(
       '20000000-0000-4000-8000-000000000001',
       '50000000-0000-4000-8000-0000000000f1',
       '8f000000-0000-4000-8000-000000000002'
     ) $$,
  'admin contract F'
);

select throws_ok(
  $$ insert into public.brokerage_office (project_id, name)
     values ('20000000-0000-4000-8000-000000000001', '직접입력') $$,
  '42501',
  NULL,
  'no direct INSERT on brokerage_office'
);

select isnt(
  public.save_brokerage_office(
    p_project_id := '20000000-0000-4000-8000-000000000001',
    p_name := 'RLS업소'
  ),
  null,
  'admin creates office for RLS'
);

select isnt(
  public.save_move_in_unit_deal(
    p_project_id := '20000000-0000-4000-8000-000000000001',
    p_unit_id := '8f000000-0000-4000-8000-000000000001',
    p_contract_id := (
      select contract_id from public.contract
      where unit_id = '8f000000-0000-4000-8000-000000000001'
        and contract_status = 'ACTIVE'
    ),
    p_customer_id := '50000000-0000-4000-8000-0000000000a1',
    p_consent_status := 'NOT_CONSENTED',
    p_deal_status := 'IN_PROGRESS',
    p_sale_enabled := false,
    p_jeonse_enabled := false,
    p_monthly_rent_enabled := false
  ),
  null,
  'admin deal for counselor A customer'
);

select isnt(
  public.save_move_in_unit_deal(
    p_project_id := '20000000-0000-4000-8000-000000000001',
    p_unit_id := '8f000000-0000-4000-8000-000000000002',
    p_contract_id := (
      select contract_id from public.contract
      where unit_id = '8f000000-0000-4000-8000-000000000002'
        and contract_status = 'ACTIVE'
    ),
    p_customer_id := '50000000-0000-4000-8000-0000000000f1',
    p_consent_status := 'CONSENTED',
    p_deal_status := 'IN_PROGRESS',
    p_sale_enabled := true,
    p_jeonse_enabled := false,
    p_monthly_rent_enabled := false
  ),
  null,
  'admin deal for counselor F customer'
);

reset role;
select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c2');
set local role authenticated;

select isnt(
  public.save_brokerage_office(
    p_project_id := '20000000-0000-4000-8000-000000000002',
    p_name := '타프로젝트업소'
  ),
  null,
  'project 2 office exists for IDOR'
);

reset role;
select pg_temp.impersonate('30000000-0000-4000-8000-00000000000a');
set local role authenticated;

select is(
  (
    select count(*)::integer from public.unit_deal
    where unit_id = '8f000000-0000-4000-8000-000000000001'
  ),
  1,
  'COUNSELOR can select assigned customer deal'
);

select is(
  (
    select count(*)::integer from public.unit_deal
    where unit_id = '8f000000-0000-4000-8000-000000000002'
  ),
  0,
  'COUNSELOR cannot select other customer deal'
);

select is(
  (
    select count(*)::integer from public.brokerage_office
    where project_id = '20000000-0000-4000-8000-000000000001'
      and name = 'RLS업소'
  ),
  1,
  'COUNSELOR can select same-project offices'
);

select is(
  (
    select count(*)::integer from public.brokerage_office
    where project_id = '20000000-0000-4000-8000-000000000002'
  ),
  0,
  'COUNSELOR cannot select other project offices'
);

select finish();
rollback;
