-- 오늘 관리대상 업무 처리: 완료·다음 관리일 재노출·방문 부재 다음 방문일 (Production 미적용, 별도 승인 필요)
-- 선행: 20261019100000_absence_streak_rule_fast_path 적용 후에만 실행
-- 새 테이블 없음. 기존 move_in_tracking_disposition·contact_schedule·move_in_visit_target 재사용.
-- 1) private.move_in_today_queue(p_project_id, p_now, p_unit_id): 기존 오늘 관리대상 본문(호출자 권한·RLS) + 세대 지정 판정.
--    public.get_move_in_today_queue(2인자)는 같은 결과·같은 열을 돌려주는 래퍼(시그니처·ACL 유지).
-- 2) 숨김 규칙: 오늘 완료(COMPLETE, 같은 상태 지문)는 오늘만 숨김. 다음 관리일 미루기(SNOOZE)는 같은 사유 묶음이면
--    지정한 날(KST 00:00) 전까지 숨기고, 새 사유가 생기면 바로 다시 표시(기존 우선순위 유지).
-- 3) 다음 관리일 도래(NEXT_CONTACT_DUE): 지정한 날이 되었고 그날 이후 접촉 시도가 없으면 표시.
--    실제 접촉일·접촉 시도·부재 판정에서 문자(MESSAGE)는 빼고(20261019100000 장기 부재 규칙과 같음), 이관 상담은 전화/방문으로 본다.
-- 4) complete_or_snooze_move_in_tracking: 해당 세대만 판정(전체 재계산 없음). 이미 관리대상이 아니면 null(오류 아님).
--    같은 날 같은 지문 재호출은 기존 유일 키로 갱신(중복 기록 없음). ACTIVE 계약·현장 쓰기 권한 검증은 그대로.
-- 5) record_move_in_visit_result(7인자): 재방문 필요 시 다음 방문일(기존 상담 RPC의 다음 접촉 일정으로 저장, 기존 예정 일정은 정리).
--    기존 6인자는 7인자를 다음 방문일 없이 호출하는 래퍼(시그니처·ACL 유지).
-- 상담·등급·이력 데이터는 바꾸지 않는다.
begin;

do $preflight$
declare
  v_def text;
begin
  select pg_get_functiondef(oid) into v_def from pg_proc
  where pronamespace = 'public'::regnamespace and proname = 'get_move_in_absence_candidates';
  if v_def is null or position('move_in_absence_candidates_full_view' in v_def) = 0 then
    raise exception '20261019100000 is not applied; abort';
  end if;
  select pg_get_functiondef(oid) into v_def from pg_proc
  where pronamespace = 'public'::regnamespace and proname = 'get_move_in_today_queue';
  if v_def is null or position('VISIT_DONE' in v_def) = 0 or position('private.move_in_today_queue(' in v_def) > 0 then
    raise exception 'get_move_in_today_queue is not the 20261017100000 definition; abort';
  end if;
  select pg_get_functiondef(oid) into v_def from pg_proc
  where pronamespace = 'public'::regnamespace and proname = 'complete_or_snooze_move_in_tracking';
  if v_def is null or position('get_move_in_today_queue(p_project_id, now())' in v_def) = 0 then
    raise exception 'complete_or_snooze_move_in_tracking is not the expected definition; abort';
  end if;
  if to_regprocedure('private.move_in_today_queue(uuid,timestamp with time zone,uuid)') is not null
     or to_regprocedure('private.move_in_absence_candidates_for_unit(uuid,uuid)') is not null
     or to_regprocedure('public.record_move_in_visit_result(uuid,uuid,uuid,text,text,public.occupancy_intent,timestamp with time zone)') is not null then
    raise exception 'objects already exist; abort';
  end if;
  -- 사유 묶음(다음 관리일 도래 추가)과 숨김 규칙이 바뀌므로 오늘 처리 기록이 있는 날에는 적용하지 않는다(출근 전 적용)
  if exists (
    select 1 from public.move_in_tracking_disposition
    where tracking_date = (now() at time zone 'Asia/Seoul')::date
  ) then
    raise exception 'move_in_tracking_disposition has rows for today; apply on a day without dispositions';
  end if;
  perform set_config('lock_timeout', '5s', true);
end
$preflight$;

