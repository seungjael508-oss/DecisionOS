-- pgTAP 고정 픽스처(비식별). supabase/tests/database/*.test.sql 이 가정하는 최소 데이터·역할.
-- 운영 스키마 덤프에 적용할 때는 덤프의 NOT NULL·FK·CHECK 에 맞게 컬럼을 보강한다(아래 '운영 덤프 적용 시' 참고).
--
-- 테스트가 요구하는 것
--  역할   : authenticated(테스트가 set local role authenticated), anon(마이그레이션 revoke 대상)
--  인증   : auth.uid() 가 request.jwt.claim.sub 를 읽음(Supabase 동일). 사용자 30000000-…-0000000000c1
--  프로젝트: 20000000-0000-4000-8000-000000000001
--  멤버   : 40000000-0000-4000-8000-0000000000c1 (PROJECT_ADMIN, 위 사용자)  ← create_contract·D 저장에 관리자 필요
--  고객   : 50000000-0000-4000-8000-0000000000a1 (프로젝트 소속)
--  함수   : public.create_contract(project, customer, unit) — 계약 + 점유상태 생성(운영 RPC 사용, 스텁 모드만 대체 정의)
--  세대   : 각 테스트가 직접 project_unit 을 넣는다(8f000000-…)
--
-- 운영 덤프 적용 시: auth 스키마가 덤프에 없으면 auth.users·auth.uid() 최소 정의를 먼저 만든다,
-- project_member.user_id 가 auth.users 를 참조하면 사용자 행을 먼저 넣는다, create_contract 는 운영 정의를 그대로 쓴다.
do $fixture$
begin
  if to_regclass('auth.users') is not null then
    execute $q$insert into auth.users(id) values ('30000000-0000-4000-8000-0000000000c1') on conflict do nothing$q$;
  end if;
end
$fixture$;
-- 운영 스키마: project.organization_id, customer.phone·phone_raw 가 NOT NULL 이므로 컬럼이 있을 때만 비식별 값으로 채운다
do $base$
begin
  if to_regclass('public.organization') is not null then
    insert into public.organization(id, name) values ('10000000-0000-4000-8000-0000000000f1', 'pgtap-fixture') on conflict do nothing;
    insert into public.project(id, organization_id, name)
      values ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-0000000000f1', 'pgtap-fixture') on conflict do nothing;
  else
    insert into public.project(id, name) values ('20000000-0000-4000-8000-000000000001', 'pgtap-fixture') on conflict do nothing;
  end if;
end
$base$;
insert into public.project_member(id, project_id, user_id, role, active)
  values ('40000000-0000-4000-8000-0000000000c1', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-0000000000c1', 'PROJECT_ADMIN', true)
  on conflict do nothing;
do $cust$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'customer' and column_name = 'phone_raw') then
    insert into public.customer(id, project_id, name, phone, phone_raw)
      values ('50000000-0000-4000-8000-0000000000a1', '20000000-0000-4000-8000-000000000001', 'pgtap-fixture', '010-0000-0000', '010-0000-0000'),
             -- 이전 계약자(…f1). 운영 consultation(customer_id, project_id) FK 충족용
             ('50000000-0000-4000-8000-0000000000f1', '20000000-0000-4000-8000-000000000001', 'pgtap-previous', '010-0000-0001', '010-0000-0001')
      on conflict do nothing;
  else
    insert into public.customer(id, project_id, name)
      values ('50000000-0000-4000-8000-0000000000a1', '20000000-0000-4000-8000-000000000001', 'pgtap-fixture'),
             ('50000000-0000-4000-8000-0000000000f1', '20000000-0000-4000-8000-000000000001', 'pgtap-previous')
      on conflict do nothing;
  end if;
end
$cust$;

-- 스텁 스키마 전용: 운영 create_contract 대체(운영 덤프에는 이미 있으므로 정의가 없을 때만 만든다)
do $contract$
begin
  if not exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname = 'create_contract') then
    execute $f$
      create function public.create_contract(p_project_id uuid, p_customer_id uuid, p_unit_id uuid) returns uuid
      language plpgsql security definer set search_path to '' as $b$
      declare v uuid; begin
        perform private.require_project_admin(p_project_id, private.write_rpc_actor(p_project_id));
        insert into public.contract(project_id, unit_id, customer_id) values (p_project_id, p_unit_id, p_customer_id) returning contract_id into v;
        insert into public.unit_occupancy_status(project_id, unit_id, contract_id) values (p_project_id, p_unit_id, v);
        return v; end $b$;
      grant execute on function public.create_contract(uuid,uuid,uuid) to authenticated;
    $f$;
  end if;
end
$contract$;
