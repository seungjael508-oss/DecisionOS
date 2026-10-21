-- 장기 부재 D등급 전환·방문상담 회귀 검증
-- 연속 전화 부재(현재 계약자) 산출, 과거 기록만으로는 미변경, 신규 부재 저장 시 자동 D·이력·방문대상, 중복 방지,
-- 방문 결과와 기본등급 분리, 오늘 관리대상 사유, IDOR
begin;
select no_plan();

insert into public.project_unit(unit_id,project_id,building_no,unit_no) values
 ('8f000000-0000-4000-8000-0000000000d1','20000000-0000-4000-8000-000000000001','997','9711'),
 ('8f000000-0000-4000-8000-0000000000d2','20000000-0000-4000-8000-000000000001','997','9712'),
 ('8f000000-0000-4000-8000-0000000000d3','20000000-0000-4000-8000-000000000001','997','9713'),
 ('8f000000-0000-4000-8000-0000000000d4','20000000-0000-4000-8000-000000000001','997','9714');
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-0000000000c1',true);
select public.create_contract('20000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-0000000000a1','8f000000-0000-4000-8000-0000000000d1');
select public.create_contract('20000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-0000000000a1','8f000000-0000-4000-8000-0000000000d2');
select public.create_contract('20000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-0000000000a1','8f000000-0000-4000-8000-0000000000d3');
select public.create_contract('20000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-0000000000a1','8f000000-0000-4000-8000-0000000000d4');

create function pg_temp.cid(u uuid) returns uuid language sql as $$
 select contract_id from public.contract where unit_id=u and contract_status='ACTIVE' $$;
-- 같은 트랜잭션의 now()가 동일하므로 저장 순서를 기록해 두고 나중에 시각을 벌린다
create temporary table saved(seq serial primary key, id uuid not null);
create function pg_temp.save(u uuid, kind text, grade text) returns uuid language plpgsql as $$ declare v uuid; begin
 v := public.create_move_in_consultation(
  p_project_id:='20000000-0000-4000-8000-000000000001',p_unit_id:=u,p_customer_id:='50000000-0000-4000-8000-0000000000a1',
  p_consultation_type:=kind,p_content:='synthetic',p_expected_contract_id:=pg_temp.cid(u),
  p_legacy_grade:=grade,p_next_contact_at:=null::timestamptz,p_occupancy_intent:=null::public.occupancy_intent,
  p_funding_status:=null::public.funding_status,p_move_in_status:=null::public.move_in_status,p_planned_move_in_date:=null::date,
  p_balance_paid_at:=null::timestamptz,p_actual_move_in_date:=null::timestamptz,p_reason:=null::text,p_business_purpose:=null::text,
  p_clear_next_contact_at:=false,p_operational_intent:=null::public.operational_intent);
 insert into saved(id) values (v);
 return v; end $$;
create function pg_temp.streak(u uuid) returns integer language sql as $$
 select absence_streak from public.get_move_in_absence_candidates('20000000-0000-4000-8000-000000000001') where unit_id=u $$;
create function pg_temp.grade(u uuid) returns text language sql as $$
 select legacy_grade from public.unit_occupancy_status where unit_id=u $$;
grant insert, select on saved to authenticated;
grant usage on sequence saved_seq_seq to authenticated;
grant execute on function pg_temp.cid(uuid), pg_temp.save(uuid,text,text), pg_temp.streak(uuid), pg_temp.grade(uuid) to authenticated;

