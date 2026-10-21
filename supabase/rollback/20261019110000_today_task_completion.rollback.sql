-- 20261019110000_today_task_completion 롤백
-- 오늘 관리대상·완료 RPC·방문 결과 RPC(6인자)를 이전 정의로 되돌리고 추가 객체를 삭제한다.
-- 처리 기록(move_in_tracking_disposition) 행은 지우지 않는다. 이전 규칙에서는 'R:' 미루기 행이 어떤 세대와도 맞지 않아 영향이 없다.
-- 다음 방문일로 저장된 연락 일정·상담은 운영 기록이므로 되돌리지 않는다.
begin;

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
-- 연속 전화 부재 3회 이상(현재 계약자 기준)
absence as (
  select cand.unit_id, cand.contract_id, cand.absence_streak
  from public.get_move_in_absence_candidates(p_project_id) cand
),
-- 진행 중 방문대상 + 오늘 방문 완료
visit_target as (
  select vt.unit_id, vt.contract_id, vt.status
  from public.move_in_visit_target vt
  cross join clock
  where vt.project_id = p_project_id
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
  if (v_action = 'COMPLETE' and p_snoozed_until is not null)
    or (v_action = 'SNOOZE' and p_snoozed_until is null)
    or (p_snoozed_until is not null and p_snoozed_until <= now()) then
    raise exception 'invalid snooze time' using errcode = '23514';
  end if;

  select q.source_fingerprint into v_fingerprint
  from public.get_move_in_today_queue(p_project_id, now()) q
  where q.unit_id = p_unit_id;
  if v_fingerprint is null then
    raise exception 'unit is not currently tracked' using errcode = '23514';
  end if;

  v_tracking_date := (now() at time zone 'Asia/Seoul')::date;
  insert into public.move_in_tracking_disposition (
    project_id, unit_id, contract_id, tracking_date, source_fingerprint,
    action, snoozed_until, note, created_by
  ) values (
    p_project_id, p_unit_id, v_contract.contract_id, v_tracking_date, v_fingerprint,
    v_action, case when v_action = 'SNOOZE' then p_snoozed_until else null end,
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

CREATE OR REPLACE FUNCTION public.record_move_in_visit_result(p_project_id uuid, p_visit_target_id uuid, p_expected_contract_id uuid, p_result text, p_content text, p_occupancy_intent occupancy_intent DEFAULT NULL::occupancy_intent)
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
    p_next_contact_at := null::timestamptz,
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

drop function if exists public.record_move_in_visit_result(uuid, uuid, uuid, text, text, public.occupancy_intent, timestamp with time zone);
drop function if exists private.move_in_today_queue(uuid, timestamp with time zone, uuid);
drop function if exists private.move_in_absence_candidates_for_unit(uuid, uuid);

commit;
