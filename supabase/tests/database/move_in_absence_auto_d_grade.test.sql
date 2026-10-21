-- 연속 전화 부재 3회 자동 D등급 전환 회귀 검증
-- 2회까지 유지, 3회째 자동 D + 이력 + 방문대상, 기존 D 중복 변경 없음, 상담 성공 시 초기화, 방문 부재 미인정
-- 한 트랜잭션 안에서는 now()가 같으므로 저장 사이에 기존 기록을 1분씩 과거로 민다(pg_temp.age)
begin;
select no_plan();

insert into public.project_unit(unit_id,project_id,building_no,unit_no) values
 ('8f000000-0000-4000-8000-0000000000e1','20000000-0000-4000-8000-000000000001','996','9611'),
 ('8f000000-0000-4000-8000-0000000000e2','20000000-0000-4000-8000-000000000001','996','9612'),
 ('8f000000-0000-4000-8000-0000000000e3','20000000-0000-4000-8000-000000000001','996','9613');
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-0000000000c1',true);
select public.create_contract('20000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-0000000000a1','8f000000-0000-4000-8000-0000000000e1');
select public.create_contract('20000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-0000000000a1','8f000000-0000-4000-8000-0000000000e2');
select public.create_contract('20000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-0000000000a1','8f000000-0000-4000-8000-0000000000e3');

create function pg_temp.cid(u uuid) returns uuid language sql as $$
 select contract_id from public.contract where unit_id=u and contract_status='ACTIVE' $$;
create function pg_temp.save(u uuid, kind text, grade text) returns uuid language plpgsql as $$ begin
 return public.create_move_in_consultation(
  p_project_id:='20000000-0000-4000-8000-000000000001',p_unit_id:=u,p_customer_id:='50000000-0000-4000-8000-0000000000a1',
  p_consultation_type:=kind,p_content:='synthetic',p_expected_contract_id:=pg_temp.cid(u),
  p_legacy_grade:=grade,p_next_contact_at:=null::timestamptz,p_occupancy_intent:=null::public.occupancy_intent,
  p_funding_status:=null::public.funding_status,p_move_in_status:=null::public.move_in_status,p_planned_move_in_date:=null::date,
  p_balance_paid_at:=null::timestamptz,p_actual_move_in_date:=null::timestamptz,p_reason:=null::text,p_business_purpose:=null::text,
  p_clear_next_contact_at:=false,p_operational_intent:=null::public.operational_intent); end $$;
create function pg_temp.age(u uuid) returns void language sql as $$
 update public.consultation set consulted_at = consulted_at - interval '1 minute' where unit_id = u $$;
create function pg_temp.grade(u uuid) returns text language sql as $$
 select legacy_grade from public.unit_occupancy_status where unit_id=u $$;
create function pg_temp.hist(u uuid) returns integer language sql as $$
 select count(*)::int from public.contract_status_history where unit_id=u and field_changed='legacy_grade' $$;
create function pg_temp.vt(u uuid) returns integer language sql as $$
 select count(*)::int from public.move_in_visit_target where unit_id=u $$;
grant execute on function pg_temp.cid(uuid), pg_temp.save(uuid,text,text) to authenticated;

-- e1: B 확정 후 전화 부재 1·2·3·4회
set local role authenticated;
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000e1','OUTBOUND','B')$$,'e1 B 저장');
reset role; select pg_temp.age('8f000000-0000-4000-8000-0000000000e1');
set local role authenticated;
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000e1','OUTBOUND','부재')$$,'e1 부재 1');
reset role; select pg_temp.age('8f000000-0000-4000-8000-0000000000e1');
set local role authenticated;
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000e1','OUTBOUND','부재')$$,'e1 부재 2');
reset role; select pg_temp.age('8f000000-0000-4000-8000-0000000000e1');
select is(pg_temp.grade('8f000000-0000-4000-8000-0000000000e1'),'B','2회 부재까지 등급 유지');
select is(pg_temp.vt('8f000000-0000-4000-8000-0000000000e1'),0,'2회 부재까지 방문대상 없음');
set local role authenticated;
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000e1','OUTBOUND','부재')$$,'e1 부재 3');
reset role;
select is(pg_temp.grade('8f000000-0000-4000-8000-0000000000e1'),'D','3회 연속 부재 → 자동 D');
select results_eq($$select previous_value,new_value,reason from public.contract_status_history
  where unit_id='8f000000-0000-4000-8000-0000000000e1' and field_changed='legacy_grade'$$,
  $$values ('B'::text,'D'::text,'장기 부재중(연속 3회)'::text)$$,'변경 이력(이전 B, D, 사유)');
