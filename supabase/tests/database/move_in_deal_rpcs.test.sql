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

create table pg_temp.ctx (k text primary key, v uuid);
grant all on table pg_temp.ctx to authenticated;

select has_function('public'::name, 'save_move_in_unit_deal'::name);
select has_function('public'::name, 'save_brokerage_office'::name);

select ok(
  (
    select bool_and(has_function_privilege('authenticated', p.oid, 'EXECUTE'))
      and bool_and(not has_function_privilege('anon', p.oid, 'EXECUTE'))
      and bool_and(not has_function_privilege('public', p.oid, 'EXECUTE'))
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('save_move_in_unit_deal', 'save_brokerage_office')
  ),
  'PUBLIC/anon EXECUTE 없음, authenticated EXECUTE'
);

select ok(
  (
    select bool_and(p.prosecdef)
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('save_move_in_unit_deal', 'save_brokerage_office')
  ),
  'SECURITY DEFINER'
);

select ok(
  (
    select bool_and(exists (
      select 1
      from unnest(coalesce(p.proconfig, array[]::text[])) as cfg
      where cfg in ('search_path=""', 'search_path=''''')
    ))
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('save_move_in_unit_deal', 'save_brokerage_office')
  ),
  'search_path empty'
);

insert into public.project_unit (unit_id, project_id, building_no, unit_no)
values
  ('8e000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '301', '101'),
  ('8e000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '301', '102'),
  ('8e000000-0000-4000-8000-000000000099', '20000000-0000-4000-8000-000000000002', '301', '101');

select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c1');
set local role authenticated;

insert into pg_temp.ctx (k, v)
select 'contract_a', public.create_contract(
  '20000000-0000-4000-8000-000000000001',
  '50000000-0000-4000-8000-0000000000a1',
  '8e000000-0000-4000-8000-000000000001'
);

insert into pg_temp.ctx (k, v)
select 'contract_f', public.create_contract(
  '20000000-0000-4000-8000-000000000001',
  '50000000-0000-4000-8000-0000000000f1',
  '8e000000-0000-4000-8000-000000000002'
);

reset role;
select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c2');
set local role authenticated;

insert into pg_temp.ctx (k, v)
select 'contract_b', public.create_contract(
  '20000000-0000-4000-8000-000000000002',
  '50000000-0000-4000-8000-0000000000b1',
  '8e000000-0000-4000-8000-000000000099'
);

reset role;
select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c1');
set local role authenticated;

insert into pg_temp.ctx (k, v)
select 'office_a', public.save_brokerage_office(
  p_project_id := '20000000-0000-4000-8000-000000000001',
  p_name := '익명공인',
  p_address := '익명시',
  p_main_phone := '0211111111',
  p_contacts := jsonb_build_array(
    jsonb_build_object('role', 'REP', 'name', '대표A', 'phone', '01000001111'),
    jsonb_build_object('role', 'MANAGER1', 'name', '실장A', 'phone', '01000001112')
  )
);

select isnt((select v from pg_temp.ctx where k = 'office_a'), null, 'PROJECT_ADMIN create office');

select lives_ok(
  $$ select public.save_brokerage_office(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_office_id := (select v from pg_temp.ctx where k = 'office_a'),
       p_name := '익명공인',
       p_address := '익명시 수정',
       p_contacts := jsonb_build_array(
         jsonb_build_object('role', 'REP', 'name', '대표A2', 'phone', '01000001111'),
         jsonb_build_object('role', 'MANAGER1', 'name', '실장A', 'phone', '01000001112'),
         jsonb_build_object('role', 'MANAGER2', 'name', '실장B', 'phone', '01000001113')
       )
     ) $$,
  'PROJECT_ADMIN update office + contacts'
);

select is(
  (
    select name from public.brokerage_contact
    where brokerage_office_id = (select v from pg_temp.ctx where k = 'office_a')
      and role = 'REP'
  ),
  '대표A2',
  'contacts update'
);

insert into pg_temp.ctx (k, v)
select 'contact_mgr2', id
from public.brokerage_contact
where brokerage_office_id = (select v from pg_temp.ctx where k = 'office_a')
  and role = 'MANAGER2';

insert into pg_temp.ctx (k, v)
select 'office_inactive', public.save_brokerage_office(
  p_project_id := '20000000-0000-4000-8000-000000000001',
  p_name := '비활성업소',
  p_active := false,
  p_contacts := jsonb_build_array(
    jsonb_build_object('role', 'REP', 'name', '비활성대표', 'phone', '01000002222')
  )
);

reset role;
select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c2');
set local role authenticated;

insert into pg_temp.ctx (k, v)
select 'office_b', public.save_brokerage_office(
  p_project_id := '20000000-0000-4000-8000-000000000002',
  p_name := '프로젝트2업소',
  p_contacts := '[]'::jsonb
);

select throws_ok(
  $$ select public.save_brokerage_office(
       p_project_id := '20000000-0000-4000-8000-000000000002',
       p_office_id := (select v from pg_temp.ctx where k = 'office_a'),
       p_name := '가로채기'
     ) $$,
  '23514',
  NULL,
  'cross-project office update 차단'
);

reset role;
select pg_temp.impersonate('30000000-0000-4000-8000-00000000000a');
set local role authenticated;

select throws_ok(
  $$ select public.save_brokerage_office(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_name := '상담사업소'
     ) $$,
  '42501',
  NULL,
  'COUNSELOR brokerage save → 42501'
);

reset role;
select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c1');
set local role authenticated;

select throws_ok(
  $$ select public.save_brokerage_office(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_name := '   '
     ) $$,
  '23514',
  NULL,
  '빈 name 차단'
);

insert into pg_temp.ctx (k, v)
select 'deal_a', public.save_move_in_unit_deal(
  p_project_id := '20000000-0000-4000-8000-000000000001',
  p_unit_id := '8e000000-0000-4000-8000-000000000001',
  p_contract_id := (select v from pg_temp.ctx where k = 'contract_a'),
  p_customer_id := '50000000-0000-4000-8000-0000000000a1',
  p_consent_status := 'CONSENTED',
  p_deal_status := 'IN_PROGRESS',
  p_sale_enabled := true,
  p_jeonse_enabled := false,
  p_monthly_rent_enabled := false,
  p_sale_note := '매매 비고',
  p_details := '세부',
  p_brokerages := jsonb_build_array(
    jsonb_build_object(
      'brokerage_office_id', (select v from pg_temp.ctx where k = 'office_a'),
      'brokerage_contact_id', (
        select id from public.brokerage_contact
        where brokerage_office_id = (select v from pg_temp.ctx where k = 'office_a')
          and role = 'REP'
      )
    )
  )
);

select isnt((select v from pg_temp.ctx where k = 'deal_a'), null, 'PROJECT_ADMIN 저장 성공');

select is(
  (
    select occupancy_intent::text
    from public.unit_occupancy_status
    where unit_id = '8e000000-0000-4000-8000-000000000001'
  ),
  'UNDECIDED',
  'deal save does not change occupancy_intent'
);

reset role;
select pg_temp.impersonate('30000000-0000-4000-8000-00000000000a');
set local role authenticated;

select isnt(
  public.save_move_in_unit_deal(
    p_project_id := '20000000-0000-4000-8000-000000000001',
    p_unit_id := '8e000000-0000-4000-8000-000000000001',
    p_contract_id := (select v from pg_temp.ctx where k = 'contract_a'),
    p_customer_id := '50000000-0000-4000-8000-0000000000a1',
    p_consent_status := 'NOT_CONSENTED',
    p_deal_status := 'IN_PROGRESS',
    p_sale_enabled := false,
    p_jeonse_enabled := false,
    p_monthly_rent_enabled := false,
    p_brokerages := '[]'::jsonb
  ),
  null,
  '담당 COUNSELOR 저장 성공'
);

select is(
  (
    select count(*)::integer
    from public.unit_deal_brokerage
    where unit_deal_id = (select v from pg_temp.ctx where k = 'deal_a')
  ),
  0,
  'N:M replace 성공'
);

select throws_ok(
  $$ select public.save_move_in_unit_deal(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_unit_id := '8e000000-0000-4000-8000-000000000002',
       p_contract_id := (select v from pg_temp.ctx where k = 'contract_f'),
       p_customer_id := '50000000-0000-4000-8000-0000000000f1',
       p_consent_status := 'NOT_CONSENTED',
       p_deal_status := 'IN_PROGRESS',
       p_sale_enabled := false,
       p_jeonse_enabled := false,
       p_monthly_rent_enabled := false,
       p_brokerages := '[]'::jsonb
     ) $$,
  '42501',
  NULL,
  '타 담당 COUNSELOR 42501'
);

reset role;
select pg_temp.impersonate('30000000-0000-4000-8000-00000000000b');
set local role authenticated;

select throws_ok(
  $$ select public.save_move_in_unit_deal(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_unit_id := '8e000000-0000-4000-8000-000000000001',
       p_contract_id := (select v from pg_temp.ctx where k = 'contract_a'),
       p_customer_id := '50000000-0000-4000-8000-0000000000a1',
       p_consent_status := 'NOT_CONSENTED',
       p_deal_status := 'IN_PROGRESS',
       p_sale_enabled := false,
       p_jeonse_enabled := false,
       p_monthly_rent_enabled := false,
       p_brokerages := '[]'::jsonb
     ) $$,
  '42501',
  NULL,
  'cross-project actor 차단'
);

reset role;
select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c1');
set local role authenticated;

select throws_ok(
  $$ select public.save_move_in_unit_deal(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_unit_id := '8e000000-0000-4000-8000-000000000099',
       p_contract_id := (select v from pg_temp.ctx where k = 'contract_b'),
       p_customer_id := '50000000-0000-4000-8000-0000000000b1',
       p_consent_status := 'NOT_CONSENTED',
       p_deal_status := 'IN_PROGRESS',
       p_sale_enabled := false,
       p_jeonse_enabled := false,
       p_monthly_rent_enabled := false,
       p_brokerages := '[]'::jsonb
     ) $$,
  '23514',
  NULL,
  'cross-project unit 차단'
);

select throws_ok(
  $$ select public.save_move_in_unit_deal(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_unit_id := '8e000000-0000-4000-8000-000000000001',
       p_contract_id := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
       p_customer_id := '50000000-0000-4000-8000-0000000000a1',
       p_consent_status := 'NOT_CONSENTED',
       p_deal_status := 'IN_PROGRESS',
       p_sale_enabled := false,
       p_jeonse_enabled := false,
       p_monthly_rent_enabled := false,
       p_brokerages := '[]'::jsonb
     ) $$,
  '23514',
  NULL,
  'stale contract 차단'
);

select throws_ok(
  $$ select public.save_move_in_unit_deal(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_unit_id := '8e000000-0000-4000-8000-000000000001',
       p_contract_id := (select v from pg_temp.ctx where k = 'contract_a'),
       p_customer_id := '50000000-0000-4000-8000-0000000000f1',
       p_consent_status := 'NOT_CONSENTED',
       p_deal_status := 'IN_PROGRESS',
       p_sale_enabled := false,
       p_jeonse_enabled := false,
       p_monthly_rent_enabled := false,
       p_brokerages := '[]'::jsonb
     ) $$,
  '23514',
  NULL,
  'wrong customer 차단'
);

select throws_ok(
  $$ select public.save_move_in_unit_deal(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_unit_id := '8e000000-0000-4000-8000-000000000001',
       p_contract_id := (select v from pg_temp.ctx where k = 'contract_a'),
       p_customer_id := '50000000-0000-4000-8000-0000000000a1',
       p_consent_status := 'CONSENTED',
       p_deal_status := 'IN_PROGRESS',
       p_sale_enabled := true,
       p_jeonse_enabled := false,
       p_monthly_rent_enabled := false,
       p_brokerages := jsonb_build_array(
         jsonb_build_object(
           'brokerage_office_id', (select v from pg_temp.ctx where k = 'office_b')
         )
       )
     ) $$,
  '23514',
  NULL,
  'brokerage cross-project 차단'
);

select is(
  (
    select consent_status from public.unit_deal
    where id = (select v from pg_temp.ctx where k = 'deal_a')
  ),
  'NOT_CONSENTED',
  'validation 실패 시 deal rollback'
);

select is(
  (
    select count(*)::integer from public.unit_deal_brokerage
    where unit_deal_id = (select v from pg_temp.ctx where k = 'deal_a')
  ),
  0,
  'validation 실패 시 brokerage relation rollback'
);

select throws_ok(
  $$ select public.save_move_in_unit_deal(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_unit_id := '8e000000-0000-4000-8000-000000000001',
       p_contract_id := (select v from pg_temp.ctx where k = 'contract_a'),
       p_customer_id := '50000000-0000-4000-8000-0000000000a1',
       p_consent_status := 'CONSENTED',
       p_deal_status := 'IN_PROGRESS',
       p_sale_enabled := true,
       p_jeonse_enabled := false,
       p_monthly_rent_enabled := false,
       p_brokerages := jsonb_build_array(
         jsonb_build_object(
           'brokerage_office_id', (select v from pg_temp.ctx where k = 'office_inactive')
         )
       )
     ) $$,
  '23514',
  NULL,
  'inactive brokerage 차단'
);

select throws_ok(
  $$ select public.save_move_in_unit_deal(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_unit_id := '8e000000-0000-4000-8000-000000000001',
       p_contract_id := (select v from pg_temp.ctx where k = 'contract_a'),
       p_customer_id := '50000000-0000-4000-8000-0000000000a1',
       p_consent_status := 'CONSENTED',
       p_deal_status := 'IN_PROGRESS',
       p_sale_enabled := true,
       p_jeonse_enabled := false,
       p_monthly_rent_enabled := false,
       p_brokerages := jsonb_build_array(
         jsonb_build_object(
           'brokerage_office_id', (select v from pg_temp.ctx where k = 'office_a'),
           'brokerage_contact_id', (
             select id from public.brokerage_contact
             where brokerage_office_id = (select v from pg_temp.ctx where k = 'office_inactive')
               and role = 'REP'
           )
         )
       )
     ) $$,
  '23514',
  NULL,
  'contact wrong office 차단'
);

select lives_ok(
  $$ select public.save_brokerage_office(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_office_id := (select v from pg_temp.ctx where k = 'office_a'),
       p_name := '익명공인',
       p_contacts := jsonb_build_array(
         jsonb_build_object('role', 'REP', 'name', '대표A2', 'phone', '01000001111'),
         jsonb_build_object('role', 'MANAGER1', 'name', '실장A', 'phone', '01000001112')
       )
     ) $$,
  'omit MANAGER2 to inactivate contact'
);

select throws_ok(
  $$ select public.save_move_in_unit_deal(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_unit_id := '8e000000-0000-4000-8000-000000000001',
       p_contract_id := (select v from pg_temp.ctx where k = 'contract_a'),
       p_customer_id := '50000000-0000-4000-8000-0000000000a1',
       p_consent_status := 'CONSENTED',
       p_deal_status := 'IN_PROGRESS',
       p_sale_enabled := true,
       p_jeonse_enabled := false,
       p_monthly_rent_enabled := false,
       p_brokerages := jsonb_build_array(
         jsonb_build_object(
           'brokerage_office_id', (select v from pg_temp.ctx where k = 'office_a'),
           'brokerage_contact_id', (select v from pg_temp.ctx where k = 'contact_mgr2')
         )
       )
     ) $$,
  '23514',
  NULL,
  'inactive contact 차단'
);

select finish();
rollback;