-- 세대 지정 부재 횟수(20261019100000 RLS 경로 본문 + 세대 조건). 호출자 권한으로 실행한다.
CREATE FUNCTION private.move_in_absence_candidates_for_unit(p_project_id uuid, p_unit_id uuid)
 RETURNS TABLE(unit_id uuid, contract_id uuid, customer_id uuid, legacy_grade text, absence_streak integer, latest_attempt_at timestamp with time zone, last_contact_at timestamp with time zone, open_visit_target_id uuid, open_visit_status text)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
with
current_holder as (
  select uos.project_id, uos.unit_id, uos.contract_id, uos.legacy_grade, uos.last_contact_at, c.customer_id
  from public.unit_occupancy_status uos
  join public.contract c
    on c.project_id = uos.project_id
   and c.unit_id = uos.unit_id
   and c.contract_id = uos.contract_id
   and c.contract_status = 'ACTIVE'::public.contract_status
  where uos.project_id = p_project_id
    and uos.unit_id = p_unit_id
    and not exists (
      select 1
      from public.move_in_tracking_exclusion exclusion
      where exclusion.project_id = uos.project_id
        and exclusion.unit_id = uos.unit_id
        and exclusion.contract_id = uos.contract_id
        and exclusion.active
    )
),
-- 현재 ACTIVE 계약자 본인 상담만(이전 계약자 이력 혼입 차단)
holder_consultation as (
  select k.unit_id, k.consulted_at,
         private.move_in_absence_contact_type(k.project_id, k.contact_type, k.channel, k.structured_tags) as contact_type,
         k.structured_tags->>'legacy_grade' as grade_tag
  from public.consultation k
  join current_holder h
    on h.unit_id = k.unit_id
   and h.customer_id = k.customer_id
  where k.project_id = p_project_id
    and k.unit_id = p_unit_id
),
contact_aggregate as (
  select
    unit_id,
    max(consulted_at) filter (where grade_tag is distinct from '부재') as latest_real_contact_at,
    -- 연속 부재 초기화 기준: 부재가 아닌 상담 중 문자 제외(문자 발송만으로는 초기화하지 않음)
    max(consulted_at) filter (where grade_tag is distinct from '부재' and contact_type is distinct from 'MESSAGE') as streak_reset_at,
    max(consulted_at) filter (where grade_tag = '부재') as latest_absent_at,
    max(consulted_at) as latest_attempt_at
  from holder_consultation
  group by unit_id
),
-- 마지막 실제 접촉(문자 제외) 이후의 전화 부재만 센다(실제 접촉 = 초기화). 같은 시각이면 실제 접촉 우선
streak as (
  select hc.unit_id, count(*)::integer as absence_streak
  from holder_consultation hc
  join contact_aggregate ca on ca.unit_id = hc.unit_id
  where hc.grade_tag = '부재'
    and hc.contact_type = 'CALL'
    and (ca.streak_reset_at is null or hc.consulted_at > ca.streak_reset_at)
  group by hc.unit_id
),
open_visit as (
  select vt.unit_id, vt.contract_id, vt.visit_target_id, vt.status
  from public.move_in_visit_target vt
  where vt.project_id = p_project_id
    and vt.unit_id = p_unit_id
    and vt.status in ('VISIT_NEEDED', 'REVISIT_NEEDED')
)
select
  h.unit_id,
  h.contract_id,
  h.customer_id,
  h.legacy_grade,
  s.absence_streak,
  ca.latest_attempt_at,
  -- 기존 last_contact_at이 부재 시도 시각과 같으면(구 RPC 오염값) 실제 접촉으로 보지 않음
  greatest(
    ca.latest_real_contact_at,
    case when h.last_contact_at is not distinct from ca.latest_absent_at then null else h.last_contact_at end
  ) as last_contact_at,
  ov.visit_target_id as open_visit_target_id,
  ov.status as open_visit_status
from current_holder h
join streak s on s.unit_id = h.unit_id
join contact_aggregate ca on ca.unit_id = h.unit_id
left join open_visit ov on ov.unit_id = h.unit_id and ov.contract_id = h.contract_id
where s.absence_streak >= 3
order by s.absence_streak desc, h.unit_id;
$function$;
revoke all on function private.move_in_absence_candidates_for_unit(uuid, uuid) from public, anon, authenticated;
grant execute on function private.move_in_absence_candidates_for_unit(uuid, uuid) to authenticated;

