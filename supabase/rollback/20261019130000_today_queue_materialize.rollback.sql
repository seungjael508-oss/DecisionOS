-- 20261019130000_today_queue_materialize 롤백: private.move_in_today_queue를 A6(문자 판정 수정본) 정의로 되돌린다. 데이터 변경 없음.
begin;

do $preflight$
declare
  v_def text;
begin
  select pg_get_functiondef(oid) into v_def from pg_proc
  where oid = to_regprocedure('private.move_in_today_queue(uuid,timestamp with time zone,uuid)');
  if v_def is null or position('latest_message_at' in v_def) = 0
     or (position('contact_aggregate as materialized' in v_def) > 0) is distinct from true then
    raise exception 'private.move_in_today_queue is not the expected A9 definition; abort';
  end if;
  perform set_config('lock_timeout', '5s', true);
end
$preflight$;

CREATE OR REPLACE FUNCTION private.move_in_today_queue(p_project_id uuid, p_now timestamp with time zone, p_unit_id uuid)
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

commit;
