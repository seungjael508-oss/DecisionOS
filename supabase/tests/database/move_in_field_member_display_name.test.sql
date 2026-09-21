-- project_member.display_name 컬럼과 list_move_in_field_members RPC를 검증한다.
-- 화양 3인 합성 데이터로 이름 조회, 타 프로젝트 차단, 비활성/비멤버 차단을 확인한다.
begin;
select no_plan();

create function pg_temp.hid(prefix text, n integer) returns uuid language sql immutable as $$ select md5('field-name-test-' || prefix || n::text)::uuid $$;

-- project_member.user_id는 auth.users FK이므로 합성 유저를 먼저 만든다.
insert into auth.users (id) values
('31000000-0000-4000-8000-000000000001'),
('31000000-0000-4000-8000-000000000002'),
('31000000-0000-4000-8000-000000000003'),
('31000000-0000-4000-8000-000000000004'),
('31000000-0000-4000-8000-000000000005'),
('31000000-0000-4000-8000-000000000006');

-- 화양 프로젝트: 이승재/송용석/박진하 + 비활성 멤버
insert into public.project(id,organization_id,name) values ('1283e198-5043-4027-96d6-edcc7a6686c6','10000000-0000-4000-8000-000000000001','Synthetic Hwayang Names');
insert into public.project_member(id,project_id,user_id,role,active,display_name) values
(pg_temp.hid('member',1),'1283e198-5043-4027-96d6-edcc7a6686c6','31000000-0000-4000-8000-000000000001','COUNSELOR',true,'이승재'),
(pg_temp.hid('member',2),'1283e198-5043-4027-96d6-edcc7a6686c6','31000000-0000-4000-8000-000000000002','COUNSELOR',true,'송용석'),
(pg_temp.hid('member',3),'1283e198-5043-4027-96d6-edcc7a6686c6','31000000-0000-4000-8000-000000000003','COUNSELOR',true,'박진하'),
(pg_temp.hid('member',4),'1283e198-5043-4027-96d6-edcc7a6686c6','31000000-0000-4000-8000-000000000004','COUNSELOR',false,'비활성상담사');

-- 다른 프로젝트: 이름이 있어도 화양이 아니므로 절대 반환되면 안 된다.
insert into public.project(id,organization_id,name) values ('20000000-0000-4000-8000-000000000009','10000000-0000-4000-8000-000000000001','Synthetic Other Project');
insert into public.project_member(id,project_id,user_id,role,active,display_name) values
(pg_temp.hid('other',1),'20000000-0000-4000-8000-000000000009','31000000-0000-4000-8000-000000000005','PROJECT_ADMIN',true,'다른프로젝트관리자');

-- 화양 비멤버(다른 프로젝트에만 소속)
insert into public.project_member(id,project_id,user_id,role,active) values
(pg_temp.hid('outsider',1),'20000000-0000-4000-8000-000000000009','31000000-0000-4000-8000-000000000006','COUNSELOR',true);

create function pg_temp.login(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub',u,true)::void $$;

-- 컬럼 존재 및 nullable 확인
select has_column('public','project_member','display_name','project_member.display_name 컬럼이 존재해야 한다');
select col_is_null('public','project_member','display_name','display_name은 nullable이어야 한다 (다른 프로젝트는 null 허용)');

-- 이승재로 로그인: 화양 3인 이름을 모두 조회할 수 있어야 하고, 비활성 멤버는 제외
select pg_temp.login('31000000-0000-4000-8000-000000000001');
set local role authenticated;
select is(
  (select count(*) from public.list_move_in_field_members('1283e198-5043-4027-96d6-edcc7a6686c6')),
  3::bigint,
  '화양 상담사: 활성 3명만 반환'
);
select is(
  (select array_agg(display_name order by display_name) from public.list_move_in_field_members('1283e198-5043-4027-96d6-edcc7a6686c6')),
  array['박진하','송용석','이승재'],
  '화양 상담사: 세 사람 표시 이름이 정확히 반환된다'
);
select is(
  (select count(*) from public.list_move_in_field_members('20000000-0000-4000-8000-000000000009')),
  0::bigint,
  '화양이 아닌 project_id를 넘기면 화양 멤버로도 빈 결과 (다른 프로젝트 정보 조회 금지)'
);
-- RPC가 반환하는 컬럼은 member_id/display_name 뿐이며 user_id/email 등은 구조적으로 노출되지 않는다.
select function_returns('public','list_move_in_field_members',array['uuid'],'setof record','list_move_in_field_members(uuid) 함수가 존재한다');
select is(
  (select array_agg(p.parameter_name::text order by p.ordinal_position)
     from information_schema.routines r
     join information_schema.parameters p on p.specific_name = r.specific_name and p.specific_schema = r.specific_schema
   where r.routine_schema='public' and r.routine_name='list_move_in_field_members' and p.parameter_mode <> 'IN'),
  array['member_id','display_name'],
  'RPC는 member_id, display_name 두 컬럼만 반환한다 (user_id/email 노출 없음)'
);
reset role;

-- 화양 비멤버(다른 프로젝트 상담사)로 로그인: 화양 조회 시 빈 결과
select pg_temp.login('31000000-0000-4000-8000-000000000006');
set local role authenticated;
select is(
  (select count(*) from public.list_move_in_field_members('1283e198-5043-4027-96d6-edcc7a6686c6')),
  0::bigint,
  '화양 비멤버는 화양 담당자 이름을 조회할 수 없다'
);
reset role;

-- project_member 테이블 자체 SELECT RLS는 이번 작업으로 넓어지지 않는다 (본인 row만 보임).
select pg_temp.login('31000000-0000-4000-8000-000000000001');
set local role authenticated;
select is(
  (select count(*) from public.project_member where project_id='1283e198-5043-4027-96d6-edcc7a6686c6'),
  1::bigint,
  'project_member 직접 SELECT는 여전히 본인 row로 제한된다 (RLS 미확장)'
);
reset role;

select * from finish();
rollback;
