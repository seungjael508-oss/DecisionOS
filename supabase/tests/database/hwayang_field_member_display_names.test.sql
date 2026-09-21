-- 화양 3인 실시간 업무일지: private.apply_hwayang_field_member_display_names()가
-- 실제 3명의 이메일만 정확히 매칭해 display_name을 채우고, 그 외에는 손대지 않는지 검증한다.
begin;
select plan(9);

create function pg_temp.hid(prefix text, n integer) returns uuid language sql immutable as $$ select md5('field-name-data-test-' || prefix || n::text)::uuid $$;

-- 화양 실제 3인 이메일 + 매핑 표에 없는 이메일 1개, 총 4개 합성 계정.
insert into auth.users (id, email) values
(pg_temp.hid('user',1),'seungjael508@gmail.com'),
(pg_temp.hid('user',2),'sojin7071@naver.com'),
(pg_temp.hid('user',3),'lovesong7535@naver.com'),
(pg_temp.hid('user',4),'nobody-else@example.com');

-- 화양 프로젝트: 3인 + 매핑 안 되는 계정 1명(엉뚱한 사람은 손대면 안 된다)
insert into public.project(id,organization_id,name) values ('1283e198-5043-4027-96d6-edcc7a6686c6','10000000-0000-4000-8000-000000000001','Synthetic Hwayang Data Migration');
insert into public.project_member(id,project_id,user_id,role,active) values
(pg_temp.hid('member',1),'1283e198-5043-4027-96d6-edcc7a6686c6',pg_temp.hid('user',1),'COUNSELOR',true),
(pg_temp.hid('member',2),'1283e198-5043-4027-96d6-edcc7a6686c6',pg_temp.hid('user',2),'COUNSELOR',true),
(pg_temp.hid('member',3),'1283e198-5043-4027-96d6-edcc7a6686c6',pg_temp.hid('user',3),'COUNSELOR',true),
(pg_temp.hid('member',4),'1283e198-5043-4027-96d6-edcc7a6686c6',pg_temp.hid('user',4),'COUNSELOR',true);

-- 다른 프로젝트에 화양 3인 중 한 명과 같은 계정이 소속돼 있어도 절대 영향받으면 안 된다.
insert into public.project(id,organization_id,name) values ('20000000-0000-4000-8000-000000000099','10000000-0000-4000-8000-000000000001','Synthetic Other Project (data migration test)');
insert into public.project_member(id,project_id,user_id,role,active) values
(pg_temp.hid('other',1),'20000000-0000-4000-8000-000000000099',pg_temp.hid('user',1),'COUNSELOR',true);

select is((select count(*) from public.project_member where display_name is not null), 0::bigint, '실행 전에는 display_name이 비어 있다');

-- db reset 시점의 마이그레이션 실행 때는 매칭되는 계정이 없었으므로, 여기서 다시 실행해 매칭을 검증한다.
select private.apply_hwayang_field_member_display_names();

select is((select display_name from public.project_member where id = pg_temp.hid('member',1)), '이승재', 'seungjael508@gmail.com 계정은 이승재로 매핑된다');
select is((select display_name from public.project_member where id = pg_temp.hid('member',2)), '박진하', 'sojin7071@naver.com 계정은 박진하로 매핑된다');
select is((select display_name from public.project_member where id = pg_temp.hid('member',3)), '송용석', 'lovesong7535@naver.com 계정은 송용석으로 매핑된다');
select is((select display_name from public.project_member where id = pg_temp.hid('member',4)), null, '매핑 표에 없는 이메일은 손대지 않는다');
select is((select display_name from public.project_member where id = pg_temp.hid('other',1)), null, '화양이 아닌 프로젝트의 동일 계정은 영향받지 않는다');

-- 사용자가 제시한 검증 쿼리와 동일한 형태: 활성 3명이 정확히 1명씩 존재해야 한다.
select is(
  (select jsonb_object_agg(display_name, cnt) from (
    select display_name, count(*) as cnt
    from public.project_member
    where project_id = '1283e198-5043-4027-96d6-edcc7a6686c6' and active = true and display_name is not null
    group by display_name
  ) t),
  '{"이승재":1,"박진하":1,"송용석":1}'::jsonb,
  '화양 활성 담당자 3명의 표시 이름이 정확히 1명씩 존재한다'
);

-- 재실행해도 안전하다(idempotent).
select lives_ok('select private.apply_hwayang_field_member_display_names()', '데이터 마이그레이션은 재실행해도 안전하다(idempotent)');
select is((select display_name from public.project_member where id = pg_temp.hid('member',1)), '이승재', '재실행 후에도 매핑 결과는 동일하게 유지된다');

select * from finish();
rollback;
