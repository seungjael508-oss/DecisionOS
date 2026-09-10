-- MOVE_IN import atomic apply. No table/ENUM/RLS changes. Does not rewrite M10 RPCs.

create or replace function public.apply_move_in_import_row(
  p_project_id uuid,
  p_unit_id uuid,
  p_apply_mode text,
  p_existing_customer_id uuid default null,
  p_new_customer_name text default null,
  p_new_customer_phone_normalized text default null,
  p_expected_current_contract_id uuid default null,
  p_occupancy_intent public.occupancy_intent default null,
  p_funding_status public.funding_status default null,
  p_move_in_status public.move_in_status default null,
  p_planned_move_in_date date default null,
  p_balance_paid_at timestamptz default null,
  p_actual_move_in_date timestamptz default null,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
  v_mode text;
  v_name varchar(100);
  v_phone varchar(20);
  v_customer_id uuid;
  v_active public.contract%rowtype;
  v_active_count integer;
  v_contract_id uuid;
  v_occ public.unit_occupancy_status%rowtype;
  v_want_occupancy boolean;
  v_did_create boolean := false;
  v_did_transfer boolean := false;
  v_did_occupancy boolean := false;
  v_result text;
begin
  v_member_id := private.write_rpc_actor(p_project_id);
  perform private.require_project_admin(p_project_id, v_member_id);

  v_mode := btrim(coalesce(p_apply_mode, ''));
  if v_mode not in (
    'NO_OP',
    'CREATE_CONTRACT',
    'TRANSFER_HOLDER',
    'UPDATE_OCCUPANCY',
    'CREATE_CONTRACT_AND_UPDATE_OCCUPANCY',
    'TRANSFER_HOLDER_AND_UPDATE_OCCUPANCY'
  ) then
    raise exception 'invalid apply_mode' using errcode = '23514';
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

  v_name := left(btrim(coalesce(p_new_customer_name, '')), 100);
  v_phone := left(btrim(coalesce(p_new_customer_phone_normalized, '')), 20);

  select count(*)
    into v_active_count
  from public.contract as ct
  where ct.project_id = p_project_id
    and ct.unit_id = p_unit_id
    and ct.contract_status = 'ACTIVE'::public.contract_status;

  if v_active_count > 1 then
    raise exception 'active contract conflict' using errcode = '23514';
  end if;

  select *
    into v_active
  from public.contract as ct
  where ct.project_id = p_project_id
    and ct.unit_id = p_unit_id
    and ct.contract_status = 'ACTIVE'::public.contract_status
  for update;

  if not found then
    v_active := null;
  end if;

  if v_active.contract_id is distinct from p_expected_current_contract_id then
    raise exception 'stale preview contract' using errcode = '23514';
  end if;

  if p_existing_customer_id is not null then
    select c.id
      into v_customer_id
    from public.customer as c
    where c.id = p_existing_customer_id
    for update;

    if not found then
      raise exception 'customer not found' using errcode = '23503';
    end if;

    if not exists (
      select 1
      from public.customer as c
      where c.id = p_existing_customer_id
        and c.project_id = p_project_id
    ) then
      raise exception 'customer is not in project' using errcode = '23514';
    end if;
  elsif v_phone <> '' then
    if v_phone !~ '^[0-9]{8,20}$' then
      raise exception 'phone_normalized is invalid' using errcode = '23514';
    end if;

    select c.id
      into v_customer_id
    from public.customer as c
    where c.project_id = p_project_id
      and c.phone_normalized = v_phone
    for update;
  end if;

  if v_customer_id is null
     and v_mode in (
       'CREATE_CONTRACT',
       'TRANSFER_HOLDER',
       'CREATE_CONTRACT_AND_UPDATE_OCCUPANCY',
       'TRANSFER_HOLDER_AND_UPDATE_OCCUPANCY'
     )
  then
    if v_name = '' or v_phone = '' or v_phone !~ '^[0-9]{8,20}$' then
      raise exception 'new customer identity is insufficient' using errcode = '23514';
    end if;

    insert into public.customer (
      project_id,
      name,
      phone,
      phone_normalized,
      source
    ) values (
      p_project_id,
      v_name,
      v_phone,
      v_phone,
      'IMPORT'
    )
    returning id into v_customer_id;
  end if;

  if v_mode = 'UPDATE_OCCUPANCY' then
    if v_active.contract_id is null then
      raise exception 'active contract not found' using errcode = '23503';
    end if;
    v_customer_id := coalesce(v_customer_id, v_active.customer_id);
    if v_customer_id is distinct from v_active.customer_id then
      raise exception 'customer does not match active contract' using errcode = '23514';
    end if;
  end if;

  if v_customer_id is null and v_mode <> 'NO_OP' then
    raise exception 'customer is required' using errcode = '23514';
  end if;

  if v_customer_id is not null then
    perform private.require_customer_write_access(
      p_project_id, v_customer_id, v_member_id
    );
  end if;

  v_contract_id := v_active.contract_id;

  if v_mode in ('CREATE_CONTRACT', 'CREATE_CONTRACT_AND_UPDATE_OCCUPANCY') then
    if v_active.contract_id is not null then
      if v_active.customer_id is distinct from v_customer_id then
        raise exception 'active contract already exists' using errcode = '23505';
      end if;
    else
      v_contract_id := public.create_contract(
        p_project_id,
        v_customer_id,
        p_unit_id,
        null
      );
      v_did_create := true;
    end if;
  elsif v_mode in ('TRANSFER_HOLDER', 'TRANSFER_HOLDER_AND_UPDATE_OCCUPANCY') then
    if v_active.contract_id is null then
      raise exception 'active contract not found' using errcode = '23503';
    end if;
    if v_active.customer_id is distinct from v_customer_id then
      v_contract_id := public.transfer_contract_holder(
        p_project_id,
        v_active.contract_id,
        v_customer_id
      );
      v_did_transfer := true;
    end if;
  end if;

  v_want_occupancy :=
    p_occupancy_intent is not null
    or p_funding_status is not null
    or p_move_in_status is not null
    or p_planned_move_in_date is not null
    or p_balance_paid_at is not null
    or p_actual_move_in_date is not null;

  if v_mode in (
       'UPDATE_OCCUPANCY',
       'CREATE_CONTRACT_AND_UPDATE_OCCUPANCY',
       'TRANSFER_HOLDER_AND_UPDATE_OCCUPANCY'
     )
     and v_want_occupancy
     and v_contract_id is not null
  then
    select *
      into v_occ
    from public.unit_occupancy_status as uos
    where uos.project_id = p_project_id
      and uos.unit_id = p_unit_id
      and uos.contract_id = v_contract_id
    for update;

    if not found then
      raise exception 'occupancy not found' using errcode = '23503';
    end if;

    if (p_occupancy_intent is null or p_occupancy_intent is not distinct from v_occ.occupancy_intent)
       and (p_funding_status is null or p_funding_status is not distinct from v_occ.funding_status)
       and (p_move_in_status is null or p_move_in_status is not distinct from v_occ.move_in_status)
       and (p_planned_move_in_date is null or p_planned_move_in_date is not distinct from v_occ.planned_move_in_date)
       and (p_balance_paid_at is null or p_balance_paid_at is not distinct from v_occ.balance_paid_at)
       and (p_actual_move_in_date is null or p_actual_move_in_date is not distinct from v_occ.actual_move_in_date)
    then
      v_did_occupancy := false;
    else
      perform public.update_unit_occupancy_status(
        p_project_id,
        p_unit_id,
        v_contract_id,
        p_occupancy_intent,
        p_funding_status,
        p_move_in_status,
        p_planned_move_in_date,
        p_balance_paid_at,
        p_actual_move_in_date,
        null,
        null,
        false,
        false,
        false,
        false,
        false,
        null,
        coalesce(nullif(btrim(coalesce(p_reason, '')), ''), 'IMPORT')
      );
      v_did_occupancy := true;
    end if;
  end if;

  if v_did_create and v_did_occupancy then
    v_result := 'CONTRACT_CREATED_AND_OCCUPANCY_UPDATED';
  elsif v_did_transfer and v_did_occupancy then
    v_result := 'HOLDER_TRANSFERRED_AND_OCCUPANCY_UPDATED';
  elsif v_did_create then
    v_result := 'CONTRACT_CREATED';
  elsif v_did_transfer then
    v_result := 'HOLDER_TRANSFERRED';
  elsif v_did_occupancy then
    v_result := 'OCCUPANCY_UPDATED';
  else
    v_result := 'NO_OP';
  end if;

  return jsonb_build_object(
    'customer_id', v_customer_id,
    'contract_id', v_contract_id,
    'unit_id', p_unit_id,
    'result', v_result
  );
end;
$$;

revoke all on function public.apply_move_in_import_row(
  uuid, uuid, text, uuid, text, text, uuid,
  public.occupancy_intent, public.funding_status, public.move_in_status,
  date, timestamptz, timestamptz, text
) from public;

do $priv$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute $sql$
      revoke all on function public.apply_move_in_import_row(
        uuid, uuid, text, uuid, text, text, uuid,
        public.occupancy_intent, public.funding_status, public.move_in_status,
        date, timestamptz, timestamptz, text
      ) from anon
    $sql$;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute $sql$
      grant execute on function public.apply_move_in_import_row(
        uuid, uuid, text, uuid, text, text, uuid,
        public.occupancy_intent, public.funding_status, public.move_in_status,
        date, timestamptz, timestamptz, text
      ) to authenticated
    $sql$;
  end if;
end
$priv$;
