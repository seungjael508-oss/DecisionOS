-- 오늘 관리대상 C·D등급 집중관리 (Production 미적용, 별도 승인 필요)
-- 선행: 20261009100000_absent_contact_separation 적용 후에만 실행
-- 1) 대상: 현재 ACTIVE 계약자 중 기본등급 C 또는 D만
-- 2) FOLLOW_UP_DUE(다음 접촉 도래) 선정 사유 제외
-- 3) 유지 사유: D_GRADE_STALE, C_GRADE_STALE, C_GRADE_FUNDING, ABSENCE_RETRY, SALE_TRACKING, VISIT_SCHEDULED
-- 4) 부재는 시도(latest_attempt_at), 실제 접촉일(effective_last_contact_at)과 분리 유지
-- 5) 상담이력·방문일정은 현재 계약자 기준만 사용
-- 6) 세대당 1행(reason_aggregate)
-- 정책값(move_in_tracking_policy)은 변경하지 않음. 미등록 사유는 기존대로 선정되지 않음.
-- CREATE OR REPLACE는 signature·owner·ACL을 유지한다. 상담 저장 RPC는 변경하지 않음.
begin;

-- 사전 점검: 20261009 정의(부재 분리, FOLLOW_UP_DUE 포함)가 아니면 중단
do $preflight$
declare
  v_def text;
begin
  select pg_get_functiondef(oid) into v_def
  from pg_proc
  where pronamespace = 'public'::regnamespace and proname = 'get_move_in_today_queue';
  if v_def is null
     or position('latest_absent_at' in v_def) = 0
     or position('FOLLOW_UP_DUE' in v_def) = 0 then
    raise exception 'get_move_in_today_queue is not the 20261009 definition; abort';
  end if;
  -- 처리 기록은 당일 source_fingerprint로만 매칭된다. 사유 목록이 바뀌면 오늘 처리한 세대가 다시 노출되므로
  -- 오늘(KST) 처리 기록이 있으면 적용하지 않는다(다음 날 적용)
  if exists (
    select 1 from public.move_in_tracking_disposition
    where tracking_date = (now() at time zone 'Asia/Seoul')::date
  ) then
    raise exception 'move_in_tracking_disposition has rows for today; apply on a day without dispositions';
  end if;
  perform set_config('lock_timeout', '5s', true);
end
$preflight$;

CREATE OR REPLACE FUNCTION public.get_move_in_today_queue(p_project_id uuid, p_now timestamp with time zone)
 RETURNS TABLE(unit_id uuid, contract_id uuid, legacy_grade text, occupancy_intent occupancy_intent, funding_status funding_status, move_in_status move_in_status, last_contact_at timestamp with time zone, next_contact_at timestamp with time zone, reason_codes text[], problem_categories text[], priority text, source_fingerprint text)
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
-- 집중관리 대상: 현재 ACTIVE 계약자의 기본등급 C·D만
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
    and uos.legacy_grade in ('C', 'D')
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
contact_aggregate as (
  select
    k.unit_id,
    max(k.consulted_at) filter (where (k.structured_tags->>'legacy_grade') is distinct from '부재') as latest_real_contact_at,
    max(k.consulted_at) as latest_attempt_at,
    max(k.consulted_at) filter (where (k.structured_tags->>'legacy_grade') = '부재') as latest_absent_at
  from public.consultation k
  join active_units au
    on au.unit_id = k.unit_id
   and au.customer_id = k.customer_id
  where k.project_id = p_project_id
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
    -- 기존 last_contact_at이 부재 시도 시각과 같으면(구 RPC 오염값) 실제 접촉으로 보지 않음
    greatest(
      contact_aggregate.latest_real_contact_at,
      case when active_units.last_contact_at is not distinct from contact_aggregate.latest_absent_at then null
           else active_units.last_contact_at end
    ) as effective_last_contact_at,
    contact_aggregate.latest_attempt_at,
    (contact_aggregate.latest_absent_at is not null
      and contact_aggregate.latest_absent_at = contact_aggregate.latest_attempt_at) as latest_is_absent,
    visit_schedule.visit_planned_at
  from active_units
  left join contact_aggregate on contact_aggregate.unit_id = active_units.unit_id
  left join visit_schedule on visit_schedule.unit_id = active_units.unit_id
),
reason_rows as (
  select b.*, 'D_GRADE_STALE'::text as reason_code, 'REPEATED_NO_CONTACT'::text as problem_category, 20 as priority_rank
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
  where b.latest_is_absent
    and b.latest_attempt_at <= clock.now_at - policy.stale_after

  union all
  select b.*, 'SALE_TRACKING', 'SALE', 60
  from base b
  where b.occupancy_intent in ('SALE'::public.occupancy_intent, 'JEONSE'::public.occupancy_intent, 'MONTHLY_RENT'::public.occupancy_intent)

  union all
  select b.*, 'VISIT_SCHEDULED', 'MOVE_IN_CONFIRMED', 70
  from base b
  where b.visit_planned_at is not null
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
    )) as source_fingerprint
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
  q.source_fingerprint
from queue_rows q
cross join clock
left join public.move_in_tracking_disposition d
  on d.project_id = q.project_id
 and d.unit_id = q.unit_id
 and d.contract_id = q.contract_id
 and d.tracking_date = clock.tracking_date
 and d.source_fingerprint = q.source_fingerprint
where d.disposition_id is null
   or (d.action = 'SNOOZE' and d.snoozed_until <= clock.now_at)
order by q.priority_rank, q.unit_id;
$function$;

commit;
