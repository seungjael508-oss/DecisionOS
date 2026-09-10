-- M10: approved SECURITY DEFINER write RPCs for locked M9 surfaces.
-- No new tables, ENUMs, or RLS policies. Do not redefine Phase 1 helpers.
-- Do not open table DML grants. contact_schedule is out of scope (no table).

create or replace function private.write_rpc_actor(p_project_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  v_member_id := private.current_project_member_id(
    p_project_id,
    array[
      'COUNSELOR'::public.project_member_role,
      'PROJECT_ADMIN'::public.project_member_role
    ]
  );

  if v_member_id is null then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return v_member_id;
end;
$$;

revoke all on function private.write_rpc_actor(uuid) from public;

create or replace function private.require_project_admin(
  p_project_id uuid,
  p_member_id uuid
)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_project_role(
    p_project_id,
    array['PROJECT_ADMIN']::public.project_member_role[]
  ) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if p_member_id is null then
    raise exception 'not authorized' using errcode = '42501';
  end if;
end;
$$;

revoke all on function private.require_project_admin(uuid, uuid) from public;

create or replace function private.require_customer_write_access(
  p_project_id uuid,
  p_customer_id uuid,
  p_member_id uuid
)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_customer_project uuid;
  v_assigned uuid;
  v_role public.project_member_role;
begin
  select c.project_id, c.assigned_counselor_id
    into v_customer_project, v_assigned
  from public.customer as c
  where c.id = p_customer_id;

  if not found then
    raise exception 'customer not found' using errcode = '23503';
  end if;

  if v_customer_project is distinct from p_project_id then
    raise exception 'customer is not in project' using errcode = '23514';
  end if;

  select pm.role
    into v_role
  from public.project_member as pm
  where pm.id = p_member_id
    and pm.project_id = p_project_id;

  if v_role = 'COUNSELOR'::public.project_member_role
     and v_assigned is distinct from p_member_id then
    raise exception 'not authorized for customer' using errcode = '42501';
  end if;
end;
$$;

revoke all on function private.require_customer_write_access(uuid, uuid, uuid)
  from public;

create or replace function private.require_active_assignee(
  p_project_id uuid,
  p_member_id uuid
)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_project_id uuid;
  v_active boolean;
begin
  select pm.project_id, pm.active
    into v_project_id, v_active
  from public.project_member as pm
  where pm.id = p_member_id;

  if not found then
    raise exception 'assignee not found' using errcode = '23503';
  end if;

  if v_project_id is distinct from p_project_id then
    raise exception 'assignee is not in project' using errcode = '23514';
  end if;

  if v_active is not true then
    raise exception 'assignee is inactive' using errcode = '23514';
  end if;
end;
$$;

revoke all on function private.require_active_assignee(uuid, uuid) from public;

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

  update public.contract
  set
    contract_status = 'CANCELLED'::public.contract_status,
    cancellation_reason = p_cancellation_reason
  where contract_id = p_contract_id
    and project_id = p_project_id;

  return p_contract_id;
end;
$$;

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
  v_row public.contract%rowtype;
begin
  v_member_id := private.write_rpc_actor(p_project_id);
  perform private.require_project_admin(p_project_id, v_member_id);
  perform private.require_customer_write_access(
    p_project_id, p_new_customer_id, v_member_id
  );

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

  if v_row.customer_id is not distinct from p_new_customer_id then
    raise exception 'new customer must differ' using errcode = '23514';
  end if;

  update public.contract
  set customer_id = p_new_customer_id
  where contract_id = p_contract_id
    and project_id = p_project_id;

  return p_contract_id;
end;
$$;

create or replace function public.update_unit_occupancy_status(
  p_project_id uuid,
  p_unit_id uuid,
  p_contract_id uuid,
  p_occupancy_intent public.occupancy_intent default null,
  p_funding_status public.funding_status default null,
  p_move_in_status public.move_in_status default null,
  p_planned_move_in_date date default null,
  p_balance_paid_at timestamptz default null,
  p_actual_move_in_date timestamptz default null,
  p_last_contact_at timestamptz default null,
  p_next_contact_at timestamptz default null,
  p_clear_planned_move_in_date boolean default false,
  p_clear_balance_paid_at boolean default false,
  p_clear_actual_move_in_date boolean default false,
  p_clear_last_contact_at boolean default false,
  p_clear_next_contact_at boolean default false,
  p_contact_id uuid default null,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
  v_contract public.contract%rowtype;
  v_occ public.unit_occupancy_status%rowtype;
  v_intent public.occupancy_intent;
  v_funding public.funding_status;
  v_move public.move_in_status;
  v_planned date;
  v_balance timestamptz;
  v_actual timestamptz;
  v_last timestamptz;
  v_next timestamptz;
  v_id uuid;
begin
  v_member_id := private.write_rpc_actor(p_project_id);

  if (
    coalesce(p_clear_planned_move_in_date, false)
    and p_planned_move_in_date is not null
  ) or (
    coalesce(p_clear_balance_paid_at, false)
    and p_balance_paid_at is not null
  ) or (
    coalesce(p_clear_actual_move_in_date, false)
    and p_actual_move_in_date is not null
  ) or (
    coalesce(p_clear_last_contact_at, false)
    and p_last_contact_at is not null
  ) or (
    coalesce(p_clear_next_contact_at, false)
    and p_next_contact_at is not null
  ) then
    raise exception 'clear flag cannot be combined with a value'
      using errcode = '23514';
  end if;

  select *
    into v_contract
  from public.contract as ct
  where ct.contract_id = p_contract_id
  for update;

  if not found then
    raise exception 'contract not found' using errcode = '23503';
  end if;

  if v_contract.project_id is distinct from p_project_id then
    raise exception 'contract is not in project' using errcode = '23514';
  end if;

  if v_contract.unit_id is distinct from p_unit_id then
    raise exception 'contract unit mismatch' using errcode = '23514';
  end if;

  if v_contract.contract_status is distinct from 'ACTIVE'::public.contract_status then
    raise exception 'contract is not active' using errcode = '23514';
  end if;

  perform private.require_customer_write_access(
    p_project_id, v_contract.customer_id, v_member_id
  );

  if p_contact_id is not null then
    if not exists (
      select 1
      from public.consultation as c
      where c.id = p_contact_id
        and c.project_id = p_project_id
        and c.customer_id = v_contract.customer_id
    ) then
      raise exception 'contact does not match contract customer'
        using errcode = '23514';
    end if;
  end if;

  select *
    into v_occ
  from public.unit_occupancy_status as uos
  where uos.project_id = p_project_id
    and uos.contract_id = p_contract_id
  for update;

  if not found then
    raise exception 'occupancy not found' using errcode = '23503';
  end if;

  if v_occ.unit_id is distinct from p_unit_id then
    raise exception 'occupancy unit mismatch' using errcode = '23514';
  end if;

  v_intent := coalesce(p_occupancy_intent, v_occ.occupancy_intent);
  v_funding := coalesce(p_funding_status, v_occ.funding_status);
  v_move := coalesce(p_move_in_status, v_occ.move_in_status);

  if coalesce(p_clear_planned_move_in_date, false) then
    v_planned := null;
  elsif p_planned_move_in_date is not null then
    v_planned := p_planned_move_in_date;
  else
    v_planned := v_occ.planned_move_in_date;
  end if;

  if coalesce(p_clear_balance_paid_at, false) then
    v_balance := null;
  elsif p_balance_paid_at is not null then
    v_balance := p_balance_paid_at;
  else
    v_balance := v_occ.balance_paid_at;
  end if;

  if coalesce(p_clear_actual_move_in_date, false) then
    v_actual := null;
  elsif p_actual_move_in_date is not null then
    v_actual := p_actual_move_in_date;
  else
    v_actual := v_occ.actual_move_in_date;
  end if;

  if coalesce(p_clear_last_contact_at, false) then
    v_last := null;
  elsif p_last_contact_at is not null then
    v_last := p_last_contact_at;
  else
    v_last := v_occ.last_contact_at;
  end if;

  if coalesce(p_clear_next_contact_at, false) then
    v_next := null;
  elsif p_next_contact_at is not null then
    v_next := p_next_contact_at;
  else
    v_next := v_occ.next_contact_at;
  end if;

  update public.unit_occupancy_status as uos
  set
    occupancy_intent = v_intent,
    funding_status = v_funding,
    move_in_status = v_move,
    planned_move_in_date = v_planned,
    balance_paid_at = v_balance,
    actual_move_in_date = v_actual,
    last_contact_at = v_last,
    next_contact_at = v_next,
    updated_by = v_member_id
  where uos.occupancy_status_id = v_occ.occupancy_status_id
  returning occupancy_status_id into v_id;

  if v_intent is distinct from v_occ.occupancy_intent then
    insert into public.contract_status_history (
      project_id, contract_id, unit_id, field_changed,
      previous_value, new_value, reason, contact_id, changed_by
    ) values (
      p_project_id, p_contract_id, p_unit_id, 'occupancy_intent',
      v_occ.occupancy_intent::text, v_intent::text, p_reason, p_contact_id,
      v_member_id
    );
  end if;

  if v_funding is distinct from v_occ.funding_status then
    insert into public.contract_status_history (
      project_id, contract_id, unit_id, field_changed,
      previous_value, new_value, reason, contact_id, changed_by
    ) values (
      p_project_id, p_contract_id, p_unit_id, 'funding_status',
      v_occ.funding_status::text, v_funding::text, p_reason, p_contact_id,
      v_member_id
    );
  end if;

  if v_move is distinct from v_occ.move_in_status then
    insert into public.contract_status_history (
      project_id, contract_id, unit_id, field_changed,
      previous_value, new_value, reason, contact_id, changed_by
    ) values (
      p_project_id, p_contract_id, p_unit_id, 'move_in_status',
      v_occ.move_in_status::text, v_move::text, p_reason, p_contact_id,
      v_member_id
    );
  end if;

  return v_id;
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

create or replace function public.create_cs_ticket(
  p_project_id uuid,
  p_contract_id uuid,
  p_category varchar,
  p_title varchar,
  p_description text,
  p_priority varchar default 'MEDIUM',
  p_assigned_to uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
  v_contract public.contract%rowtype;
  v_id uuid;
begin
  v_member_id := private.write_rpc_actor(p_project_id);

  select *
    into v_contract
  from public.contract as ct
  where ct.contract_id = p_contract_id;

  if not found then
    raise exception 'contract not found' using errcode = '23503';
  end if;

  if v_contract.project_id is distinct from p_project_id then
    raise exception 'contract is not in project' using errcode = '23514';
  end if;

  if v_contract.contract_status not in (
    'ACTIVE'::public.contract_status,
    'COMPLETED'::public.contract_status
  ) then
    raise exception 'contract status does not allow new cs'
      using errcode = '23514';
  end if;

  perform private.require_customer_write_access(
    p_project_id, v_contract.customer_id, v_member_id
  );

  if p_assigned_to is not null then
    perform private.require_active_assignee(p_project_id, p_assigned_to);
  end if;

  insert into public.cs_ticket (
    project_id,
    contract_id,
    unit_id,
    customer_id,
    category,
    title,
    description,
    priority,
    assigned_to,
    created_by
  ) values (
    p_project_id,
    v_contract.contract_id,
    v_contract.unit_id,
    v_contract.customer_id,
    p_category,
    p_title,
    p_description,
    coalesce(p_priority, 'MEDIUM'),
    p_assigned_to,
    v_member_id
  )
  returning ticket_id into v_id;

  return v_id;
end;
$$;

create or replace function public.update_cs_ticket(
  p_project_id uuid,
  p_ticket_id uuid,
  p_status varchar default null,
  p_priority varchar default null,
  p_assigned_to uuid default null,
  p_clear_assigned_to boolean default false,
  p_resolved_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
  v_row public.cs_ticket%rowtype;
  v_status varchar;
  v_priority varchar;
  v_assigned uuid;
  v_resolved timestamptz;
begin
  v_member_id := private.write_rpc_actor(p_project_id);

  if coalesce(p_clear_assigned_to, false) and p_assigned_to is not null then
    raise exception 'clear flag cannot be combined with a value'
      using errcode = '23514';
  end if;

  select *
    into v_row
  from public.cs_ticket as t
  where t.ticket_id = p_ticket_id
  for update;

  if not found then
    raise exception 'cs_ticket not found' using errcode = '23503';
  end if;

  if v_row.project_id is distinct from p_project_id then
    raise exception 'cs_ticket is not in project' using errcode = '23514';
  end if;

  perform private.require_customer_write_access(
    p_project_id, v_row.customer_id, v_member_id
  );

  if v_row.status = 'CLOSED' then
    raise exception 'closed ticket cannot be updated' using errcode = '23514';
  end if;

  v_status := coalesce(p_status, v_row.status);
  v_priority := coalesce(p_priority, v_row.priority);
  v_resolved := coalesce(p_resolved_at, v_row.resolved_at);

  if coalesce(p_clear_assigned_to, false) then
    v_assigned := null;
  elsif p_assigned_to is not null then
    v_assigned := p_assigned_to;
  else
    v_assigned := v_row.assigned_to;
  end if;

  if v_assigned is not null then
    perform private.require_active_assignee(p_project_id, v_assigned);
  end if;

  if v_row.status = 'RESOLVED' and v_status = 'OPEN' then
    raise exception 'resolved ticket cannot reopen' using errcode = '23514';
  end if;

  if v_status = 'RESOLVED' and v_resolved is null then
    v_resolved := now();
  end if;

  update public.cs_ticket
  set
    status = v_status,
    priority = v_priority,
    assigned_to = v_assigned,
    resolved_at = v_resolved
  where ticket_id = p_ticket_id
    and project_id = p_project_id;

  return p_ticket_id;
end;
$$;

revoke all on function public.create_contract(uuid, uuid, uuid, uuid) from public;
revoke all on function public.cancel_contract(uuid, uuid, varchar) from public;
revoke all on function public.transfer_contract_holder(uuid, uuid, uuid)
  from public;
revoke all on function public.update_unit_occupancy_status(
  uuid, uuid, uuid,
  public.occupancy_intent, public.funding_status, public.move_in_status,
  date, timestamptz, timestamptz, timestamptz, timestamptz,
  boolean, boolean, boolean, boolean, boolean, uuid, text
) from public;
revoke all on function public.generate_report(
  uuid, date, public.report_phase, public.report_type, jsonb, uuid
) from public;
revoke all on function public.create_cs_ticket(
  uuid, uuid, varchar, varchar, text, varchar, uuid
) from public;
revoke all on function public.update_cs_ticket(
  uuid, uuid, varchar, varchar, uuid, boolean, timestamptz
) from public;

do $priv$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on function private.write_rpc_actor(uuid) from anon';
    execute 'revoke all on function private.require_project_admin(uuid, uuid) from anon';
    execute 'revoke all on function private.require_customer_write_access(uuid, uuid, uuid) from anon';
    execute 'revoke all on function private.require_active_assignee(uuid, uuid) from anon';
    execute 'revoke all on function public.create_contract(uuid, uuid, uuid, uuid) from anon';
    execute 'revoke all on function public.cancel_contract(uuid, uuid, varchar) from anon';
    execute 'revoke all on function public.transfer_contract_holder(uuid, uuid, uuid) from anon';
    execute $sql$
      revoke all on function public.update_unit_occupancy_status(
        uuid, uuid, uuid,
        public.occupancy_intent, public.funding_status, public.move_in_status,
        date, timestamptz, timestamptz, timestamptz, timestamptz,
        boolean, boolean, boolean, boolean, boolean, uuid, text
      ) from anon
    $sql$;
    execute $sql$
      revoke all on function public.generate_report(
        uuid, date, public.report_phase, public.report_type, jsonb, uuid
      ) from anon
    $sql$;
    execute $sql$
      revoke all on function public.create_cs_ticket(
        uuid, uuid, varchar, varchar, text, varchar, uuid
      ) from anon
    $sql$;
    execute $sql$
      revoke all on function public.update_cs_ticket(
        uuid, uuid, varchar, varchar, uuid, boolean, timestamptz
      ) from anon
    $sql$;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on function private.write_rpc_actor(uuid) from authenticated';
    execute 'revoke all on function private.require_project_admin(uuid, uuid) from authenticated';
    execute 'revoke all on function private.require_customer_write_access(uuid, uuid, uuid) from authenticated';
    execute 'revoke all on function private.require_active_assignee(uuid, uuid) from authenticated';

    execute 'grant execute on function public.create_contract(uuid, uuid, uuid, uuid) to authenticated';
    execute 'grant execute on function public.cancel_contract(uuid, uuid, varchar) to authenticated';
    execute 'grant execute on function public.transfer_contract_holder(uuid, uuid, uuid) to authenticated';
    execute $sql$
      grant execute on function public.update_unit_occupancy_status(
        uuid, uuid, uuid,
        public.occupancy_intent, public.funding_status, public.move_in_status,
        date, timestamptz, timestamptz, timestamptz, timestamptz,
        boolean, boolean, boolean, boolean, boolean, uuid, text
      ) to authenticated
    $sql$;
    execute $sql$
      grant execute on function public.generate_report(
        uuid, date, public.report_phase, public.report_type, jsonb, uuid
      ) to authenticated
    $sql$;
    execute $sql$
      grant execute on function public.create_cs_ticket(
        uuid, uuid, varchar, varchar, text, varchar, uuid
      ) to authenticated
    $sql$;
    execute $sql$
      grant execute on function public.update_cs_ticket(
        uuid, uuid, varchar, varchar, uuid, boolean, timestamptz
      ) to authenticated
    $sql$;
  end if;
end
$priv$;
