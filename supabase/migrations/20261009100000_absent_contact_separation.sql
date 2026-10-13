-- 부재 처리 데이터 무결성 수정안 (Production 미적용, 별도 승인 필요)
-- 1) create_move_in_consultation(17): 부재·상담거절 저장 시 기본등급 미갱신, 부재는 last_contact_at도 미갱신
--    (상담거절은 고객이 응답한 실제 접촉이므로 최종 접촉일 갱신)
--    18인자(계약 경합 방어)는 17인자를 그대로 호출하므로 변경하지 않음
-- 2) get_move_in_today_queue: 현재 계약자 상담만 사용, C/D 재접촉은 실제 접촉일 기준,
--    부재 재접촉은 마지막 시도일 기준
-- CREATE OR REPLACE는 signature·owner·ACL을 유지한다. 기존 부재 18세대 등급은 변경하지 않음.
begin;

-- 사전 점검: 운영 정의가 진단 시점(2026-10-09)과 다르면 아무것도 바꾸지 않고 중단
do $preflight$
begin
  if (select md5(pg_get_functiondef(oid)) from pg_proc where pronamespace = 'public'::regnamespace
        and proname = 'create_move_in_consultation' and pronargs = 17) is distinct from 'effdccd8899fe1cfbe997c7a68d3f7a4'
     or (select md5(pg_get_functiondef(oid)) from pg_proc where pronamespace = 'public'::regnamespace
        and proname = 'create_move_in_consultation' and pronargs = 18) is distinct from '7616f0e103239a9cf9f71e10bba1daa1'
     or (select md5(pg_get_functiondef(oid)) from pg_proc where pronamespace = 'public'::regnamespace
        and proname = 'get_move_in_today_queue') is distinct from 'cc2e005a30921e116f1d70c1619f8fcd' then
    raise exception 'unexpected function definition; abort';
  end if;
  perform set_config('lock_timeout', '5s', true);
end
$preflight$;

CREATE OR REPLACE FUNCTION public.create_move_in_consultation(p_project_id uuid, p_unit_id uuid, p_customer_id uuid, p_consultation_type text, p_content text, p_legacy_grade text DEFAULT NULL::text, p_next_contact_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_occupancy_intent occupancy_intent DEFAULT NULL::occupancy_intent, p_funding_status funding_status DEFAULT NULL::funding_status, p_move_in_status move_in_status DEFAULT NULL::move_in_status, p_planned_move_in_date date DEFAULT NULL::date, p_balance_paid_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_actual_move_in_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_reason text DEFAULT NULL::text, p_business_purpose text DEFAULT NULL::text, p_clear_next_contact_at boolean DEFAULT false, p_operational_intent operational_intent DEFAULT NULL::operational_intent)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_member_id uuid;
  v_content text;
  v_type text;
  v_contact varchar;
  v_purpose varchar;
  v_grade text;
  v_contract public.contract%rowtype;
  v_consulted_at timestamptz;
  v_consultation_id uuid;
  v_operational_before public.operational_intent;
