-- Clean rebuild: consultation remains the authoritative event; schedule is history.
-- The legacy 15-argument invocation remains valid through defaults on the new signature.

drop function public.create_move_in_consultation(
  uuid, uuid, uuid, text, text, text, timestamptz,
  public.occupancy_intent, public.funding_status, public.move_in_status,
  date, timestamptz, timestamptz, text, text
);

create function public.create_move_in_consultation(
  p_project_id uuid,
  p_unit_id uuid,
  p_customer_id uuid,
  p_consultation_type text,
  p_content text,
  p_legacy_grade text default null,
  p_next_contact_at timestamptz default null,
  p_occupancy_intent public.occupancy_intent default null,
  p_funding_status public.funding_status default null,
  p_move_in_status public.move_in_status default null,
  p_planned_move_in_date date default null,
  p_balance_paid_at timestamptz default null,
  p_actual_move_in_date timestamptz default null,
  p_reason text default null,
  p_business_purpose text default null,
  p_clear_next_contact_at boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
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
    p_last_contact_at := v_consulted_at,
    p_next_contact_at := p_next_contact_at,
    p_clear_next_contact_at := coalesce(p_clear_next_contact_at, false),
    p_contact_id := v_consultation_id,
    p_reason := nullif(btrim(coalesce(p_reason, '')), '')
  );

  if v_grade is not null then
    update public.unit_occupancy_status
    set legacy_grade = v_grade,
        legacy_grade_as_of = v_consulted_at,
        updated_by = v_member_id
    where project_id = p_project_id
      and contract_id = v_contract.contract_id
      and unit_id = p_unit_id;
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
$$;

create function public.complete_or_snooze_move_in_tracking(
  p_project_id uuid,
  p_unit_id uuid,
  p_action text,
  p_snoozed_until timestamptz default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

revoke all on function public.create_move_in_consultation(
  uuid, uuid, uuid, text, text, text, timestamptz,
  public.occupancy_intent, public.funding_status, public.move_in_status,
  date, timestamptz, timestamptz, text, text, boolean
) from public, anon;
revoke all on function public.complete_or_snooze_move_in_tracking(uuid, uuid, text, timestamptz, text) from public, anon;
grant execute on function public.create_move_in_consultation(
  uuid, uuid, uuid, text, text, text, timestamptz,
  public.occupancy_intent, public.funding_status, public.move_in_status,
  date, timestamptz, timestamptz, text, text, boolean
) to authenticated;
grant execute on function public.complete_or_snooze_move_in_tracking(uuid, uuid, text, timestamptz, text) to authenticated;