select ok((select h.changed_at = k.consulted_at and h.contact_id = k.id
  from public.contract_status_history h join public.consultation k on k.id = h.contact_id
  where h.unit_id='8f000000-0000-4000-8000-0000000000e1'),'변경 시각·근거 상담 연결');
select results_eq($$select status, absence_streak_at_open, grade_before from public.move_in_visit_target
  where unit_id='8f000000-0000-4000-8000-0000000000e1'$$,
  $$values ('VISIT_NEEDED'::text, 3, 'B'::text)$$,'방문상담 대상 자동 등록');
select is((select occupancy_intent::text from public.unit_occupancy_status where unit_id='8f000000-0000-4000-8000-0000000000e1'),
  (select occupancy_intent::text from public.unit_occupancy_status where unit_id='8f000000-0000-4000-8000-0000000000e2'),'입주 의향 변경 없음');
select pg_temp.age('8f000000-0000-4000-8000-0000000000e1');
set local role authenticated;
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000e1','OUTBOUND','부재')$$,'e1 부재 4');
reset role;
select is(pg_temp.hist('8f000000-0000-4000-8000-0000000000e1'),1,'4회째: 이력 중복 없음');
select is(pg_temp.vt('8f000000-0000-4000-8000-0000000000e1'),1,'4회째: 방문대상 중복 없음');

-- 상담 성공 → 초기화, 등급은 수동 재조정 전까지 D
select pg_temp.age('8f000000-0000-4000-8000-0000000000e1');
set local role authenticated;
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000e1','OUTBOUND',null)$$,'e1 상담 성공');
reset role;
select is(pg_temp.grade('8f000000-0000-4000-8000-0000000000e1'),'D','상담 성공만으로 등급 자동 복원 없음');
select ok(not exists(select 1 from public.get_move_in_absence_candidates('20000000-0000-4000-8000-000000000001')
  where unit_id='8f000000-0000-4000-8000-0000000000e1'),'상담 성공 → 연속 부재 초기화');

-- e2: 기존 D + 부재 3회 → 등급 이력 없음, 방문대상만
set local role authenticated;
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000e2','OUTBOUND','D')$$,'e2 D 저장(관리자)');
reset role; select pg_temp.age('8f000000-0000-4000-8000-0000000000e2');
set local role authenticated;
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000e2','OUTBOUND','부재')$$,'e2 부재 1');
reset role; select pg_temp.age('8f000000-0000-4000-8000-0000000000e2');
set local role authenticated;
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000e2','OUTBOUND','부재')$$,'e2 부재 2');
reset role; select pg_temp.age('8f000000-0000-4000-8000-0000000000e2');
set local role authenticated;
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000e2','OUTBOUND','부재')$$,'e2 부재 3');
reset role;
select is(pg_temp.hist('8f000000-0000-4000-8000-0000000000e2'),0,'기존 D: 등급 이력 없음');
select is((select grade_changed from public.move_in_visit_target where unit_id='8f000000-0000-4000-8000-0000000000e2'),false,'기존 D: 방문대상만 등록');

-- e3: 전화 부재 2 + 방문 부재 1 → 유지
set local role authenticated;
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000e3','OUTBOUND','C')$$,'e3 C 저장');
reset role; select pg_temp.age('8f000000-0000-4000-8000-0000000000e3');
set local role authenticated;
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000e3','OUTBOUND','부재')$$,'e3 부재 1');
reset role; select pg_temp.age('8f000000-0000-4000-8000-0000000000e3');
set local role authenticated;
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000e3','VISIT','부재')$$,'e3 방문 부재');
reset role; select pg_temp.age('8f000000-0000-4000-8000-0000000000e3');
set local role authenticated;
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000e3','OUTBOUND','부재')$$,'e3 부재 2');
reset role;
select is(pg_temp.grade('8f000000-0000-4000-8000-0000000000e3'),'C','방문 부재는 전화 부재로 세지 않음');

select * from finish();
rollback;
