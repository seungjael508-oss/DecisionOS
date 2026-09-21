-- update_move_in_field_member_display_name RPC를 검증한다.
-- PROJECT_ADMIN만 같은 프로젝트의 active member display_name을 수정할 수 있음을 확인한다.
begin;
select no_plan();

create function pg_temp.hid(prefix text, n integer) returns uuid language sql immutable as $$ select md5('display-name-rpc-test-' || prefix || n::text)::uuid $$;

-- project_member.user_id는 auth.users FK이므로 합성 유저를 먼저 만든다.
insert into auth.users (id) values
('32000000-0000-4000-8000-000000000001'),
('32000000-0000-4000-8000-000000000002'),
('32000000-0000-4000-8000-000000000003'),
('32000000-0000-4000-8000-000000000004'),
('32000000-0000-4000-8000-000000000005');

insert into public.project(id,organization_id,name) values
('21000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Synthetic Project A'),
('21000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Synthetic Project B');

insert into public.project_member(id,project_id,user_id,role,active,display_name) values
(pg_temp.hid('admin',1),'21000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000001','PROJECT_ADMIN',true,'관리자'),
(pg_temp.hid('counselor',1),'21000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000002','COUNSELOR',true,'박진하'),
(pg_temp.hid('inactive',1),'21000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000003','COUNSELOR',false,'비활성상담사'),
(pg_temp.hid('other-admin',1),'21000000-0000-4000-8000-000000000002','32000000-0000-4000-8000-000000000004','PROJECT_ADMIN',true,'다른현장관리자'),
(pg_temp.hid('other-counselor',1),'21000000-0000-4000-8000-000000000002','32000000-0000-4000-8000-000000000005','COUNSELOR',true,'다른현장상담사');