-- 오늘 관리대상 본문(세대 지정 가능). 호출자 권한(RLS)으로 실행한다.
CREATE FUNCTION private.move_in_today_queue(p_project_id uuid, p_now timestamp with time zone, p_unit_id uuid)
 RETURNS TABLE(unit_id uuid, contract_id uuid, legacy_grade text, occupancy_intent occupancy_intent, funding_status funding_status, move_in_status move_in_status, last_contact_at timestamp with time zone, next_contact_at timestamp with time zone, reason_codes text[], problem_categories text[], priority text, source_fingerprint text, reason_fingerprint text)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
with
clock as (
  select p_now as now_at,
         (p_now at time zone 'Asia/Seoul')::date as tracking_date,
         date_trunc('day', p_now at time zone 'Asia/Seoul') at time zone 'Asia/Seoul' as day_start,
         (date_trunc('day', p_now at time zone 'Asia/Seoul') + interval '1 day') at time zone 'Asia/Seoul' as next_day_start
),
-- 연속 전화 부재 3회 이상(현재 계약자 기준)
absence as (
  select cand.unit_id, cand.contract_id, cand.absence_streak
  from public.get_move_in_absence_candidates(p_project_id) cand
  where p_unit_id is null
  union all
  select one.unit_id, one.contract_id, one.absence_streak
  from private.move_in_absence_candidates_for_unit(p_project_id, p_unit_id) one
  where p_unit_id is not null
),
-- 진행 중 방문대상 + 오늘 방문 완료
visit_target as (
  select vt.unit_id, vt.contract_id, vt.status
  from public.move_in_visit_target vt
  cross join clock
  where vt.project_id = p_project_id
    and (p_unit_id is null or vt.unit_id = p_unit_id)
    and (vt.status in ('VISIT_NEEDED', 'REVISIT_NEEDED')
         or (vt.status = 'VISITED' and vt.last_visited_at >= clock.day_start and vt.last_visited_at < clock.next_day_start))
),
-- 집중관리 대상: 현재 ACTIVE 계약자의 기본등급 C·D + 장기 부재·방문상담 세대
active_units as (
  select
    uos.project_id,
    uos.unit_id,
    uos.contract_id,
    uos.legacy_grade,
    uos.occupancy_intent,
    uos.funding_status,
    uos.move_in_status,
    uos.last_contact_at,
    uos.next_contact_at,
    c.customer_id
  from public.unit_occupancy_status uos
  join public.project_unit pu
    on pu.project_id = uos.project_id
   and pu.unit_id = uos.unit_id
  join public.contract c
    on c.project_id = uos.project_id
   and c.unit_id = uos.unit_id
   and c.contract_id = uos.contract_id
   and c.contract_status = 'ACTIVE'::public.contract_status
  where uos.project_id = p_project_id
    and (p_unit_id is null or uos.unit_id = p_unit_id)
    and (uos.legacy_grade in ('C', 'D')
         or exists (select 1 from absence a where a.unit_id = uos.unit_id and a.contract_id = uos.contract_id)
         or exists (select 1 from visit_target v where v.unit_id = uos.unit_id and v.contract_id = uos.contract_id))
    and not exists (
      select 1
      from public.move_in_tracking_exclusion exclusion
      where exclusion.project_id = uos.project_id
        and exclusion.unit_id = uos.unit_id
        and exclusion.contract_id = uos.contract_id
        and exclusion.active
    )
),
-- 현재 ACTIVE 계약자 본인 상담만 집계(이전 계약자 이력 혼입 차단).
-- 부재 기록은 시도로만 보고 실제 접촉일에서 제외한다.
-- 문자(MESSAGE)는 20261019100000 장기 부재 규칙과 같게 실제 접촉·시도·부재 어디에도 넣지 않는다
-- (접촉 유형 판정은 private.move_in_absence_contact_type: 이관 상담 = 전화/방문)
contact_aggregate as (
  select
    k.unit_id,
    max(k.consulted_at) filter (where k.grade_tag is distinct from '부재' and k.contact_type is distinct from 'MESSAGE') as latest_real_contact_at,
    max(k.consulted_at) filter (where k.contact_type is distinct from 'MESSAGE') as latest_attempt_at,
    max(k.consulted_at) filter (where k.grade_tag = '부재' and k.contact_type is distinct from 'MESSAGE') as latest_absent_at,
    max(k.consulted_at) filter (where k.contact_type = 'MESSAGE') as latest_message_at
  from (
    select k.unit_id, k.consulted_at, k.structured_tags->>'legacy_grade' as grade_tag,
           private.move_in_absence_contact_type(k.project_id, k.contact_type, k.channel, k.structured_tags) as contact_type
    from public.consultation k
    join active_units au
      on au.unit_id = k.unit_id
     and au.customer_id = k.customer_id
    where k.project_id = p_project_id
      and (p_unit_id is null or k.unit_id = p_unit_id)
  ) k
  group by k.unit_id
),
-- 방문 일정도 현재 계약 기준만 사용
visit_schedule as (
  select cs.unit_id, min(cs.planned_at) as visit_planned_at
  from public.contact_schedule cs
  join active_units au
    on au.unit_id = cs.unit_id
   and au.contract_id = cs.contract_id
  cross join clock
  where cs.project_id = p_project_id
    and (p_unit_id is null or cs.unit_id = p_unit_id)
    and cs.status = 'PENDING'::public.contact_schedule_status
    and cs.contact_type = 'VISIT'
    and cs.planned_at >= clock.day_start
    and cs.planned_at < clock.next_day_start
  group by cs.unit_id
),
active_policy as (
  select project_id, reason_code, stale_after
  from public.move_in_tracking_policy
  where project_id = p_project_id
    and active
),
base as (
  select
    active_units.*,
    -- 기존 last_contact_at이 부재 시도 시각과 같으면(구 RPC 오염값) 실제 접촉으로 보지 않음.
    -- 상담 저장 RPC는 문자 저장 시각도 last_contact_at에 쓰므로, 마지막 문자 시각과 같으면 역시 실제 접촉으로 보지 않음
    greatest(
      contact_aggregate.latest_real_contact_at,
      case when active_units.last_contact_at is not distinct from contact_aggregate.latest_absent_at
             or active_units.last_contact_at is not distinct from contact_aggregate.latest_message_at then null
           else active_units.last_contact_at end
    ) as effective_last_contact_at,
    contact_aggregate.latest_attempt_at,
    (contact_aggregate.latest_absent_at is not null
      and contact_aggregate.latest_absent_at = contact_aggregate.latest_attempt_at) as latest_is_absent,
    visit_schedule.visit_planned_at,
    absence.absence_streak,
    visit_target.status as visit_status
  from active_units
  left join contact_aggregate on contact_aggregate.unit_id = active_units.unit_id
  left join visit_schedule on visit_schedule.unit_id = active_units.unit_id
  left join absence on absence.unit_id = active_units.unit_id and absence.contract_id = active_units.contract_id
  left join visit_target on visit_target.unit_id = active_units.unit_id and visit_target.contract_id = active_units.contract_id
),
reason_rows as (
  -- 장기 부재·방문상담 세대를 C·D 재접촉보다 우선 표시
  select b.*, 'ABSENCE_STREAK'::text as reason_code, 'REPEATED_NO_CONTACT'::text as problem_category, 12 as priority_rank
  from base b
  where b.absence_streak >= 3

  union all
  select b.*, 'REVISIT_NEEDED', 'REPEATED_NO_CONTACT', 13
  from base b
  where b.visit_status = 'REVISIT_NEEDED'

  union all
  select b.*, 'VISIT_NEEDED', 'REPEATED_NO_CONTACT', 14
  from base b
  where b.visit_status = 'VISIT_NEEDED'

  union all
  select b.*, 'D_GRADE_STALE', 'REPEATED_NO_CONTACT', 20
  from base b
  join active_policy policy on policy.project_id = b.project_id and policy.reason_code = 'D_GRADE_STALE'
  cross join clock
  where b.legacy_grade = 'D'
    and (b.effective_last_contact_at is null or b.effective_last_contact_at <= clock.now_at - policy.stale_after)

  union all
  select b.*, 'C_GRADE_STALE', 'REPEATED_NO_CONTACT', 30
  from base b
  join active_policy policy on policy.project_id = b.project_id and policy.reason_code = 'C_GRADE_STALE'
  cross join clock
  where b.legacy_grade = 'C'
    and (b.effective_last_contact_at is null or b.effective_last_contact_at <= clock.now_at - policy.stale_after)

  union all
  -- 다음 관리일 도래: 지정한 날(KST)이 되었고 그날 이후 접촉 시도가 아직 없으면 표시(지난 날짜도 처리 전까지 유지)
  select b.*, 'NEXT_CONTACT_DUE', 'REPEATED_NO_CONTACT', 25
  from base b
  cross join clock
  where b.next_contact_at is not null
    and b.next_contact_at < clock.next_day_start
    and (b.latest_attempt_at is null
         or b.latest_attempt_at < date_trunc('day', b.next_contact_at at time zone 'Asia/Seoul') at time zone 'Asia/Seoul')

  union all
  select b.*, 'C_GRADE_FUNDING', 'CREDIT', 40
  from base b
  where b.legacy_grade = 'C'
    and b.funding_status in ('LOAN_NEEDED'::public.funding_status, 'FUNDING_SHORTAGE'::public.funding_status, 'EXISTING_HOME_UNSOLD'::public.funding_status)

  union all
  select b.*, 'ABSENCE_RETRY', 'REPEATED_NO_CONTACT', 50
  from base b
  join active_policy policy on policy.project_id = b.project_id and policy.reason_code = 'ABSENCE_RETRY'
  cross join clock
  -- C·D 세대 중 최신 기록이 부재인 세대. 경과는 마지막 시도 기준
  where b.legacy_grade in ('C', 'D')
    and b.latest_is_absent
    and b.latest_attempt_at <= clock.now_at - policy.stale_after

  union all
  select b.*, 'SALE_TRACKING', 'SALE', 60
  from base b
  where b.legacy_grade in ('C', 'D')
    and b.occupancy_intent in ('SALE'::public.occupancy_intent, 'JEONSE'::public.occupancy_intent, 'MONTHLY_RENT'::public.occupancy_intent)

  union all
  select b.*, 'VISIT_SCHEDULED', 'MOVE_IN_CONFIRMED', 70
  from base b
  where b.legacy_grade in ('C', 'D')
    and b.visit_planned_at is not null

  union all
  select b.*, 'VISIT_DONE', 'REPEATED_NO_CONTACT', 80
  from base b
  where b.visit_status = 'VISITED'
),
reason_aggregate as (
  select
    project_id,
    unit_id,
    contract_id,
    legacy_grade,
    occupancy_intent,
    funding_status,
    move_in_status,
    effective_last_contact_at as last_contact_at,
    next_contact_at,
    array_agg(distinct reason_code order by reason_code) as reason_codes,
    array_agg(distinct problem_category order by problem_category) as problem_categories,
    min(priority_rank) as priority_rank
  from reason_rows
  group by project_id, unit_id, contract_id, legacy_grade, occupancy_intent, funding_status,
           move_in_status, effective_last_contact_at, next_contact_at
),
queue_rows as (
  select
    reason_aggregate.*,
    case
      when priority_rank <= 20 then 'HIGH'
      when priority_rank <= 50 then 'MEDIUM'
      else 'LOW'
    end as priority,
    md5(concat_ws('|',
      unit_id::text,
      contract_id::text,
      array_to_string(reason_codes, ','),
      coalesce(legacy_grade, ''),
      occupancy_intent::text,
      funding_status::text,
      move_in_status::text,
      coalesce(next_contact_at::text, ''),
      coalesce(last_contact_at::text, '')
    )) as source_fingerprint,
    -- 다음 관리일까지 미루기(SNOOZE) 판정용 사유 묶음. 시간 경과로 생기는 재접촉 사유(C·D 경과, 부재 재접촉)는 미루는 대상이라 빼고,
    -- 그 외 사유(장기 부재·방문상담·자금·매도임대·방문 예정·다음 관리일 도래)가 새로 생기면 지정일 전이라도 다시 표시
    'R:' || md5(concat_ws('|', unit_id::text, contract_id::text, array_to_string(array(
      select r from unnest(reason_codes) r where r not in ('C_GRADE_STALE', 'D_GRADE_STALE', 'ABSENCE_RETRY') order by r), ','))) as reason_fingerprint
  from reason_aggregate
)
select
  q.unit_id,
  q.contract_id,
  q.legacy_grade,
  q.occupancy_intent,
  q.funding_status,
  q.move_in_status,
  q.last_contact_at,
  q.next_contact_at,
  q.reason_codes,
  q.problem_categories,
  q.priority,
  q.source_fingerprint,
  q.reason_fingerprint
