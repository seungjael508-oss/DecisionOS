-- 부재 = 접촉 시도. 기본등급·최종 접촉일 보존, 오늘 관리대상 C/D·부재 재접촉 누락 방지 회귀 검증
-- 18인자(계약 경합 방어) 경로만 호출한다. 앱 저장 경로와 동일.
begin;
select no_plan();

insert into public.project_unit(unit_id,project_id,building_no,unit_no) values
 ('8f000000-0000-4000-8000-0000000000b1','20000000-0000-4000-8000-000000000001','998','9801'),
 ('8f000000-0000-4000-8000-0000000000b2','20000000-0000-4000-8000-000000000001','998','9802'),
 ('8f000000-0000-4000-8000-0000000000b3','20000000-0000-4000-8000-000000000001','998','9803');
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-0000000000c1',true);
select public.create_contract('20000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-0000000000a1','8f000000-0000-4000-8000-0000000000b1');
select public.create_contract('20000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-0000000000a1','8f000000-0000-4000-8000-0000000000b2');
select public.create_contract('20000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-0000000000a1','8f000000-0000-4000-8000-0000000000b3');
insert into public.move_in_tracking_policy(project_id, reason_code, stale_after, created_by) values
 ('20000000-0000-4000-8000-000000000001','D_GRADE_STALE',interval '7 days','40000000-0000-4000-8000-0000000000c1'),
 ('20000000-0000-4000-8000-000000000001','C_GRADE_STALE',interval '14 days','40000000-0000-4000-8000-0000000000c1'),
 ('20000000-0000-4000-8000-000000000001','ABSENCE_RETRY',interval '21 days','40000000-0000-4000-8000-0000000000c1');

create function pg_temp.cid(u uuid) returns uuid language sql as $$
 select contract_id from public.contract where unit_id=u and contract_status='ACTIVE' $$;
create function pg_temp.save(u uuid, grade text, expected uuid default null) returns uuid language plpgsql as $$ begin
 return public.create_move_in_consultation(
  p_project_id:='20000000-0000-4000-8000-000000000001',p_unit_id:=u,p_customer_id:='50000000-0000-4000-8000-0000000000a1',
  p_consultation_type:='OUTBOUND',p_content:='synthetic',p_expected_contract_id:=coalesce(expected,pg_temp.cid(u)),
  p_legacy_grade:=grade,p_next_contact_at:=null::timestamptz,p_occupancy_intent:=null::public.occupancy_intent,
  p_funding_status:=null::public.funding_status,p_move_in_status:=null::public.move_in_status,p_planned_move_in_date:=null::date,
  p_balance_paid_at:=null::timestamptz,p_actual_move_in_date:=null::timestamptz,p_reason:=null::text,p_business_purpose:=null::text,
  p_clear_next_contact_at:=false,p_operational_intent:=null::public.operational_intent); end $$;
create function pg_temp.occ(u uuid) returns public.unit_occupancy_status language sql as $$
 select * from public.unit_occupancy_status where unit_id=u $$;
grant execute on function pg_temp.cid(uuid), pg_temp.save(uuid,text,uuid) to authenticated;

-- 1) 실제 접촉(C) 후 부재: 등급 C 유지, 최종 접촉일 유지, 시도 기록은 남음
set local role authenticated;
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000b1','C')$$,'C 등급 실제 접촉 저장');
reset role;
create temporary table t1 as select last_contact_at as real_at from pg_temp.occ('8f000000-0000-4000-8000-0000000000b1');
-- now()는 트랜잭션 내 고정이므로 직전 접촉을 과거로 이동해 시각을 구분
update public.consultation set consulted_at = consulted_at - interval '40 days' where unit_id='8f000000-0000-4000-8000-0000000000b1';
update public.unit_occupancy_status set last_contact_at = last_contact_at - interval '40 days' where unit_id='8f000000-0000-4000-8000-0000000000b1';
update t1 set real_at = real_at - interval '40 days';
set local role authenticated;
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000b1','부재')$$,'부재 저장 성공');
reset role;
select is((pg_temp.occ('8f000000-0000-4000-8000-0000000000b1')).legacy_grade,'C','부재 저장이 기본등급 C를 덮어쓰지 않음');
select is((pg_temp.occ('8f000000-0000-4000-8000-0000000000b1')).last_contact_at,(select real_at from t1),'부재는 last_contact_at을 갱신하지 않음');
select is((select count(*)::int from public.consultation where unit_id='8f000000-0000-4000-8000-0000000000b1' and structured_tags->>'legacy_grade'='부재'),1,'부재 시도는 상담이력에 기록됨');

