-- 오늘 관리대상 C·D등급 집중관리 회귀 검증
-- C·D만 대상, FOLLOW_UP_DUE 제외, 부재 시도와 실제 접촉일 분리, 세대당 1행
begin;
select no_plan();

insert into public.project_unit(unit_id,project_id,building_no,unit_no) values
 ('8f000000-0000-4000-8000-0000000000c1','20000000-0000-4000-8000-000000000001','998','9811'),
 ('8f000000-0000-4000-8000-0000000000c2','20000000-0000-4000-8000-000000000001','998','9812'),
 ('8f000000-0000-4000-8000-0000000000c3','20000000-0000-4000-8000-000000000001','998','9813'),
 ('8f000000-0000-4000-8000-0000000000c4','20000000-0000-4000-8000-000000000001','998','9814');
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-0000000000c1',true);
select public.create_contract('20000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-0000000000a1','8f000000-0000-4000-8000-0000000000c1');
select public.create_contract('20000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-0000000000a1','8f000000-0000-4000-8000-0000000000c2');
select public.create_contract('20000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-0000000000a1','8f000000-0000-4000-8000-0000000000c3');
select public.create_contract('20000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-0000000000a1','8f000000-0000-4000-8000-0000000000c4');
insert into public.move_in_tracking_policy(project_id, reason_code, stale_after, created_by) values
 ('20000000-0000-4000-8000-000000000001','D_GRADE_STALE',interval '7 days','40000000-0000-4000-8000-0000000000c1'),
 ('20000000-0000-4000-8000-000000000001','C_GRADE_STALE',interval '14 days','40000000-0000-4000-8000-0000000000c1'),
 ('20000000-0000-4000-8000-000000000001','ABSENCE_RETRY',interval '21 days','40000000-0000-4000-8000-0000000000c1');

create function pg_temp.cid(u uuid) returns uuid language sql as $$
 select contract_id from public.contract where unit_id=u and contract_status='ACTIVE' $$;
create function pg_temp.save(u uuid, grade text) returns uuid language plpgsql as $$ begin
 return public.create_move_in_consultation(
  p_project_id:='20000000-0000-4000-8000-000000000001',p_unit_id:=u,p_customer_id:='50000000-0000-4000-8000-0000000000a1',
  p_consultation_type:='OUTBOUND',p_content:='synthetic',p_expected_contract_id:=pg_temp.cid(u),
  p_legacy_grade:=grade,p_next_contact_at:=null::timestamptz,p_occupancy_intent:=null::public.occupancy_intent,
  p_funding_status:=null::public.funding_status,p_move_in_status:=null::public.move_in_status,p_planned_move_in_date:=null::date,
  p_balance_paid_at:=null::timestamptz,p_actual_move_in_date:=null::timestamptz,p_reason:=null::text,p_business_purpose:=null::text,
  p_clear_next_contact_at:=false,p_operational_intent:=null::public.operational_intent); end $$;
grant execute on function pg_temp.cid(uuid), pg_temp.save(uuid,text) to authenticated;

-- c1: A등급 + 매도 의향 + 다음 접촉 경과 → C·D가 아니므로 대상 아님
set local role authenticated;
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000c1','A')$$,'A 등급 저장');
-- c2: C등급, 오늘 실제 접촉, 다음 접촉 경과 → FOLLOW_UP_DUE 제외로 대상 아님
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000c2','C')$$,'C 등급 저장');
-- c3: D등급, 실제 접촉 40일 경과 + 매도 의향 → D 재접촉·매도 관리 두 사유, 1세대
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000c3','D')$$,'D 등급 저장');
-- c4: C등급, 실제 접촉 40일 전, 이후 부재 시도 30일 전
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000c4','C')$$,'C 등급 저장(부재 전)');
reset role;

update public.unit_occupancy_status set occupancy_intent='SALE', next_contact_at=now()-interval '1 day'
 where unit_id='8f000000-0000-4000-8000-0000000000c1';
