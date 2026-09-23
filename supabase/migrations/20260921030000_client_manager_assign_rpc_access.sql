-- 상담사 배정 RPC 2개만 PROJECT_ADMIN 전용에서 CLIENT_MANAGER도 쓸 수 있는
-- private.require_field_manage_access로 교체한다. 다른 모든 검증/트랜잭션은 원본과 동일하다.
-- create_contract / cancel_contract / transfer_contract_holder 등 계약 admin RPC는 손대지 않는다.

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
  perform private.require_field_manage_access(p_project_id, v_member_id);

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

create or replace function public.update_move_in_field_member_display_name(
  p_project_id uuid,
  p_member_id uuid,
  p_display_name text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
  v_name text;
  v_target public.project_member%rowtype;
begin
  v_actor_id := private.write_rpc_actor(p_project_id);
  perform private.require_field_manage_access(p_project_id, v_actor_id);

  v_name := btrim(coalesce(p_display_name, ''));
  if v_name = '' then
    raise exception 'display name is required' using errcode = '23514';
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 30 then
    raise exception 'display name must be 2-30 characters' using errcode = '23514';
  end if;

  select *
    into v_target
  from public.project_member as pm
  where pm.id = p_member_id
  for update;

  if not found then
    raise exception 'member not found' using errcode = '23514';
  end if;

  if v_target.project_id is distinct from p_project_id then
    raise exception 'member is not in project' using errcode = '23514';
  end if;

  if v_target.active is not true then
    raise exception 'member is not active' using errcode = '23514';
  end if;

  update public.project_member as pm
  set display_name = v_name,
      updated_at = now()
  where pm.id = p_member_id;

  return v_name;
end;
$$;

-- CREATE OR REPLACE는 기존 authenticated EXECUTE grant / public·anon 차단을 그대로 유지한다.