-- 2) 오늘 관리대상: 실제 접촉 40일 경과 C → 부재 시도가 있어도 C 재접촉 대상
select ok(exists(select 1 from public.get_move_in_today_queue('20000000-0000-4000-8000-000000000001',now())
  where unit_id='8f000000-0000-4000-8000-0000000000b1' and reason_codes @> array['C_GRADE_STALE']),'부재 시도가 C 재접촉 경과를 초기화하지 않음');
select ok(not exists(select 1 from public.get_move_in_today_queue('20000000-0000-4000-8000-000000000001',now())
  where unit_id='8f000000-0000-4000-8000-0000000000b1' and reason_codes @> array['ABSENCE_RETRY']),'방금 시도한 부재는 21일 전 재시도 대상 아님');
select is((select last_contact_at from public.get_move_in_today_queue('20000000-0000-4000-8000-000000000001',now())
  where unit_id='8f000000-0000-4000-8000-0000000000b1'),(select real_at from t1),'queue 최종 접촉일 = 실제 접촉일');

-- 3) 부재만 있는 세대: 등급 미등록 유지. C·D 집중관리(20261015) 이후 등급 미등록 세대는 오늘 관리대상 아님
set local role authenticated;
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000b2','부재')$$,'접촉 이력 없는 세대 부재 저장');
reset role;
select is((pg_temp.occ('8f000000-0000-4000-8000-0000000000b2')).legacy_grade,null::text,'부재는 등급값으로 저장되지 않음');
select is((pg_temp.occ('8f000000-0000-4000-8000-0000000000b2')).last_contact_at,null::timestamptz,'부재만 있으면 최종 접촉일 없음');
update public.consultation set consulted_at = consulted_at - interval '30 days' where unit_id='8f000000-0000-4000-8000-0000000000b2';
select ok(not exists(select 1 from public.get_move_in_today_queue('20000000-0000-4000-8000-000000000001',now())
  where unit_id='8f000000-0000-4000-8000-0000000000b2'),'등급 미등록 부재 세대는 C·D 집중관리 대상 아님');

-- 4) 기존 부재 등급값 세대(구 데이터): 등급 자동 복원 없음, C·D가 아니므로 오늘 관리대상 아님
update public.unit_occupancy_status set legacy_grade='부재', last_contact_at=now()-interval '30 days' where unit_id='8f000000-0000-4000-8000-0000000000b3';
select ok(not exists(select 1 from public.get_move_in_today_queue('20000000-0000-4000-8000-000000000001',now())
  where unit_id='8f000000-0000-4000-8000-0000000000b3'),'기존 부재 등급 세대는 C·D 집중관리 대상 아님');
select is((pg_temp.occ('8f000000-0000-4000-8000-0000000000b3')).legacy_grade,'부재','기존 부재 등급값 자동 변경 없음');

-- 5) 상담거절: 기본등급은 유지(접촉 결과로만 기록), 고객 응답이 있었으므로 실제 접촉일은 갱신
set local role authenticated;
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000b1','상담거절')$$,'상담거절 저장');
reset role;
select is((pg_temp.occ('8f000000-0000-4000-8000-0000000000b1')).legacy_grade,'C','상담거절이 기본등급 C를 덮어쓰지 않음');
select is((pg_temp.occ('8f000000-0000-4000-8000-0000000000b1')).last_contact_at,now(),'상담거절은 실제 접촉일 갱신');
select is((select count(*)::int from public.consultation where unit_id='8f000000-0000-4000-8000-0000000000b1' and structured_tags->>'legacy_grade'='상담거절'),1,'상담거절 결과는 상담이력에 기록');
-- A~D 선택은 기존대로 기본등급 변경
set local role authenticated;
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000b1','B')$$,'B 등급 저장');
reset role;
select is((pg_temp.occ('8f000000-0000-4000-8000-0000000000b1')).legacy_grade,'B','A~D 선택 시에만 기본등급 변경');

