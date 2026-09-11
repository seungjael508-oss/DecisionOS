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

select has_function('public'::name, 'create_move_in_consultation'::name);

select ok(
  (
    select bool_and(has_function_privilege('authenticated', p.oid, 'EXECUTE'))
      and bool_and(not has_function_privilege('anon', p.oid, 'EXECUTE'))
      and bool_and(not has_function_privilege('public', p.oid, 'EXECUTE'))
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'create_move_in_consultation'
  ),
  'PUBLIC/anon EXECUTE 없음, authenticated EXECUTE'
);

select ok(
  (
    select p.prosecdef
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'create_move_in_consultation'
  ),
  'SECURITY DEFINER'
);

select ok(
  exists (
    select 1
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    cross join unnest(coalesce(p.proconfig, array[]::text[])) as cfg
    where n.nspname = 'public'
      and p.proname = 'create_move_in_consultation'
      and cfg in ('search_path=""', 'search_path=''''')
  ),
  'search_path empty'
);

insert into public.project_unit (unit_id, project_id, building_no, unit_no)
values
  ('8c000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '101', '201'),
  ('8c000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '101', '202'),
  ('8c000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', '101', '203'),
  ('8c000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', '101', '204'),
  ('8c000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000001', '101', '205'),
  ('8c000000-0000-4000-8000-000000000099', '20000000-0000-4000-8000-000000000002', '101', '201');

select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c1');
set local role authenticated;

select lives_ok(
  $$ select public.create_contract(
       '20000000-0000-4000-8000-000000000001',
       '50000000-0000-4000-8000-0000000000a1',
       '8c000000-0000-4000-8000-000000000001'
     ) $$,
  'admin creates contract 201'
);

select lives_ok(
  $$ select public.create_contract(
       '20000000-0000-4000-8000-000000000001',
       '50000000-0000-4000-8000-0000000000a1',
       '8c000000-0000-4000-8000-000000000002'
     ) $$,
  'admin creates contract 202'
);

select lives_ok(
  $$ select public.create_contract(
       '20000000-0000-4000-8000-000000000001',
       '50000000-0000-4000-8000-0000000000a1',
       '8c000000-0000-4000-8000-000000000003'
     ) $$,
  'admin creates contract 203'
);

select lives_ok(
  $$ select public.create_contract(
       '20000000-0000-4000-8000-000000000001',
       '50000000-0000-4000-8000-0000000000a1',
       '8c000000-0000-4000-8000-000000000004'
     ) $$,
  'admin creates contract 204'
);

select lives_ok(
  $$ select public.create_contract(
       '20000000-0000-4000-8000-000000000001',
       '50000000-0000-4000-8000-0000000000a1',
       '8c000000-0000-4000-8000-000000000005'
     ) $$,
  'admin creates contract 205'
);

select isnt(
  public.create_move_in_consultation(
    p_project_id := '20000000-0000-4000-8000-000000000001',
    p_unit_id := '8c000000-0000-4000-8000-000000000001',
    p_customer_id := '50000000-0000-4000-8000-0000000000a1',
    p_consultation_type := 'OUTBOUND',
    p_content := '관리자 상담',
    p_legacy_grade := 'C'
  ),
  null,
  'PROJECT_ADMIN 상담 생성 성공'
);

select is(
  (
    select structured_tags ->> 'legacy_grade'
    from public.consultation
    where unit_id = '8c000000-0000-4000-8000-000000000001'
    order by consulted_at desc
    limit 1
  ),
  'C',
  'legacy_grade stored in structured_tags'
);

select pg_temp.impersonate('30000000-0000-4000-8000-00000000000a');

select isnt(
  public.create_move_in_consultation(
    p_project_id := '20000000-0000-4000-8000-000000000001',
    p_unit_id := '8c000000-0000-4000-8000-000000000002',
    p_customer_id := '50000000-0000-4000-8000-0000000000a1',
    p_consultation_type := 'INBOUND',
    p_content := '담당 상담사 상담'
  ),
  null,
  '담당 COUNSELOR 성공'
);

select pg_temp.impersonate('30000000-0000-4000-8000-00000000000f');

select throws_ok(
  $$ select public.create_move_in_consultation(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_unit_id := '8c000000-0000-4000-8000-000000000001',
       p_customer_id := '50000000-0000-4000-8000-0000000000a1',
       p_consultation_type := 'OUTBOUND',
       p_content := '타 담당 상담'
     ) $$,
  '42501',
  NULL,
  '타 담당 COUNSELOR → 42501'
);

select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c1');

select throws_ok(
  $$ select public.create_move_in_consultation(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_unit_id := '8c000000-0000-4000-8000-000000000099',
       p_customer_id := '50000000-0000-4000-8000-0000000000a1',
       p_consultation_type := 'OUTBOUND',
       p_content := '다른 프로젝트 세대'
     ) $$,
  '23514',
  NULL,
  'cross-project → 거부'
);

select throws_ok(
  $$ select public.create_move_in_consultation(
       p_project_id := '20000000-0000-4000-8000-000000000002',
       p_unit_id := '8c000000-0000-4000-8000-000000000099',
       p_customer_id := '50000000-0000-4000-8000-0000000000b1',
       p_consultation_type := 'OUTBOUND',
       p_content := 'p1 admin on p2'
     ) $$,
  '42501',
  NULL,
  'cross-project actor → 42501'
);

select throws_ok(
  $$ select public.create_move_in_consultation(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_unit_id := '8c000000-0000-4000-8000-000000000003',
       p_customer_id := '50000000-0000-4000-8000-0000000000a1',
       p_consultation_type := 'OUTBOUND',
       p_content := '   '
     ) $$,
  '23514',
  NULL,
  '빈 content → 실패'
);

select lives_ok(
  $$ select public.create_move_in_consultation(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_unit_id := '8c000000-0000-4000-8000-000000000003',
       p_customer_id := '50000000-0000-4000-8000-0000000000a1',
       p_consultation_type := 'MESSAGE',
       p_content := '다음 접촉 저장',
       p_next_contact_at := '2026-09-20T09:00:00+09:00'::timestamptz
     ) $$,
  '상담 + next_contact 성공'
);

select is(
  (
    select (next_contact_at at time zone 'Asia/Seoul')::date::text
    from public.unit_occupancy_status
    where unit_id = '8c000000-0000-4000-8000-000000000003'
  ),
  '2026-09-20',
  'occupancy next_contact_at saved'
);

select is(
  (
    select (next_action_at at time zone 'Asia/Seoul')::date::text
    from public.consultation
    where unit_id = '8c000000-0000-4000-8000-000000000003'
    order by consulted_at desc
    limit 1
  ),
  '2026-09-20',
  'consultation next_action_at saved'
);

select lives_ok(
  $$ select public.create_move_in_consultation(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_unit_id := '8c000000-0000-4000-8000-000000000004',
       p_customer_id := '50000000-0000-4000-8000-0000000000a1',
       p_consultation_type := 'VISIT',
       p_content := '3축 변경',
       p_occupancy_intent := 'SALE',
       p_funding_status := 'FUNDING_SHORTAGE',
       p_move_in_status := 'CONTACTED',
       p_reason := '상담 저장'
     ) $$,
  '상담 + 3축 상태 성공'
);

select is(
  (
    select occupancy_intent::text
    from public.unit_occupancy_status
    where unit_id = '8c000000-0000-4000-8000-000000000004'
  ),
  'SALE'
);

select is(
  (
    select count(*)::integer
    from public.contract_status_history
    where unit_id = '8c000000-0000-4000-8000-000000000004'
      and field_changed in ('occupancy_intent', 'funding_status', 'move_in_status')
  ),
  3,
  '3축 변경 history 생성'
);

select is(
  (
    select count(*)::integer
    from public.consultation
    where unit_id = '8c000000-0000-4000-8000-000000000005'
  ),
  0
);

select throws_ok(
  $$ select public.create_move_in_consultation(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_unit_id := '8c000000-0000-4000-8000-000000000005',
       p_customer_id := '50000000-0000-4000-8000-0000000000a1',
       p_consultation_type := 'OUTBOUND',
       p_content := '입주완료 날짜 없음',
       p_move_in_status := 'MOVED_IN'
     ) $$,
  '23514',
  NULL,
  'occupancy validation 실패'
);

select is(
  (
    select count(*)::integer
    from public.consultation
    where unit_id = '8c000000-0000-4000-8000-000000000005'
  ),
  0,
  'occupancy validation 실패 → consultation rollback'
);

select is(
  (
    select move_in_status::text
    from public.unit_occupancy_status
    where unit_id = '8c000000-0000-4000-8000-000000000005'
  ),
  'NOT_CONTACTED',
  'occupancy unchanged after rollback'
);

select finish();

rollback;
