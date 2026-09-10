-- M10A: missing write RPCs. Does not replace M10 functions.
-- Helpers SoT: private.write_rpc_actor / private.require_customer_write_access
-- from M10, and Phase 1 current_project_member_id / has_project_role.

create or replace function public.promote_entry_to_customer(
  p_project_id uuid,
  p_entry_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
  v_entry public.entry_pool%rowtype;
  v_customer_id uuid;
  v_name varchar(100);
  v_phone varchar(20);
  v_source varchar(50);
begin
  v_member_id := private.write_rpc_actor(p_project_id);

  select *
    into v_entry
  from public.entry_pool as e
  where e.entry_id = p_entry_id
  for update;

  if not found then
    raise exception 'entry not found' using errcode = '23503';
  end if;

  if v_entry.project_id is distinct from p_project_id then
    raise exception 'entry is not in project' using errcode = '23514';
  end if;

  if v_entry.status = 'DORMANT' then
    raise exception 'entry is dormant' using errcode = '23514';
  end if;

  select c.id
    into v_customer_id
  from public.customer as c
  where c.project_id = p_project_id
    and c.phone_normalized = v_entry.phone_normalized
  for update;

  if v_entry.status = 'PROMOTED' then
    if v_customer_id is null then
      raise exception 'promoted entry has no customer' using errcode = '23503';
    end if;
    return v_customer_id;
  end if;

  if v_customer_id is null then
    v_name := left(
      coalesce(
        nullif(btrim(coalesce(v_entry.name_or_nickname, '')), ''),
        'Entry ' || v_entry.phone_normalized
      ),
      100
    );
    v_phone := left(v_entry.phone_normalized, 20);
    v_source := left(v_entry.acquisition_channel, 50);

    insert into public.customer (
      project_id,
      name,
      phone,
      phone_normalized,
      source,
      assigned_counselor_id
    ) values (
      p_project_id,
      v_name,
      v_phone,
      v_entry.phone_normalized,
      v_source,
      v_member_id
    )
    returning id into v_customer_id;
  else
    update public.customer
    set source = coalesce(source, left(v_entry.acquisition_channel, 50))
    where id = v_customer_id
      and project_id = p_project_id;
  end if;

  update public.entry_pool
  set status = 'PROMOTED'
  where entry_id = p_entry_id
    and project_id = p_project_id;

  insert into public.funnel_event (
    project_id,
    customer_id,
    event_type,
    source_channel,
    metadata,
    created_by
  ) values (
    p_project_id,
    v_customer_id,
    'ENTRY_PROMOTED',
    v_entry.acquisition_channel,
    jsonb_build_object('entry_id', p_entry_id),
    v_member_id
  );

  return v_customer_id;
end;
$$;

create or replace function public.upsert_customer_unit_interest(
  p_project_id uuid,
  p_customer_id uuid,
  p_unit_id uuid,
  p_interest_level varchar default null,
  p_interest_reason text default null,
  p_current_status public.customer_unit_interest_status default null,
  p_assigned_counselor_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
  v_role public.project_member_role;
  v_assigned uuid;
  v_id uuid;
begin
  v_member_id := private.write_rpc_actor(p_project_id);
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

  select pm.role
    into v_role
  from public.project_member as pm
  where pm.id = v_member_id
    and pm.project_id = p_project_id;

  if v_role = 'COUNSELOR'::public.project_member_role then
    v_assigned := v_member_id;
  else
    v_assigned := p_assigned_counselor_id;
  end if;

  insert into public.customer_unit_interest (
    project_id,
    customer_id,
    unit_id,
    interest_level,
    interest_reason,
    current_status,
    assigned_counselor_id,
    first_interested_at,
    last_interested_at
  ) values (
    p_project_id,
    p_customer_id,
    p_unit_id,
    p_interest_level,
    p_interest_reason,
    coalesce(
      p_current_status,
      'ACTIVE'::public.customer_unit_interest_status
    ),
    v_assigned,
    clock_timestamp(),
    clock_timestamp()
  )
  on conflict (project_id, customer_id, unit_id)
  do update set
    interest_level = coalesce(
      p_interest_level,
      public.customer_unit_interest.interest_level
    ),
    interest_reason = coalesce(
      p_interest_reason,
      public.customer_unit_interest.interest_reason
    ),
    current_status = coalesce(
      p_current_status,
      public.customer_unit_interest.current_status
    ),
    assigned_counselor_id = case
      when v_role = 'COUNSELOR'::public.project_member_role then v_member_id
      when p_assigned_counselor_id is null
        then public.customer_unit_interest.assigned_counselor_id
      else p_assigned_counselor_id
    end,
    last_interested_at = clock_timestamp()
  returning interest_id into v_id;

  return v_id;
end;
$$;

revoke all on function public.promote_entry_to_customer(uuid, uuid) from public;
revoke all on function public.upsert_customer_unit_interest(
  uuid, uuid, uuid, varchar, text, public.customer_unit_interest_status, uuid
) from public;

do $priv$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on function public.promote_entry_to_customer(uuid, uuid) from anon';
    execute $sql$
      revoke all on function public.upsert_customer_unit_interest(
        uuid, uuid, uuid, varchar, text, public.customer_unit_interest_status, uuid
      ) from anon
    $sql$;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function public.promote_entry_to_customer(uuid, uuid) to authenticated';
    execute $sql$
      grant execute on function public.upsert_customer_unit_interest(
        uuid, uuid, uuid, varchar, text, public.customer_unit_interest_status, uuid
      ) to authenticated
    $sql$;
  end if;
end
$priv$;
