-- M10B: replace transfer_contract_holder. Do not rewrite other M10 RPCs.
-- Cancel old ACTIVE contract, insert a new ACTIVE contract, retarget occupancy.

create or replace function public.transfer_contract_holder(
  p_project_id uuid,
  p_contract_id uuid,
  p_new_customer_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
  v_old public.contract%rowtype;
  v_occ public.unit_occupancy_status%rowtype;
  v_new_id uuid;
begin
  v_member_id := private.write_rpc_actor(p_project_id);
  perform private.require_project_admin(p_project_id, v_member_id);
  perform private.require_customer_write_access(
    p_project_id, p_new_customer_id, v_member_id
  );

  select *
    into v_old
  from public.contract as ct
  where ct.contract_id = p_contract_id
  for update;

  if not found then
    raise exception 'contract not found' using errcode = '23503';
  end if;

  if v_old.project_id is distinct from p_project_id then
    raise exception 'contract is not in project' using errcode = '23514';
  end if;

  if v_old.contract_status is distinct from 'ACTIVE'::public.contract_status then
    raise exception 'contract is not active' using errcode = '23514';
  end if;

  if v_old.customer_id is not distinct from p_new_customer_id then
    raise exception 'new customer must differ' using errcode = '23514';
  end if;

  select *
    into v_occ
  from public.unit_occupancy_status as uos
  where uos.contract_id = v_old.contract_id
    and uos.project_id = v_old.project_id
    and uos.unit_id = v_old.unit_id
  for update;

  if not found then
    raise exception 'occupancy not found' using errcode = '23503';
  end if;

  update public.contract
  set
    contract_status = 'CANCELLED'::public.contract_status,
    cancellation_reason = 'HOLDER_CHANGED'
  where contract_id = v_old.contract_id
    and project_id = v_old.project_id;

  insert into public.contract (
    project_id,
    customer_id,
    unit_id,
    subscription_id,
    contract_status,
    winner_confirmed,
    winner_list_received_at,
    contract_scheduled_date,
    visit_date_confirmed,
    document_status,
    previous_contract_id
  ) values (
    v_old.project_id,
    p_new_customer_id,
    v_old.unit_id,
    null,
    'ACTIVE'::public.contract_status,
    v_old.winner_confirmed,
    v_old.winner_list_received_at,
    v_old.contract_scheduled_date,
    v_old.visit_date_confirmed,
    v_old.document_status,
    v_old.contract_id
  )
  returning contract_id into v_new_id;

  update public.unit_occupancy_status
  set
    contract_id = v_new_id,
    updated_by = v_member_id
  where occupancy_status_id = v_occ.occupancy_status_id
    and project_id = v_old.project_id
    and unit_id = v_old.unit_id;

  return v_new_id;
end;
$$;

revoke all on function public.transfer_contract_holder(uuid, uuid, uuid)
  from public;

do $priv$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on function public.transfer_contract_holder(uuid, uuid, uuid) from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function public.transfer_contract_holder(uuid, uuid, uuid) to authenticated';
  end if;
end
$priv$;