create function pg_temp.login(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub',u,true)::void $$;

select has_function('public'::name, 'update_move_in_field_member_display_name'::name);

select ok(
  (
    select bool_and(has_function_privilege('authenticated', p.oid, 'EXECUTE'))
      and bool_and(not has_function_privilege('anon', p.oid, 'EXECUTE'))
      and bool_and(not has_function_privilege('public', p.oid, 'EXECUTE'))
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'update_move_in_field_member_display_name'
  ),
  'PUBLIC/anon EXECUTE 없음, authenticated EXECUTE'
);

select ok(
  (
    select p.prosecdef
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'update_move_in_field_member_display_name'
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
      and p.proname = 'update_move_in_field_member_display_name'
      and cfg in ('search_path=""', 'search_path=''''')
  ),
  'search_path empty'
);

-- PROJECT_ADMIN이 같은 프로젝트 counselor의 이름을 수정한다.
select pg_temp.login('32000000-0000-4000-8000-000000000001');
set local role authenticated;

select is(
  public.update_move_in_field_member_display_name(
    p_project_id := '21000000-0000-4000-8000-000000000001',
    p_member_id := pg_temp.hid('counselor',1),
    p_display_name := '박진하 팀장'
  ),
  '박진하 팀장',
  'PROJECT_ADMIN이 display_name을 수정하면 trim된 새 이름을 반환한다'
);

select is(
  (select display_name from public.project_member where id = pg_temp.hid('counselor',1)),
  '박진하 팀장',
  'DB에 새 이름이 반영된다'
);

select is(
  public.update_move_in_field_member_display_name(
    p_project_id := '21000000-0000-4000-8000-000000000001',
    p_member_id := pg_temp.hid('counselor',1),
    p_display_name := '  공백포함이름  '
  ),
  '공백포함이름',
  '앞뒤 공백은 trim된다'
);

select throws_ok(
  $$ select public.update_move_in_field_member_display_name(
       p_project_id := '21000000-0000-4000-8000-000000000001',
       p_member_id := '$$ || pg_temp.hid('counselor',1)::text || $$',
       p_display_name := '   '
     ) $$,
  '23514',
  NULL,
  '공백만 있는 이름 → 거부'
);

select throws_ok(
  $$ select public.update_move_in_field_member_display_name(
       p_project_id := '21000000-0000-4000-8000-000000000001',
       p_member_id := '$$ || pg_temp.hid('counselor',1)::text || $$',
       p_display_name := ''
     ) $$,
  '23514',
  NULL,
  '빈 문자열 → 거부'
);

select throws_ok(
  $$ select public.update_move_in_field_member_display_name(
       p_project_id := '21000000-0000-4000-8000-000000000001',
       p_member_id := '$$ || pg_temp.hid('counselor',1)::text || $$',
       p_display_name := '가'
     ) $$,
  '23514',
  NULL,
  '2자 미만 → 거부'
);

select throws_ok(
  $$ select public.update_move_in_field_member_display_name(
       p_project_id := '21000000-0000-4000-8000-000000000001',
       p_member_id := '$$ || pg_temp.hid('counselor',1)::text || $$',
       p_display_name := repeat('가', 31)
     ) $$,
  '23514',
  NULL,
  '30자 초과 → 거부'
);

select throws_ok(
  $$ select public.update_move_in_field_member_display_name(
       p_project_id := '21000000-0000-4000-8000-000000000001',
       p_member_id := '$$ || pg_temp.hid('inactive',1)::text || $$',
       p_display_name := '비활성수정시도'
     ) $$,
  '23514',
  NULL,
  '비활성 member 수정 → 거부'
);

select throws_ok(
  $$ select public.update_move_in_field_member_display_name(
       p_project_id := '21000000-0000-4000-8000-000000000001',
       p_member_id := '$$ || pg_temp.hid('other-counselor',1)::text || $$',
       p_display_name := '다른프로젝트수정시도'
     ) $$,
  '23514',
  NULL,
  '다른 project member 수정 → 거부'
);

reset role;

-- project_member_select 정책상 project A의 admin은 project B 멤버 row를 볼 수 없으므로,
-- RLS를 우회하는 postgres role에서 실제 데이터 불변만 확인한다.
select is(
  (select display_name from public.project_member where id = pg_temp.hid('other-counselor',1)),
  '다른현장상담사',
  '다른 project member 이름은 불변'
);

-- COUNSELOR는 이름을 수정할 수 없다.
select pg_temp.login('32000000-0000-4000-8000-000000000002');
set local role authenticated;

select throws_ok(
  $$ select public.update_move_in_field_member_display_name(
       p_project_id := '21000000-0000-4000-8000-000000000001',
       p_member_id := '$$ || pg_temp.hid('counselor',1)::text || $$',
       p_display_name := '셀프수정시도'
     ) $$,
  '42501',
  NULL,
  'COUNSELOR 호출 → 42501'
);

reset role;

-- 다른 프로젝트 관리자는 남의 프로젝트 member를 수정할 수 없다.
select pg_temp.login('32000000-0000-4000-8000-000000000004');
set local role authenticated;

select throws_ok(
  $$ select public.update_move_in_field_member_display_name(
       p_project_id := '21000000-0000-4000-8000-000000000001',
       p_member_id := '$$ || pg_temp.hid('counselor',1)::text || $$',
       p_display_name := '침입시도'
     ) $$,
  '42501',
  NULL,
  '다른 프로젝트 관리자가 p_project_id를 바꿔 호출 → 42501'
);

reset role;

select is(
  (select display_name from public.project_member where id = pg_temp.hid('counselor',1)),
  '공백포함이름',
  '권한 없는 시도 이후에도 최종 정상 값이 유지된다'
);

-- project_member 직접 SELECT RLS는 이번 작업으로 넓어지지 않는다.
-- 기존 project_member_select 정책상 PROJECT_ADMIN은 같은 프로젝트의 모든 멤버(admin+counselor+inactive
-- 3명)를 볼 수 있다 — 이는 이번 RPC 추가 이전부터 있던 동작이며, 여기서는 그 범위가 그대로임을 확인한다.
select pg_temp.login('32000000-0000-4000-8000-000000000001');
set local role authenticated;
select is(
  (select count(*) from public.project_member where project_id='21000000-0000-4000-8000-000000000001'),
  3::bigint,
  'project_member 직접 SELECT 범위는 기존 정책 그대로다 (RLS 미확장)'
);
reset role;

select * from finish();
rollback;
