-- MOVE_IN counselor assignment RPC. No table/ENUM/RLS changes. Does not rewrite M10/consultation RPCs.

create or replace function public.assign_move_in_customers(
  p_project_id uuid,
  p_customer_ids uuid[],
  p_assignee_project_member_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
  v_ids uuid[];
  v_assignee public.project_member%rowtype;
  v_found integer;
begin
  v_member_id := private.write_rpc_actor(p_project_id);
  perform private.require_project_admin(p_project_id, v_member_id);

  select *
    into v_assignee
  from public.project_member as pm
  where pm.id = p_assignee_project_member_id
  for update;

  if not found then
    raise exception 'assignee not found' using errcode = '23514';
  end if;

  if v_assignee.project_id is distinct from p_project_id then
    raise exception 'assignee is not in project' using errcode = '23514';
  end if;

  if v_assignee.active is not true then
    raise exception 'assignee is not active' using errcode = '23514';
  end if;

  if v_assignee.role is distinct from 'COUNSELOR'::public.project_member_role then
    raise exception 'assignee is not a counselor' using errcode = '23514';
  end if;

  if p_customer_ids is null or cardinality(p_customer_ids) = 0 then
    raise exception 'customer ids are required' using errcode = '23514';
  end if;

  if exists (
    select 1
    from unnest(p_customer_ids) as customer_id
    where customer_id is null
  ) then
    raise exception 'customer ids are required' using errcode = '23514';
  end if;

  select array_agg(distinct customer_id)
    into v_ids
  from unnest(p_customer_ids) as customer_id;

  perform c.id
  from public.customer as c
  where c.id = any (v_ids)
  for update;

  select count(*)::integer
    into v_found
  from public.customer as c
  where c.id = any (v_ids)
    and c.project_id = p_project_id;

  if v_found is distinct from cardinality(v_ids) then
    raise exception 'customer is not in project' using errcode = '23514';
  end if;

  update public.customer as c
  set assigned_counselor_id = p_assignee_project_member_id
  where c.id = any (v_ids)
    and c.project_id = p_project_id;

  return cardinality(v_ids);
end;
$$;

revoke all on function public.assign_move_in_customers(uuid, uuid[], uuid)
  from public;

do $priv$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute $sql$
      revoke all on function public.assign_move_in_customers(uuid, uuid[], uuid)
        from anon
    $sql$;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute $sql$
      grant execute on function public.assign_move_in_customers(uuid, uuid[], uuid)
        to authenticated
    $sql$;
  end if;
end
$priv$;