begin
  v_member_id := private.write_rpc_actor(p_project_id);
  perform private.require_field_customer_write_access(p_project_id, p_customer_id, v_member_id);

  v_content := btrim(coalesce(p_content, ''));
  if v_content = '' then
    raise exception 'content is required' using errcode = '23514';
  end if;
  if coalesce(p_clear_next_contact_at, false) and p_next_contact_at is not null then
    raise exception 'clear flag cannot be combined with a next contact value' using errcode = '23514';
  end if;

  v_type := btrim(coalesce(p_consultation_type, ''));
  if v_type = 'OUTBOUND' then
    v_contact := 'CALL'; v_purpose := 'OUTBOUND';
  elsif v_type = 'INBOUND' then
    v_contact := 'CALL'; v_purpose := 'INBOUND';
  elsif v_type = 'VISIT' then
    v_contact := 'VISIT'; v_purpose := 'VISIT';
  elsif v_type = 'MESSAGE' then
    v_contact := 'MESSAGE'; v_purpose := 'MESSAGE';
  else
    raise exception 'invalid consultation type' using errcode = '23514';
  end if;

  if p_business_purpose is not null then
    if p_business_purpose not in ('성향파악', '입주안내', '잔금독촉', '매칭안내', '기타') then
      raise exception 'invalid business purpose' using errcode = '23514';
    end if;
    v_purpose := p_business_purpose;
  end if;

  v_grade := nullif(btrim(coalesce(p_legacy_grade, '')), '');
  if v_grade is not null and v_grade not in ('A', 'B', 'C', 'D', '부재', '상담거절') then
    raise exception 'invalid legacy grade' using errcode = '23514';
  end if;

  select * into v_contract
  from public.contract c
  where c.project_id = p_project_id
    and c.unit_id = p_unit_id
    and c.customer_id = p_customer_id
    and c.contract_status = 'ACTIVE'::public.contract_status
  for update;
  if not found then
    raise exception 'active contract not found' using errcode = '23514';
  end if;

  v_consulted_at := now();
  insert into public.consultation (
    project_id, customer_id, counselor_id, consulted_at, content, created_by,
    unit_id, contact_type, stage, purpose, structured_tags, next_action_at
  ) values (
    p_project_id, p_customer_id, v_member_id, v_consulted_at, v_content, v_member_id,
    p_unit_id, v_contact, 'MOVE_IN', v_purpose,
    jsonb_strip_nulls(jsonb_build_object('legacy_grade', v_grade, 'consultation_type', v_type)),
    p_next_contact_at
  ) returning id into v_consultation_id;

  perform public.update_unit_occupancy_status(
    p_project_id := p_project_id,
    p_unit_id := p_unit_id,
    p_contract_id := v_contract.contract_id,
    p_occupancy_intent := p_occupancy_intent,
    p_funding_status := p_funding_status,
    p_move_in_status := p_move_in_status,
    p_planned_move_in_date := p_planned_move_in_date,
    p_balance_paid_at := p_balance_paid_at,
    p_actual_move_in_date := p_actual_move_in_date,
    -- 부재는 실제 접촉이 아니므로 최종 접촉일을 갱신하지 않음(NULL = 기존 값 유지)
    p_last_contact_at := case when v_grade = '부재' then null else v_consulted_at end,
    p_next_contact_at := p_next_contact_at,
    p_clear_next_contact_at := coalesce(p_clear_next_contact_at, false),
    p_contact_id := v_consultation_id,
    p_reason := nullif(btrim(coalesce(p_reason, '')), '')
  );

  -- 부재·상담거절은 접촉 결과(상담이력 structured_tags에 기록)이지 기본등급이 아님.
  -- 기본등급은 A/B/C/D 선택 시에만 변경한다.
  if v_grade in ('A', 'B', 'C', 'D') then
    update public.unit_occupancy_status
    set legacy_grade = v_grade,
        legacy_grade_as_of = v_consulted_at,
        updated_by = v_member_id
    where project_id = p_project_id
      and contract_id = v_contract.contract_id
      and unit_id = p_unit_id;
  end if;

  -- A final intent changes only when the caller explicitly selects one. The
  -- snapshot is locked against the verified current ACTIVE contract above.
  if p_operational_intent is not null then
    select uos.operational_intent into v_operational_before
    from public.unit_occupancy_status uos
    where uos.project_id = p_project_id
      and uos.unit_id = p_unit_id
      and uos.contract_id = v_contract.contract_id
    for update;
    if not found then
      raise exception 'unit occupancy status not found' using errcode = '23514';
    end if;

    update public.unit_occupancy_status
    set operational_intent = p_operational_intent,
        operational_intent_as_of = v_consulted_at,
        updated_by = v_member_id
    where project_id = p_project_id
      and unit_id = p_unit_id
      and contract_id = v_contract.contract_id;

    if p_operational_intent is distinct from v_operational_before then
      insert into public.contract_status_history (
        project_id, contract_id, unit_id, field_changed,
        previous_value, new_value, reason, contact_id, changed_by, changed_at
      ) values (
        p_project_id, v_contract.contract_id, p_unit_id, 'operational_intent',
        v_operational_before::text, p_operational_intent::text,
        nullif(btrim(coalesce(p_reason, '')), ''), v_consultation_id,
        v_member_id, v_consulted_at
      );
    end if;
  end if;

  -- A completed consultation closes only its due schedules. Future pending schedules
  -- are superseded before a new next-contact schedule is inserted.
  update public.contact_schedule
  set status = 'SENT'::public.contact_schedule_status,
      actual_sent_at = v_consulted_at,
      result_consultation_id = v_consultation_id
  where project_id = p_project_id
    and unit_id = p_unit_id
    and contract_id = v_contract.contract_id
    and status = 'PENDING'::public.contact_schedule_status
    and planned_at <= v_consulted_at;

  update public.contact_schedule
  set status = 'SKIPPED'::public.contact_schedule_status
  where project_id = p_project_id
    and unit_id = p_unit_id
    and contract_id = v_contract.contract_id
    and status = 'PENDING'::public.contact_schedule_status;

  if p_next_contact_at is not null then
    insert into public.contact_schedule (
      project_id, customer_id, contract_id, unit_id, contact_type, planned_at, status, created_by
    ) values (
      p_project_id, p_customer_id, v_contract.contract_id, p_unit_id,
      v_contact, p_next_contact_at, 'PENDING'::public.contact_schedule_status, v_member_id
    );
  end if;

  return v_consultation_id;
end;
$function$;

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
visit_schedule as (
  select cs.unit_id, min(cs.planned_at) as visit_planned_at
  from public.contact_schedule cs
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
  select b.*, 'FOLLOW_UP_DUE'::text as reason_code, 'UNKNOWN'::text as problem_category, 10 as priority_rank
  from base b cross join clock
  where b.next_contact_at is not null and b.next_contact_at <= clock.now_at

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
  -- 부재 재접촉: 최신 기록이 부재이거나(신규 저장) 기존 등급값이 부재인 세대. 경과는 마지막 시도 기준
  where (b.latest_is_absent or b.legacy_grade = '부재')
    and (coalesce(b.latest_attempt_at, b.effective_last_contact_at) is null
         or coalesce(b.latest_attempt_at, b.effective_last_contact_at) <= clock.now_at - policy.stale_after)

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