from queue_rows q
cross join clock
-- 오늘 완료(같은 상태 지문) 또는 다음 관리일 전 미루기(같은 사유 묶음)면 숨긴다
where not exists (
  select 1
  from public.move_in_tracking_disposition d
  where d.project_id = q.project_id
    and d.unit_id = q.unit_id
    and d.contract_id = q.contract_id
    and (
      (d.tracking_date = clock.tracking_date and d.source_fingerprint = q.source_fingerprint
       and (d.action = 'COMPLETE' or (d.action = 'SNOOZE' and d.snoozed_until > clock.now_at)))
      or (d.action = 'SNOOZE' and d.snoozed_until > clock.now_at and d.source_fingerprint = q.reason_fingerprint)
    )
)
order by q.priority_rank, q.unit_id;
$function$;
revoke all on function private.move_in_today_queue(uuid, timestamp with time zone, uuid) from public, anon, authenticated;
grant execute on function private.move_in_today_queue(uuid, timestamp with time zone, uuid) to authenticated;

CREATE OR REPLACE FUNCTION public.get_move_in_today_queue(p_project_id uuid, p_now timestamp with time zone)
 RETURNS TABLE(unit_id uuid, contract_id uuid, legacy_grade text, occupancy_intent occupancy_intent, funding_status funding_status, move_in_status move_in_status, last_contact_at timestamp with time zone, next_contact_at timestamp with time zone, reason_codes text[], problem_categories text[], priority text, source_fingerprint text)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