-- 6) 이전 계약자 최근 상담은 현재 계약자 C/D 경과에 섞이지 않음
update public.unit_occupancy_status set legacy_grade='D', last_contact_at=now()-interval '20 days' where unit_id='8f000000-0000-4000-8000-0000000000b3';
update public.consultation set consulted_at=now()-interval '20 days' where unit_id='8f000000-0000-4000-8000-0000000000b3';
insert into public.consultation(project_id,customer_id,counselor_id,consulted_at,content,created_by,unit_id,contact_type,stage,purpose,structured_tags)
 values ('20000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-0000000000f1','40000000-0000-4000-8000-0000000000c1',now()-interval '1 day',
  'previous holder','40000000-0000-4000-8000-0000000000c1','8f000000-0000-4000-8000-0000000000b3','CALL','MOVE_IN','OUTBOUND','{"legacy_grade":"A"}');
select ok(exists(select 1 from public.get_move_in_today_queue('20000000-0000-4000-8000-000000000001',now())
  where unit_id='8f000000-0000-4000-8000-0000000000b3' and reason_codes @> array['D_GRADE_STALE']),'이전 계약자 최근 상담이 D 재접촉 경과를 가리지 않음');

-- 7) 계약 ID 누락 거절·원자성, 계약 경합 방어·권한 유지
create temporary table facts as select (select count(*) from public.consultation where unit_id='8f000000-0000-4000-8000-0000000000b1') c,
  (select to_jsonb(o) from public.unit_occupancy_status o where unit_id='8f000000-0000-4000-8000-0000000000b1') o;
set local role authenticated;
select throws_ok($$select public.create_move_in_consultation(p_project_id:='20000000-0000-4000-8000-000000000001',p_unit_id:='8f000000-0000-4000-8000-0000000000b1',
  p_customer_id:='50000000-0000-4000-8000-0000000000a1',p_consultation_type:='OUTBOUND',p_content:='x',p_expected_contract_id:=null::uuid,p_legacy_grade:='부재',
  p_next_contact_at:=null::timestamptz,p_occupancy_intent:=null::public.occupancy_intent,p_funding_status:=null::public.funding_status,p_move_in_status:=null::public.move_in_status,
  p_planned_move_in_date:=null::date,p_balance_paid_at:=null::timestamptz,p_actual_move_in_date:=null::timestamptz,p_reason:=null::text,p_business_purpose:=null::text,
  p_clear_next_contact_at:=false,p_operational_intent:=null::public.operational_intent)$$,'23514','expected contract is required','계약 ID 누락 저장 거절');
reset role;
select is((select count(*) from public.consultation where unit_id='8f000000-0000-4000-8000-0000000000b1'),(select c from facts),'거절된 저장은 상담 0건 추가');
select is((select to_jsonb(o) from public.unit_occupancy_status o where unit_id='8f000000-0000-4000-8000-0000000000b1'),(select o from facts),'거절된 저장은 등급·접촉일 불변');
set local role authenticated;
select throws_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000b1','부재','8f000000-0000-4000-8000-000000000099')$$,'23514','stale contract','부재 저장도 계약 경합 방어 유지');
reset role;
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-0000000000c2',true);
set local role authenticated;
select throws_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000b1','부재','8f000000-0000-4000-8000-0000000000b1')$$,'42501',null,'타 프로젝트 관리자 부재 저장 불가');
reset role;
select ok((select has_function_privilege('authenticated',p.oid,'EXECUTE') and not has_function_privilege('anon',p.oid,'EXECUTE')
  from pg_proc p where p.proname='create_move_in_consultation' and p.pronargs=18),'18인자 ACL 유지');
select ok((select not has_function_privilege('authenticated',p.oid,'EXECUTE') and not has_function_privilege('anon',p.oid,'EXECUTE')
  from pg_proc p where p.proname='create_move_in_consultation' and p.pronargs=17),'17인자 직접 호출 차단 유지');

select * from finish();
rollback;
