-- M10C: integrity fixes for create_contract, cancel_contract, generate_report.
-- Do not rewrite other M10/M10A/M10B RPCs. No schema or RLS changes.

create or replace function public.create_contract(
  p_project_id uuid,
  p_customer_id uuid,
  p_unit_id uuid,
  p_subscription_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
  v_contract_id uuid;
begin
  v_member_id := private.write_rpc_actor(p_project_id);
  perform private.require_project_admin(p_project_id, v_member_id);
  perform private.require_customer_write_access(
    p_project_id, p_customer_id, v_member_id
  );

  if not exists (
    select 1
    from public.project_unit as pu
    where pu.project_id = p_project_id
      and pu.unit_id = p_unit_id
  ) then
    raise exception 'unit is not in project' using errcode = '23514';
  end if;

  if p_subscription_id is not null
     and not exists (
       select 1
       from public.subscription as s
       where s.subscription_id = p_subscription_id
         and s.project_id = p_project_id
         and s.customer_id = p_customer_id
     ) then
    raise exception 'subscription does not match customer'
      using errcode = '23514';
  end if;

  insert into public.contract (
    project_id,
    customer_id,
    unit_id,
    subscription_id,
    contract_status
  ) values (
    p_project_id,
    p_customer_id,
    p_unit_id,
    p_subscription_id,
    'ACTIVE'::public.contract_status
  )
  returning contract_id into v_contract_id;

  update public.customer_unit_interest
  set
    current_status = 'CONTRACTED'::public.customer_unit_interest_status,
    last_interested_at = clock_timestamp()
  where project_id = p_project_id
    and customer_id = p_customer_id
    and unit_id = p_unit_id;

  insert into public.unit_occupancy_status (
    project_id,
    unit_id,
    contract_id,
    updated_by
  ) values (
    p_project_id,
    p_unit_id,
    v_contract_id,
    v_member_id
  );

  insert into public.funnel_event (
    project_id,
    customer_id,
    event_type,
    event_at,
    metadata,
    created_by
  ) values (
    p_project_id,
    p_customer_id,
    'CONTRACT',
    now(),
    jsonb_build_object(
      'contract_id', v_contract_id,
      'unit_id', p_unit_id
    ),
    v_member_id
  );

  return v_contract_id;
end;
$$;

create or replace function public.cancel_contract(
  p_project_id uuid,
  p_contract_id uuid,
  p_cancellation_reason varchar
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
  v_row public.contract%rowtype;
  v_occ public.unit_occupancy_status%rowtype;
begin
  v_member_id := private.write_rpc_actor(p_project_id);
  perform private.require_project_admin(p_project_id, v_member_id);

  if p_cancellation_reason is null or btrim(p_cancellation_reason) = '' then
    raise exception 'cancellation_reason is required' using errcode = '23514';
  end if;

  select *
    into v_row
  from public.contract as ct
  where ct.contract_id = p_contract_id
  for update;

  if not found then
    raise exception 'contract not found' using errcode = '23503';
  end if;

  if v_row.project_id is distinct from p_project_id then
    raise exception 'contract is not in project' using errcode = '23514';
  end if;

  if v_row.contract_status is distinct from 'ACTIVE'::public.contract_status then
    raise exception 'contract is not active' using errcode = '23514';
  end if;

  select *
    into v_occ
  from public.unit_occupancy_status as uos
  where uos.contract_id = v_row.contract_id
    and uos.project_id = v_row.project_id
    and uos.unit_id = v_row.unit_id
  for update;

  update public.contract
  set
    contract_status = 'CANCELLED'::public.contract_status,
    cancellation_reason = p_cancellation_reason
  where contract_id = v_row.contract_id
    and project_id = v_row.project_id;

  delete from public.unit_occupancy_status
  where contract_id = v_row.contract_id
    and project_id = v_row.project_id
    and unit_id = v_row.unit_id;

  return p_contract_id;
end;
$$;

create or replace function public.generate_report(
  p_project_id uuid,
  p_report_date date,
  p_report_phase public.report_phase,
  p_report_type public.report_type,
  p_generated_data jsonb,
  p_template_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
  v_template public.report_template%rowtype;
  v_project_org uuid;
  v_prev public.report%rowtype;
  v_id uuid;
  v_version integer;
  v_supersedes uuid;
begin
  v_member_id := private.write_rpc_actor(p_project_id);
  perform private.require_project_admin(p_project_id, v_member_id);

  if p_generated_data is null then
    raise exception 'generated_data is required' using errcode = '23514';
  end if;

  select p.organization_id
    into v_project_org
  from public.project as p
  where p.id = p_project_id;

  if p_template_id is not null then
    select *
      into v_template
    from public.report_template as t
    where t.template_id = p_template_id;

    if not found then
      raise exception 'template not found' using errcode = '23503';
    end if;

    if v_template.organization_id is distinct from v_project_org then
      raise exception 'template organization mismatch' using errcode = '23514';
    end if;

    if v_template.project_id is not null
       and v_template.project_id is distinct from p_project_id then
      raise exception 'template is not in project' using errcode = '23514';
    end if;
  end if;

  select *
    into v_prev
  from public.report as r
  where r.project_id = p_project_id
    and r.report_date = p_report_date
    and r.report_phase = p_report_phase
    and r.report_type = p_report_type
  order by r.version desc
  limit 1
  for update;

  if found then
    v_version := v_prev.version + 1;
    v_supersedes := v_prev.report_id;
  else
    v_version := 1;
    v_supersedes := null;
  end if;

  insert into public.report (
    project_id,
    template_id,
    report_phase,
    report_type,
    report_date,
    generated_data,
    version,
    supersedes_report_id,
    generated_by
  ) values (
    p_project_id,
    p_template_id,
    p_report_phase,
    p_report_type,
    p_report_date,
    p_generated_data,
    v_version,
    v_supersedes,
    v_member_id
  )
  returning report_id into v_id;

  return v_id;
end;
$$;

revoke all on function public.create_contract(uuid, uuid, uuid, uuid) from public;
revoke all on function public.cancel_contract(uuid, uuid, varchar) from public;
revoke all on function public.generate_report(
  uuid, date, public.report_phase, public.report_type, jsonb, uuid
) from public;

do $priv$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on function public.create_contract(uuid, uuid, uuid, uuid) from anon';
    execute 'revoke all on function public.cancel_contract(uuid, uuid, varchar) from anon';
    execute $sql$
      revoke all on function public.generate_report(
        uuid, date, public.report_phase, public.report_type, jsonb, uuid
      ) from anon
    $sql$;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function public.create_contract(uuid, uuid, uuid, uuid) to authenticated';
    execute 'grant execute on function public.cancel_contract(uuid, uuid, varchar) to authenticated';
    execute $sql$
      grant execute on function public.generate_report(
        uuid, date, public.report_phase, public.report_type, jsonb, uuid
      ) to authenticated
    $sql$;
  end if;
end
$priv$;