update public.unit_occupancy_status set next_contact_at=now()-interval '1 day'
 where unit_id='8f000000-0000-4000-8000-0000000000c2';
update public.consultation set consulted_at=consulted_at-interval '40 days' where unit_id in
 ('8f000000-0000-4000-8000-0000000000c3','8f000000-0000-4000-8000-0000000000c4');
update public.unit_occupancy_status set last_contact_at=last_contact_at-interval '40 days' where unit_id in
 ('8f000000-0000-4000-8000-0000000000c3','8f000000-0000-4000-8000-0000000000c4');
update public.unit_occupancy_status set occupancy_intent='SALE' where unit_id='8f000000-0000-4000-8000-0000000000c3';
create temporary table real_c4 as select last_contact_at as real_at from public.unit_occupancy_status
 where unit_id='8f000000-0000-4000-8000-0000000000c4';

set local role authenticated;
select lives_ok($$select pg_temp.save('8f000000-0000-4000-8000-0000000000c4','부재')$$,'C 세대 부재 저장');
reset role;
update public.consultation set consulted_at=now()-interval '30 days'
 where unit_id='8f000000-0000-4000-8000-0000000000c4' and structured_tags->>'legacy_grade'='부재';

create temporary table queue as
 select * from public.get_move_in_today_queue('20000000-0000-4000-8000-000000000001',now());

select ok(not exists(select 1 from queue where unit_id='8f000000-0000-4000-8000-0000000000c1'),'A등급은 매도·다음 접촉 경과여도 대상 아님');
select ok(not exists(select 1 from queue where unit_id='8f000000-0000-4000-8000-0000000000c2'),'다음 접촉 경과만으로는 C등급도 대상 아님');
select ok(not exists(select 1 from queue where reason_codes @> array['FOLLOW_UP_DUE']),'FOLLOW_UP_DUE 사유 미산출');
select ok(not exists(select 1 from queue where legacy_grade is distinct from 'C' and legacy_grade is distinct from 'D'),'대상 등급은 C·D만');

select is((select count(*)::int from queue where unit_id='8f000000-0000-4000-8000-0000000000c3'),1,'복수 사유 세대는 1행');
select is((select reason_codes from queue where unit_id='8f000000-0000-4000-8000-0000000000c3'),array['D_GRADE_STALE','SALE_TRACKING'],'D 재접촉·매도 관리 사유 병합');

select ok((select reason_codes @> array['C_GRADE_STALE','ABSENCE_RETRY'] from queue where unit_id='8f000000-0000-4000-8000-0000000000c4'),'C 세대 최신 부재 21일 경과 → 부재 재접촉 + C 재접촉');
select is((select last_contact_at from queue where unit_id='8f000000-0000-4000-8000-0000000000c4'),(select real_at from real_c4),'최종 접촉일은 부재 시도가 아닌 실제 접촉일');
select is((select legacy_grade from public.unit_occupancy_status where unit_id='8f000000-0000-4000-8000-0000000000c4'),'C','부재 저장이 C 등급 유지');

-- 정책 미등록 시 C·D 재접촉·부재 재접촉 미선정(정책값 자동 생성 없음)
update public.move_in_tracking_policy set active=false where project_id='20000000-0000-4000-8000-000000000001';
select ok(not exists(select 1 from public.get_move_in_today_queue('20000000-0000-4000-8000-000000000001',now())
  where reason_codes && array['D_GRADE_STALE','C_GRADE_STALE','ABSENCE_RETRY']),'정책 미등록 시 기간 기반 사유 미산출');
select ok(exists(select 1 from public.get_move_in_today_queue('20000000-0000-4000-8000-000000000001',now())
  where unit_id='8f000000-0000-4000-8000-0000000000c3' and reason_codes = array['SALE_TRACKING']),'정책 미등록이어도 D 세대 매도 관리는 유지');

select * from finish();
rollback;
