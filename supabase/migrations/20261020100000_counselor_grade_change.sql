-- 현장 상담사 등급 직접 변경 허용 + 수동 등급 변경 이력 (Production 미적용, 별도 승인 필요)
-- 선행: 20261019100000_absence_streak_rule_fast_path(A5) 적용 후에만 실행. A6~A9와 순서 무관(이 함수를 바꾸지 않음).
-- create_move_in_consultation(17)만 교체. 18인자(계약 경합 방어)·record_move_in_visit_result는 17인자를 호출하므로 함께 적용된다.
-- 1) D 전환: PROJECT_ADMIN·COUNSELOR 허용(A3 관리자 가드 완화). CLIENT_MANAGER 등 그 외 역할은 기존 정책 유지(PROJECT_ADMIN 확인).
--    비활성·타 프로젝트·익명은 write_rpc_actor에서, 미배정 고객은 require_field_customer_write_access에서 기존처럼 차단.
-- 2) A/B/C/D 수동 변경 시 contract_status_history(field_changed = 'legacy_grade', reason '수동 변경(상담 저장)') 기록.
--    자동 D(연속 전화 부재 3회, reason '장기 부재중(연속 3회)')·방문대상 등록 블록은 A5와 같다.
-- 그 외 동작은 A5 정의와 같다. CREATE OR REPLACE로 signature·owner·ACL 유지. 데이터는 바꾸지 않는다(신규 저장부터 적용).
begin;

do $preflight$
declare
  v_def text;
begin
  select pg_get_functiondef(oid) into v_def
  from pg_proc
  where pronamespace = 'public'::regnamespace and proname = 'create_move_in_consultation' and pronargs = 17;
  -- A5 정의(부재 접촉 유형 규칙 + D 관리자 가드)이고 아직 이 변경이 없을 때만 적용
  if v_def is null
     or position('move_in_absence_contact_type' in v_def) = 0
     or position('v_absence_streak' in v_def) = 0
     or position('perform private.require_project_admin(p_project_id, v_member_id)' in v_def) = 0
     or position('v_member_role' in v_def) > 0 then
    raise exception 'create_move_in_consultation(17) is not the 20261019100000 definition; abort';
  end if;
  if to_regprocedure('private.require_project_admin(uuid,uuid)') is null
     or to_regprocedure('private.write_rpc_actor(uuid)') is null then
    raise exception 'required functions missing; abort';
  end if;
  -- 등급 변경 이력 값('legacy_grade')이 허용되어 있어야 한다(A2)
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.contract_status_history'::regclass and contype = 'c'
      and position('legacy_grade' in pg_get_constraintdef(oid)) > 0
  ) then
    raise exception 'contract_status_history does not allow legacy_grade; abort';
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
  v_grade_before text;
  v_absence_streak integer;
  v_auto_grade_before text;
  v_member_role public.project_member_role;
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

  -- 기본등급(A/B/C/D) 선택 시 현재 등급을 잠그고 읽는다(수동 변경 이력·D 전환 권한 확인).
  -- D 전환은 현장 관리자(PROJECT_ADMIN)·상담사(COUNSELOR)가 직접 할 수 있다. 그 외 역할은 기존처럼
  -- PROJECT_ADMIN 확인을 거친다(= 차단). 역할은 위 write_rpc_actor가 확인한 본인의 활성 멤버 행에서만 읽으며
  -- 권한을 올리지 않는다. 고객 접근(상담사 배정)·ACTIVE 계약 확인은 위 검사 그대로다.
  if v_grade in ('A', 'B', 'C', 'D') then
    select uos.legacy_grade into v_grade_before
    from public.unit_occupancy_status uos
    where uos.project_id = p_project_id
      and uos.unit_id = p_unit_id
      and uos.contract_id = v_contract.contract_id
    for update;
    if v_grade = 'D' and v_grade_before is distinct from 'D' then
      select m.role into v_member_role
      from public.project_member m
      where m.id = v_member_id
        and m.project_id = p_project_id
        and m.user_id = auth.uid()
        and m.active;
      if v_member_role is distinct from 'COUNSELOR'::public.project_member_role then
        perform private.require_project_admin(p_project_id, v_member_id);
      end if;
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

    -- 수동 등급 변경 이력. 자동 D('장기 부재중(연속 3회)')와 사유로 구분한다. 같은 등급 재확인은 이력 없음.
    -- 상담 기록과 같은 트랜잭션이므로 저장 실패 시 상담·등급·이력이 함께 취소된다.
    if found and v_grade_before is distinct from v_grade then
      insert into public.contract_status_history (
        project_id, contract_id, unit_id, field_changed,
        previous_value, new_value, reason, contact_id, changed_by, changed_at
      ) values (
        p_project_id, v_contract.contract_id, p_unit_id, 'legacy_grade',
        v_grade_before, v_grade, '수동 변경(상담 저장)', v_consultation_id,
        v_member_id, v_consulted_at
      );
    end if;
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
      and private.move_in_absence_contact_type(k.project_id, k.contact_type, k.channel, k.structured_tags) = 'CALL'
      and k.structured_tags->>'legacy_grade' = '부재'
      and k.consulted_at > coalesce((
        select max(r.consulted_at)
        from public.consultation r
        where r.project_id = p_project_id
          and r.unit_id = p_unit_id
          and r.customer_id = p_customer_id
          and (r.structured_tags->>'legacy_grade') is distinct from '부재'
          and r.contact_type is distinct from 'MESSAGE'
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

commit;