set local role authenticated;
-- d1: B 확정 후 전화 부재 3회 → 후보
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000d1','OUTBOUND','B')$$,'d1 B 저장');
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000d1','OUTBOUND','부재')$$,'d1 부재 1');
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000d1','OUTBOUND','부재')$$,'d1 부재 2');
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000d1','OUTBOUND','부재')$$,'d1 부재 3');
-- d2: 부재 3회 후 상담 성공 → 초기화
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000d2','OUTBOUND','부재')$$,'d2 부재 1');
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000d2','OUTBOUND','부재')$$,'d2 부재 2');
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000d2','OUTBOUND','부재')$$,'d2 부재 3');
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000d2','OUTBOUND','C')$$,'d2 C 상담 성공');
-- d3: 전화 부재 2 + 방문 부재 1 → 2회
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000d3','OUTBOUND','부재')$$,'d3 부재 1');
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000d3','VISIT','부재')$$,'d3 방문 부재');
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000d3','OUTBOUND','부재')$$,'d3 부재 2');
-- d4: D 확정 후 부재 3회 → 후보지만 이미 D
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000d4','OUTBOUND','D')$$,'d4 D 저장');
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000d4','OUTBOUND','부재')$$,'d4 부재 1');
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000d4','OUTBOUND','부재')$$,'d4 부재 2');
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000d4','OUTBOUND','부재')$$,'d4 부재 3');
reset role;

update public.consultation k set consulted_at = now() - make_interval(mins => (1000 - s.seq))
from saved s where k.id = s.id;

select is(pg_temp.streak('8f000000-0000-4000-8000-0000000000d1'),3,'d1 연속 전화 부재 3');
select ok(pg_temp.streak('8f000000-0000-4000-8000-0000000000d2') is null,'d2 상담 성공으로 초기화');
select ok(pg_temp.streak('8f000000-0000-4000-8000-0000000000d3') is null,'d3 방문 부재는 전화 부재로 미인정');
select is(pg_temp.streak('8f000000-0000-4000-8000-0000000000d4'),3,'d4 이미 D 세대도 후보 조회');
-- 저장 시점에는 모두 같은 시각이라 연속 부재가 0으로 계산됐다. 과거 기록이 3회가 된 지금도 일괄 변경은 없어야 한다
select is(pg_temp.grade('8f000000-0000-4000-8000-0000000000d1'),'B','과거 부재 기록만으로 등급 미변경');
select is((select count(*)::int from public.move_in_visit_target where unit_id in ('8f000000-0000-4000-8000-0000000000d1','8f000000-0000-4000-8000-0000000000d4')),0,'과거 부재 기록만으로 방문대상 미생성');
select is((select new_value from public.contract_status_history where unit_id='8f000000-0000-4000-8000-0000000000d2' and field_changed='legacy_grade'),'D','d2 접촉 이력 없이 부재 3회째 저장 시 자동 D');

select ok((select reason_codes @> array['ABSENCE_STREAK'] and priority = 'HIGH'
  from public.get_move_in_today_queue('20000000-0000-4000-8000-000000000001',now())
  where unit_id='8f000000-0000-4000-8000-0000000000d1'),'B 세대도 장기 부재로 오늘 관리대상 우선 표시');

-- 신규 전화 부재 저장 → 과거 3회 포함 연속 부재로 자동 전환
set local role authenticated;
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000d1','OUTBOUND','부재')$$,'d1 신규 부재 저장');
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000d4','OUTBOUND','부재')$$,'d4 신규 부재 저장(이미 D)');
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000d1','OUTBOUND','부재')$$,'d1 부재 재저장');
select throws_ok($$insert into public.move_in_visit_target(project_id,unit_id,contract_id,customer_id,absence_streak_at_open,created_by)
  values ('20000000-0000-4000-8000-000000000001','8f000000-0000-4000-8000-0000000000d2',pg_temp.cid('8f000000-0000-4000-8000-0000000000d2'),
  '50000000-0000-4000-8000-0000000000a1',3,'40000000-0000-4000-8000-0000000000c1')$$,'42501',null,'방문대상 직접 쓰기 불가');
reset role;

