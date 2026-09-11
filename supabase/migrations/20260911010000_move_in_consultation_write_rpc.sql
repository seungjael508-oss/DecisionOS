-- MOVE_IN consultation write RPC. No table/ENUM/RLS changes. Does not rewrite M10 RPCs.

create or replace function public.create_move_in_consultation(
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
  p_reason text default null
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
  v_id uuid;
  v_want_occupancy boolean;
begin
  v_member_id := private.write_rpc_actor(p_project_id);
  perform private.require_customer_write_access(
    p_project_id, p_customer_id, v_member_id
  );

  v_content := btrim(coalesce(p_content, ''));
  if v_content = '' then
    raise exception 'content is required' using errcode = '23514';
  end if;

  v_type := btrim(coalesce(p_consultation_type, ''));
  if v_type = 'OUTBOUND' then
    v_contact := 'CALL';
    v_purpose := 'OUTBOUND';
  elsif v_type = 'INBOUND' then
    v_contact := 'CALL';
    v_purpose := 'INBOUND';
  elsif v_type = 'VISIT' then
    v_contact := 'VISIT';
    v_purpose := 'VISIT';
  elsif v_type = 'MESSAGE' then
    v_contact := 'MESSAGE';
    v_purpose := 'MESSAGE';
  else
    raise exception 'invalid consultation type' using errcode = '23514';
  end if;

  v_grade := nullif(btrim(coalesce(p_legacy_grade, '')), '');
  if v_grade is not null
     and v_grade not in ('A', 'B', 'C', 'D', '부재', '상담거절') then
    raise exception 'invalid legacy grade' using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.project_unit as pu
    where pu.project_id = p_project_id
      and pu.unit_id = p_unit_id
    for update
  ) then
    raise exception 'unit is not in project' using errcode = '23514';
  end if;

  select *
    into v_contract
  from public.contract as ct
  where ct.project_id = p_project_id
    and ct.unit_id = p_unit_id
    and ct.customer_id = p_customer_id
    and ct.contract_status = 'ACTIVE'::public.contract_status
  for update;

  if not found then
    raise exception 'active contract not found' using errcode = '23514';
  end if;

  v_consulted_at := now();

  insert into public.consultation (
    project_id,
    customer_id,
    counselor_id,
    consulted_at,
    content,
    created_by,
    unit_id,
    contact_type,
    stage,
    purpose,
    structured_tags,
    next_action_at
  ) values (
    p_project_id,
    p_customer_id,
    v_member_id,
    v_consulted_at,
    v_content,
    v_member_id,
    p_unit_id,
    v_contact,
    'MOVE_IN',
    v_purpose,
    case
      when v_grade is null then null
      else jsonb_build_object('legacy_grade', v_grade)
    end,
    p_next_contact_at
  )
  returning id into v_id;

  v_want_occupancy :=
    p_next_contact_at is not null
    or p_occupancy_intent is not null
    or p_funding_status is not null
    or p_move_in_status is not null
    or p_planned_move_in_date is not null
    or p_balance_paid_at is not null
    or p_actual_move_in_date is not null;

  if v_want_occupancy then
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
      p_contact_id := v_id,
      p_reason := nullif(btrim(coalesce(p_reason, '')), '')
    );
  end if;

  return v_id;
end;
$$;

revoke all on function public.create_move_in_consultation(
  uuid, uuid, uuid, text, text, text, timestamptz,
  public.occupancy_intent, public.funding_status, public.move_in_status,
  date, timestamptz, timestamptz, text
) from public;

do $priv$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute $sql$
      revoke all on function public.create_move_in_consultation(
        uuid, uuid, uuid, text, text, text, timestamptz,
        public.occupancy_intent, public.funding_status, public.move_in_status,
        date, timestamptz, timestamptz, text
      ) from anon
    $sql$;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute $sql$
      grant execute on function public.create_move_in_consultation(
        uuid, uuid, uuid, text, text, text, timestamptz,
        public.occupancy_intent, public.funding_status, public.move_in_status,
        date, timestamptz, timestamptz, text
      ) to authenticated
    $sql$;
  end if;
end
$priv$;
