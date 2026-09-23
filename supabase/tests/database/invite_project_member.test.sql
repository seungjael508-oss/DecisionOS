-- Task A-2: invite_project_member / list_project_members RPC.
-- PROJECT_ADMIN만 사용자를 초대/조회할 수 있고, PROJECT_ADMIN 역할 자체는 절대 부여할 수 없으며,
-- 존재하지 않는 auth user나 중복 멤버로는 project_member가 생기지 않는지 검증한다.
begin;
select no_plan();

create function pg_temp.hid(prefix text, n integer) returns uuid language sql immutable as $$ select md5('invite-member-test-' || prefix || n::text)::uuid $$;
create function pg_temp.login(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub',u,true)::void $$;

-- project_member.user_id는 auth.users FK이므로 합성 유저를 먼저 만든다.
-- new-user1/2는 아직 어떤 프로젝트의 project_member도 아닌 "신규 초대 대상"이다.
insert into auth.users (id, email) values
  (pg_temp.hid('admin-user',1), 'admin1@invite-test.local'),
  (pg_temp.hid('inactive-admin-user',1), 'inactive-admin1@invite-test.local'),
  (pg_temp.hid('cm-user',1), 'cm1@invite-test.local'),
  (pg_temp.hid('counselor-user',1), 'counselor1@invite-test.local'),
  (pg_temp.hid('admin-user',2), 'admin2@invite-test.local'),
  (pg_temp.hid('new-user',1), 'new1@invite-test.local'),
  (pg_temp.hid('new-user',2), 'new2@invite-test.local');

insert into public.project(id,organization_id,name) values
  (pg_temp.hid('project',1),'10000000-0000-4000-8000-000000000001','Invite Member Test P1'),
  (pg_temp.hid('project',2),'10000000-0000-4000-8000-000000000001','Invite Member Test P2');

insert into public.project_member(id,project_id,user_id,role,active) values
  (pg_temp.hid('admin',1),          pg_temp.hid('project',1), pg_temp.hid('admin-user',1),          'PROJECT_ADMIN',  true),
  (pg_temp.hid('inactive-admin',1), pg_temp.hid('project',1), pg_temp.hid('inactive-admin-user',1), 'PROJECT_ADMIN',  false),
  (pg_temp.hid('cm',1),             pg_temp.hid('project',1), pg_temp.hid('cm-user',1),             'CLIENT_MANAGER', true),
  (pg_temp.hid('counselor',1),      pg_temp.hid('project',1), pg_temp.hid('counselor-user',1),      'COUNSELOR',      true),
  (pg_temp.hid('admin',2),          pg_temp.hid('project',2), pg_temp.hid('admin-user',2),          'PROJECT_ADMIN',  true);

-- =========================================================================
-- 함수 표면: SECURITY DEFINER / search_path / grant 대상.
-- =========================================================================
select has_function('public'::name,'invite_project_member'::name);
select has_function('public'::name,'list_project_members'::name);
select ok(
  (select prosecdef from pg_proc where proname='invite_project_member'),
  'invite_project_member: SECURITY DEFINER'
);
select ok(
  (select prosecdef from pg_proc where proname='list_project_members'),
  'list_project_members: SECURITY DEFINER'
);
select ok(
  (select proconfig::text like '%search_path=%' from pg_proc where proname='invite_project_member'),
  'invite_project_member: search_path empty'
);
select ok(
  (select proconfig::text like '%search_path=%' from pg_proc where proname='list_project_members'),
  'list_project_members: search_path empty'
);
select ok(
  has_function_privilege('authenticated','public.invite_project_member(uuid,uuid,public.project_member_role,text)','EXECUTE')
    and not has_function_privilege('public','public.invite_project_member(uuid,uuid,public.project_member_role,text)','EXECUTE'),
  'invite_project_member: PUBLIC EXECUTE 없음, authenticated EXECUTE'
);
select ok(
  has_function_privilege('authenticated','public.list_project_members(uuid)','EXECUTE')
    and not has_function_privilege('public','public.list_project_members(uuid)','EXECUTE'),
  'list_project_members: PUBLIC EXECUTE 없음, authenticated EXECUTE'
);

-- =========================================================================
-- PROJECT_ADMIN: 신규 auth user를 COUNSELOR/CLIENT_MANAGER로 초대할 수 있다.
-- =========================================================================
select pg_temp.login(pg_temp.hid('admin-user',1)::text);
set local role authenticated;

-- pgTAP 함정: `do $$ ... perform ok(...) end $$` 안에서는 TAP 출력 행이 버려지면서도
-- 내부 테스트 카운터는 증가해 "Tests out of sequence" 파싱 오류가 난다.
-- RPC 결과를 임시 테이블에 담아 do 블록 밖에서 select ok/is로 단언한다.
create temporary table invite_capture (step text primary key, member_id uuid);

do $$
begin
  insert into invite_capture (step, member_id) values (
    'counselor',
    public.invite_project_member(
      pg_temp.hid('project',1), pg_temp.hid('new-user',1), 'COUNSELOR'::public.project_member_role, '신규 상담사'
    )
  );
end;
$$;

select ok(
  (select member_id from invite_capture where step = 'counselor') is not null,
  'admin: 신규 유저를 COUNSELOR로 초대 성공, member id 반환'
);
select is(
  (select role from public.project_member where id = (select member_id from invite_capture where step = 'counselor')),
  'COUNSELOR'::public.project_member_role,
  'admin: 생성된 member의 역할이 COUNSELOR'
);
select is(
  (select display_name from public.project_member where id = (select member_id from invite_capture where step = 'counselor')),
  '신규 상담사',
  'admin: 생성된 member의 표시이름 저장됨'
);

do $$
begin
  insert into invite_capture (step, member_id) values (
    'client_manager',
    public.invite_project_member(
      pg_temp.hid('project',1), pg_temp.hid('new-user',2), 'CLIENT_MANAGER'::public.project_member_role, '신규 시행사 관리자'
    )
  );
end;
$$;

select is(
  (select role from public.project_member where id = (select member_id from invite_capture where step = 'client_manager')),
  'CLIENT_MANAGER'::public.project_member_role,
  'admin: 신규 유저를 CLIENT_MANAGER로도 초대 가능'
);

-- PROJECT_ADMIN 역할 자체는 이 RPC로 절대 부여할 수 없다(호출자가 PROJECT_ADMIN이어도 동일).
select throws_ok(
  $$select public.invite_project_member(
      pg_temp.hid('project',1), gen_random_uuid(), 'PROJECT_ADMIN'::public.project_member_role, '승격 시도'
    )$$,
  '42501', null, 'admin: PROJECT_ADMIN 역할로는 초대 불가(승격 경로 차단)'
);

-- 이미 존재하는 프로젝트 멤버(counselor-user1)를 다시 초대하면 중복 거부되고 orphan이 생기지 않는다.
select throws_ok(
  $$select public.invite_project_member(
      pg_temp.hid('project',1), pg_temp.hid('counselor-user',1), 'COUNSELOR'::public.project_member_role, '중복 초대'
    )$$,
  '23505', null, 'admin: 동일 프로젝트 중복 member 초대 거부'
);
select is(
  (select count(*) from public.project_member
   where project_id = pg_temp.hid('project',1) and user_id = pg_temp.hid('counselor-user',1)),
  1::bigint, 'admin: 중복 초대 실패 후에도 기존 member 행은 정확히 1개(orphan 없음)'
);

-- auth.users에 없는 user_id로는 project_member를 만들 수 없다(auth.users 직접 INSERT 우회 방지).
select throws_ok(
  $$select public.invite_project_member(
      pg_temp.hid('project',1), gen_random_uuid(), 'COUNSELOR'::public.project_member_role, '존재하지 않는 유저'
    )$$,
  '23514', null, 'admin: auth.users에 없는 user_id는 거부'
);

-- 표시이름 2자 미만은 거부된다.
select throws_ok(
  $$select public.invite_project_member(
      pg_temp.hid('project',1), pg_temp.hid('new-user',1), 'COUNSELOR'::public.project_member_role, 'a'
    )$$,
  '23514', null, 'admin: 표시이름 2자 미만 거부'
);

reset role;

-- =========================================================================
-- CLIENT_MANAGER/COUNSELOR는 초대를 실행할 수 없다.
-- =========================================================================
select pg_temp.login(pg_temp.hid('cm-user',1)::text);
set local role authenticated;
select throws_ok(
  $$select public.invite_project_member(
      pg_temp.hid('project',1), gen_random_uuid(), 'COUNSELOR'::public.project_member_role, '거부 대상'
    )$$,
  '42501', null, 'client manager: 초대 실행 거부'
);
reset role;

select pg_temp.login(pg_temp.hid('counselor-user',1)::text);
set local role authenticated;
select throws_ok(
  $$select public.invite_project_member(
      pg_temp.hid('project',1), gen_random_uuid(), 'COUNSELOR'::public.project_member_role, '거부 대상'
    )$$,
  '42501', null, 'counselor: 초대 실행 거부'
);
reset role;

-- =========================================================================
-- 비활성 PROJECT_ADMIN / 다른 프로젝트 IDOR.
-- =========================================================================
select pg_temp.login(pg_temp.hid('inactive-admin-user',1)::text);
set local role authenticated;
select throws_ok(
  $$select public.invite_project_member(
      pg_temp.hid('project',1), gen_random_uuid(), 'COUNSELOR'::public.project_member_role, '거부 대상'
    )$$,
  '42501', null, 'inactive PROJECT_ADMIN: 초대 실행 거부'
);
reset role;

-- P2의 PROJECT_ADMIN이 P1에 초대를 시도하면 P1 멤버가 아니므로 거부된다(IDOR 차단).
select pg_temp.login(pg_temp.hid('admin-user',2)::text);
set local role authenticated;
select throws_ok(
  $$select public.invite_project_member(
      pg_temp.hid('project',1), gen_random_uuid(), 'COUNSELOR'::public.project_member_role, '타 프로젝트'
    )$$,
  '42501', null, 'admin2(P2 관리자): P1 초대 시도는 IDOR로 차단'
);
reset role;

-- =========================================================================
-- list_project_members: PROJECT_ADMIN만 조회 가능, 이메일까지 함께 반환.
-- =========================================================================
select pg_temp.login(pg_temp.hid('admin-user',1)::text);
set local role authenticated;
select is(
  (select count(*) from public.list_project_members(pg_temp.hid('project',1))),
  6::bigint, 'admin: P1 멤버 전체(초대 2명 포함) 조회'
);
select is(
  (select email from public.list_project_members(pg_temp.hid('project',1)) where user_id = pg_temp.hid('counselor-user',1)),
  'counselor1@invite-test.local', 'admin: project_member와 auth.users 이메일이 정확히 매핑됨'
);
reset role;

select pg_temp.login(pg_temp.hid('cm-user',1)::text);
set local role authenticated;
select throws_ok(
  $$select * from public.list_project_members(pg_temp.hid('project',1))$$,
  '42501', null, 'client manager: 사용자 목록 조회 거부'
);
reset role;

select pg_temp.login(pg_temp.hid('counselor-user',1)::text);
set local role authenticated;
select throws_ok(
  $$select * from public.list_project_members(pg_temp.hid('project',1))$$,
  '42501', null, 'counselor: 사용자 목록 조회 거부'
);
reset role;

-- P2 관리자가 P1 목록을 보려 하면 IDOR로 차단된다.
select pg_temp.login(pg_temp.hid('admin-user',2)::text);
set local role authenticated;
select throws_ok(
  $$select * from public.list_project_members(pg_temp.hid('project',1))$$,
  '42501', null, 'admin2(P2 관리자): P1 목록 조회는 IDOR로 차단'
);
reset role;

select * from finish();
rollback;