select is(pg_temp.grade('8f000000-0000-4000-8000-0000000000d1'),'D','d1 자동 D등급 변경');
select results_eq($$select previous_value,new_value,reason from public.contract_status_history
  where unit_id='8f000000-0000-4000-8000-0000000000d1' and field_changed='legacy_grade'$$,
  $$values ('B'::text,'D'::text,'장기 부재중(연속 3회)'::text)$$,'변경 이력 1건(B→D), 재저장 중복 없음');
select is((select count(*)::int from public.contract_status_history
  where unit_id='8f000000-0000-4000-8000-0000000000d4' and field_changed='legacy_grade'),0,'이미 D 세대 이력 없음');
select is((select count(*)::int from public.move_in_visit_target where unit_id='8f000000-0000-4000-8000-0000000000d1'),1,'방문대상 중복 생성 없음');
select is((select grade_before from public.move_in_visit_target where unit_id='8f000000-0000-4000-8000-0000000000d1'),'B','방문대상에 기존 등급 보존');

select ok((select reason_codes @> array['ABSENCE_STREAK','VISIT_NEEDED']
  from public.get_move_in_today_queue('20000000-0000-4000-8000-000000000001',now())
  where unit_id='8f000000-0000-4000-8000-0000000000d1'),'자동 전환 후 방문상담 필요 표시');
select is((select count(*)::int from public.move_in_visit_target where unit_id='8f000000-0000-4000-8000-0000000000d4'),1,'이미 D 세대 방문대상 등록');

create temporary table vt as select visit_target_id, contract_id from public.move_in_visit_target
 where unit_id='8f000000-0000-4000-8000-0000000000d1';
grant select on vt to authenticated;
set local role authenticated;
select throws_ok($$select public.record_move_in_visit_result('20000000-0000-4000-8000-000000000001',(select visit_target_id from vt),
  pg_temp.cid('8f000000-0000-4000-8000-0000000000d2'),'VISITED','x','SALE')$$,'23514','visit target contract mismatch','다른 계약으로 방문 결과 거부');
select throws_ok($$select public.record_move_in_visit_result('20000000-0000-4000-8000-000000000001',(select visit_target_id from vt),
  (select contract_id from vt),'VISITED','x',null)$$,'23514','visit intent is required','방문 완료 의향 필수');
select lives_ok($$select public.record_move_in_visit_result('20000000-0000-4000-8000-000000000001',(select visit_target_id from vt),
  (select contract_id from vt),'REVISIT_NEEDED','방문 부재',null)$$,'재방문 필요 저장');
reset role;
select is(pg_temp.streak('8f000000-0000-4000-8000-0000000000d1'),5,'방문 부재는 연속 전화 부재에 영향 없음(과거 3 + 신규 2)');
select ok((select reason_codes @> array['REVISIT_NEEDED'] from public.get_move_in_today_queue('20000000-0000-4000-8000-000000000001',now())
  where unit_id='8f000000-0000-4000-8000-0000000000d1'),'재방문 필요 표시');

set local role authenticated;
select lives_ok($$select public.record_move_in_visit_result('20000000-0000-4000-8000-000000000001',(select visit_target_id from vt),
  (select contract_id from vt),'VISITED','매도 의향 확인','SALE')$$,'방문 완료 저장');
reset role;
select is(pg_temp.grade('8f000000-0000-4000-8000-0000000000d1'),'D','방문 결과는 기본등급과 별도');
select is((select occupancy_intent::text from public.unit_occupancy_status where unit_id='8f000000-0000-4000-8000-0000000000d1'),'SALE','방문 의향 반영');
select ok(pg_temp.streak('8f000000-0000-4000-8000-0000000000d1') is null,'방문 완료(실제 접촉)로 연속 부재 초기화');
select ok((select reason_codes @> array['VISIT_DONE'] and not reason_codes @> array['ABSENCE_STREAK']
  from public.get_move_in_today_queue('20000000-0000-4000-8000-000000000001',now())
  where unit_id='8f000000-0000-4000-8000-0000000000d1'),'오늘 방문 완료 표시');

select * from finish();
rollback;