select q.unit_id, q.contract_id, q.legacy_grade, q.occupancy_intent, q.funding_status, q.move_in_status,
       q.last_contact_at, q.next_contact_at, q.reason_codes, q.problem_categories, q.priority, q.source_fingerprint
from private.move_in_today_queue(p_project_id, p_now, null) q;
$function$;

CREATE OR REPLACE FUNCTION public.complete_or_snooze_move_in_tracking(p_project_id uuid, p_unit_id uuid, p_action text, p_snoozed_until timestamp with time zone DEFAULT NULL::timestamp with time zone, p_note text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_member_id uuid;
  v_contract public.contract%rowtype;
  v_action text;
  v_fingerprint text;
  v_tracking_date date;
  v_disposition_id uuid;
  v_reason_fingerprint text;
  v_until timestamptz;
begin
  v_member_id := private.write_rpc_actor(p_project_id);

  select * into v_contract
  from public.contract c
  where c.project_id = p_project_id
    and c.unit_id = p_unit_id
    and c.contract_status = 'ACTIVE'::public.contract_status
  for update;
  if not found then
    raise exception 'active contract not found' using errcode = '23514';
  end if;
  perform private.require_field_customer_write_access(p_project_id, v_contract.customer_id, v_member_id);

  v_action := upper(btrim(coalesce(p_action, '')));
  if v_action not in ('COMPLETE', 'SNOOZE') then
    raise exception 'invalid tracking action' using errcode = '23514';
  end if;
  -- 미루기는 지정한 날(KST) 00:00까지. 오늘 이전이면 거부
  v_until := case when p_snoozed_until is null then null
                  else date_trunc('day', p_snoozed_until at time zone 'Asia/Seoul') at time zone 'Asia/Seoul' end;
  if (v_action = 'COMPLETE' and p_snoozed_until is not null)
    or (v_action = 'SNOOZE' and p_snoozed_until is null)
    or (v_until is not null and v_until <= now()) then
    raise exception 'invalid snooze time' using errcode = '23514';
  end if;

  -- 해당 세대만 판정한다(프로젝트 전체 재계산 없음). 이미 오늘 관리대상이 아니면 처리할 것이 없으므로 null
  select q.source_fingerprint, q.reason_fingerprint into v_fingerprint, v_reason_fingerprint
  from private.move_in_today_queue(p_project_id, now(), p_unit_id) q
  where q.unit_id = p_unit_id and q.contract_id = v_contract.contract_id;
  if v_fingerprint is null then
    return null;
  end if;

  v_tracking_date := (now() at time zone 'Asia/Seoul')::date;
  insert into public.move_in_tracking_disposition (
    project_id, unit_id, contract_id, tracking_date, source_fingerprint,
    action, snoozed_until, note, created_by
  ) values (
    p_project_id, p_unit_id, v_contract.contract_id, v_tracking_date,
    case when v_action = 'SNOOZE' then v_reason_fingerprint else v_fingerprint end,
    v_action, v_until,
    nullif(btrim(coalesce(p_note, '')), ''), v_member_id
  ) on conflict (project_id, unit_id, tracking_date, source_fingerprint) do update
  set action = excluded.action,
      snoozed_until = excluded.snoozed_until,
      note = excluded.note,
      created_by = excluded.created_by
  returning disposition_id into v_disposition_id;

  return v_disposition_id;
end;
$function$;

CREATE FUNCTION public.record_move_in_visit_result(p_project_id uuid, p_visit_target_id uuid, p_expected_contract_id uuid, p_result text, p_content text, p_occupancy_intent occupancy_intent, p_next_visit_at timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_member_id uuid;
  v_target public.move_in_visit_target%rowtype;
  v_consultation_id uuid;
begin
  v_member_id := private.write_rpc_actor(p_project_id);

  if p_result not in ('VISITED', 'REVISIT_NEEDED') then
    raise exception 'invalid visit result' using errcode = '23514';
  end if;
  if p_result = 'VISITED' and p_occupancy_intent is null then
    raise exception 'visit intent is required' using errcode = '23514';
  end if;
  if p_result = 'REVISIT_NEEDED' and p_occupancy_intent is not null then
    raise exception 'intent cannot be recorded without a completed visit' using errcode = '23514';
  end if;
  -- 다음 방문일은 재방문 필요(방문 부재)일 때만, 오늘 이후 날짜만 받는다
  if p_next_visit_at is not null and (p_result <> 'REVISIT_NEEDED' or p_next_visit_at <= now()) then
    raise exception 'invalid next visit date' using errcode = '23514';
  end if;

  select * into v_target
  from public.move_in_visit_target vt
  where vt.visit_target_id = p_visit_target_id
    and vt.project_id = p_project_id
  for update;
  if not found then
    raise exception 'visit target not found' using errcode = '23514';
  end if;
  if v_target.contract_id is distinct from p_expected_contract_id then
    raise exception 'visit target contract mismatch' using errcode = '23514';
  end if;
  if v_target.status not in ('VISIT_NEEDED', 'REVISIT_NEEDED') then
    raise exception 'visit target is closed' using errcode = '23514';
  end if;
  perform private.require_field_customer_write_access(p_project_id, v_target.customer_id, v_member_id);

  -- 기존 상담 저장 RPC(현재 ACTIVE 계약 재검증 포함)로 방문 상담을 남긴다.
  -- 재방문 필요 = 방문 부재: 부재로 저장되어 최종 접촉일·기본등급을 갱신하지 않는다.
  v_consultation_id := public.create_move_in_consultation(
    p_project_id := p_project_id,
    p_unit_id := v_target.unit_id,
    p_customer_id := v_target.customer_id,
    p_consultation_type := 'VISIT',
    p_content := p_content,
    p_expected_contract_id := v_target.contract_id,
    p_legacy_grade := case when p_result = 'REVISIT_NEEDED' then '부재' else null end,
    p_next_contact_at := p_next_visit_at,
    p_occupancy_intent := p_occupancy_intent,
    p_funding_status := null::public.funding_status,
    p_move_in_status := null::public.move_in_status,
    p_planned_move_in_date := null::date,
    p_balance_paid_at := null::timestamptz,
    p_actual_move_in_date := null::timestamptz,
    p_reason := null::text,
    p_business_purpose := null::text,
    p_clear_next_contact_at := false,
    p_operational_intent := null::public.operational_intent
  );

  update public.move_in_visit_target
  set status = p_result,
      visit_intent = case when p_result = 'VISITED' then p_occupancy_intent else visit_intent end,
      visit_count = visit_count + 1,
      last_visit_consultation_id = v_consultation_id,
      last_visited_at = now(),
      updated_by = v_member_id,
      updated_at = now()
  where visit_target_id = v_target.visit_target_id;

  return v_consultation_id;
end;
$function$;
revoke all on function public.record_move_in_visit_result(uuid, uuid, uuid, text, text, public.occupancy_intent, timestamp with time zone) from public, anon;
grant execute on function public.record_move_in_visit_result(uuid, uuid, uuid, text, text, public.occupancy_intent, timestamp with time zone) to authenticated;

CREATE OR REPLACE FUNCTION public.record_move_in_visit_result(p_project_id uuid, p_visit_target_id uuid, p_expected_contract_id uuid, p_result text, p_content text, p_occupancy_intent occupancy_intent DEFAULT NULL::occupancy_intent)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
select public.record_move_in_visit_result(p_project_id, p_visit_target_id, p_expected_contract_id, p_result, p_content, p_occupancy_intent, null::timestamptz);
$function$;

commit;
