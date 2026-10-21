-- 20261019100000_absence_streak_rule_fast_path 롤백
-- 장기 부재 후보 함수·상담 저장 RPC(17)를 20261017120000 상태로 되돌리고 보조 함수를 삭제한다.
-- 데이터는 바꾸지 않는다(이미 자동 전환된 D등급·이력·방문대상은 유지).
begin;

CREATE OR REPLACE FUNCTION public.get_move_in_absence_candidates(p_project_id uuid)
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
  select k.unit_id, k.consulted_at, k.contact_type, k.structured_tags->>'legacy_grade' as grade_tag
  from public.consultation k
  join current_holder h
    on h.unit_id = k.unit_id
   and h.customer_id = k.customer_id
  where k.project_id = p_project_id
),
contact_aggregate as (
  select
    unit_id,
    max(consulted_at) filter (where grade_tag is distinct from '부재') as latest_real_contact_at,
    max(consulted_at) filter (where grade_tag = '부재') as latest_absent_at,
    max(consulted_at) as latest_attempt_at
  from holder_consultation
  group by unit_id
),
-- 마지막 실제 접촉 이후의 전화 부재만 센다(실제 접촉 = 초기화). 같은 시각이면 실제 접촉 우선
streak as (
  select hc.unit_id, count(*)::integer as absence_streak
  from holder_consultation hc
  join contact_aggregate ca on ca.unit_id = hc.unit_id
  where hc.grade_tag = '부재'
    and hc.contact_type = 'CALL'
    and (ca.latest_real_contact_at is null or hc.consulted_at > ca.latest_real_contact_at)
  group by hc.unit_id
),
open_visit as (
  select vt.unit_id, vt.contract_id, vt.visit_target_id, vt.status
  from public.move_in_visit_target vt
  where vt.project_id = p_project_id
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
  v_grade_before text;
  v_absence_streak integer;
  v_auto_grade_before text;
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

  -- 기본등급을 D로 바꾸는 저장은 PROJECT_ADMIN만 허용한다(관리자 승인 없는 D 전환 차단).
  -- 이미 D인 세대의 D 재확인, A/B/C·부재·상담거절·등급 미선택 저장은 기존과 같다.
  if v_grade = 'D' then
    select uos.legacy_grade into v_grade_before
    from public.unit_occupancy_status uos
    where uos.project_id = p_project_id
      and uos.unit_id = p_unit_id
      and uos.contract_id = v_contract.contract_id
    for update;
    if v_grade_before is distinct from 'D' then
      perform private.require_project_admin(p_project_id, v_member_id);
    end if;
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

  -- 장기 부재 자동 전환: 이번 저장이 현재 계약자 전화 부재이고, 마지막 실제 접촉(부재 외 상담) 이후
  -- 전화 부재가 3회 이상이면 기본등급을 D로 바꾸고 방문상담 대상으로 등록한다.
  -- 신규 부재 저장 시점에만 동작(과거 기록 일괄 변경 없음). 추적 제외 세대는 대상 아님.
  -- 계약 행 FOR UPDATE 잠금(위)으로 같은 계약의 동시 저장은 직렬화되고, 방문대상은 부분 유일 인덱스로 1건만 생긴다.
  -- 접촉상태(부재)·입주 의향은 이 블록에서 바꾸지 않는다. 상담 성공 후 등급 재조정은 상담사가 수동으로 한다.
  if v_grade = '부재' and v_contact = 'CALL'
     and not exists (
       select 1 from public.move_in_tracking_exclusion x
       where x.project_id = p_project_id and x.unit_id = p_unit_id
         and x.contract_id = v_contract.contract_id and x.active
     ) then
    select count(*)::integer into v_absence_streak
    from public.consultation k
    where k.project_id = p_project_id
      and k.unit_id = p_unit_id
      and k.customer_id = p_customer_id
      and k.contact_type = 'CALL'
      and k.structured_tags->>'legacy_grade' = '부재'
      and k.consulted_at > coalesce((
        select max(r.consulted_at)
        from public.consultation r
        where r.project_id = p_project_id
          and r.unit_id = p_unit_id
          and r.customer_id = p_customer_id
          and (r.structured_tags->>'legacy_grade') is distinct from '부재'
      ), '-infinity'::timestamptz);

    if v_absence_streak >= 3 then
      select uos.legacy_grade into v_auto_grade_before
      from public.unit_occupancy_status uos
      where uos.project_id = p_project_id
        and uos.unit_id = p_unit_id
        and uos.contract_id = v_contract.contract_id
      for update;
      if not found then
        raise exception 'unit occupancy status not found' using errcode = '23514';
      end if;

      -- 기존 D등급은 중복 변경·이력 없음
      if v_auto_grade_before is distinct from 'D' then
        update public.unit_occupancy_status
        set legacy_grade = 'D',
            legacy_grade_as_of = v_consulted_at,
            updated_by = v_member_id
        where project_id = p_project_id
          and unit_id = p_unit_id
          and contract_id = v_contract.contract_id;

        insert into public.contract_status_history (
          project_id, contract_id, unit_id, field_changed,
          previous_value, new_value, reason, contact_id, changed_by, changed_at
        ) values (
          p_project_id, v_contract.contract_id, p_unit_id, 'legacy_grade',
          v_auto_grade_before, 'D', '장기 부재중(연속 3회)', v_consultation_id,
          v_member_id, v_consulted_at
        );
      end if;

      insert into public.move_in_visit_target (
        project_id, unit_id, contract_id, customer_id, status, source,
        absence_streak_at_open, grade_before, grade_changed, created_by, updated_by
      ) values (
        p_project_id, p_unit_id, v_contract.contract_id, p_customer_id, 'VISIT_NEEDED', 'ABSENCE_STREAK',
        v_absence_streak, v_auto_grade_before, v_auto_grade_before is distinct from 'D', v_member_id, v_member_id
      )
      on conflict (project_id, contract_id) where status in ('VISIT_NEEDED', 'REVISIT_NEEDED') do nothing;
    end if;
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

drop function if exists private.move_in_absence_candidates_full_view(uuid);
drop function if exists private.move_in_absence_contact_type(uuid, text, text, jsonb);

commit;
