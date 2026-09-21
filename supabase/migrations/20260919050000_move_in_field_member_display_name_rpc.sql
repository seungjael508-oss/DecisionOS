-- 상담사 배정 화면에서 PROJECT_ADMIN이 project_member.display_name을 직접 수정할 수 있는 RPC.
-- 기존 write_rpc_actor / require_project_admin helper를 그대로 재사용하며,
-- Auth email / user_id / assigned_counselor_id 등 배정 관계는 전혀 건드리지 않는다.
-- project_member SELECT RLS는 넓히지 않는다 (list_move_in_field_members를 통해서만 읽는다).
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
  perform private.require_project_admin(p_project_id, v_actor_id);

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

revoke all on function public.update_move_in_field_member_display_name(uuid, uuid, text) from public;

do $priv$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on function public.update_move_in_field_member_display_name(uuid, uuid, text) from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function public.update_move_in_field_member_display_name(uuid, uuid, text) to authenticated';
  end if;
end
$priv$;
