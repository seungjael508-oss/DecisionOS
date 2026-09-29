-- Operational intent is a current field-operation snapshot, separate from occupancy intent.
create type public.operational_intent as enum (
  'MOVE_IN',
  'CONSIDERING_MOVE_IN',
  'SALE_TRANSFER',
  'RENT',
  'TERMINATION',
  'ABANDONMENT',
  'UNDECIDED'
);

alter table public.unit_occupancy_status
  add column operational_intent public.operational_intent not null default 'UNDECIDED',
  add column operational_intent_as_of timestamptz;

create index idx_uos_project_operational_intent
  on public.unit_occupancy_status (project_id, operational_intent);

alter table public.contract_status_history
  drop constraint contract_status_history_field_changed_check;

alter table public.contract_status_history
  add constraint contract_status_history_field_changed_check
  check (
    field_changed in (
      'occupancy_intent',
      'funding_status',
      'move_in_status',
      'operational_intent'
    )
  );

-- Task 2: extend the existing consultation RPC without changing the prior
-- clean-rebuild migrations. Calls with the former 16 arguments resolve through
-- the trailing default; no final-intent selection leaves its snapshot untouched.
drop function public.create_move_in_consultation(
  uuid, uuid, uuid, text, text, text, timestamptz,
  public.occupancy_intent, public.funding_status, public.move_in_status,
  date, timestamptz, timestamptz, text, text, boolean
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
  p_clear_next_contact_at boolean default false,
  p_operational_intent public.operational_intent default null
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
$$;

revoke all on function public.create_move_in_consultation(
  uuid, uuid, uuid, text, text, text, timestamptz,
  public.occupancy_intent, public.funding_status, public.move_in_status,
  date, timestamptz, timestamptz, text, text, boolean, public.operational_intent
) from public, anon;
grant execute on function public.create_move_in_consultation(
  uuid, uuid, uuid, text, text, text, timestamptz,
  public.occupancy_intent, public.funding_status, public.move_in_status,
  date, timestamptz, timestamptz, text, text, boolean, public.operational_intent
) to authenticated;
