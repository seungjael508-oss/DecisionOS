-- Task A-2: PROJECT_ADMIN이 관리자 화면에서 새 프로젝트 사용자를 초대한다.
-- auth.users 생성(Supabase Auth Admin inviteUserByEmail)은 이 함수 밖, 서버 액션에서만 일어난다.
-- 이 함수는 "이미 생성된 auth user"를 project_member에 연결하는 부분만 담당하므로
-- auth.users를 직접 INSERT하지 않는다. 초대(Admin API) 실패 시에는 이 함수를 호출하지 않으므로
-- project_member만 남는 orphan row가 생길 수 없다(호출 순서는 서버 액션이 보장한다).
create or replace function public.invite_project_member(
  p_project_id uuid,
  p_user_id uuid,
  p_role public.project_member_role,
  p_display_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
  v_name text;
  v_member_id uuid;
begin
  v_actor_id := private.write_rpc_actor(p_project_id);
  perform private.require_project_admin(p_project_id, v_actor_id);

  -- 이 RPC로는 PROJECT_ADMIN 권한을 절대 부여할 수 없다.
  -- CLIENT_MANAGER에게 PROJECT_ADMIN 승격 권한이 없다는 요구사항을, 애초에 승격 경로 자체를
  -- 없애는 방식으로 만족한다(호출자가 PROJECT_ADMIN이어도 마찬가지로 막는다 — 승격은 이 화면 밖).
  if p_role not in ('COUNSELOR'::public.project_member_role, 'CLIENT_MANAGER'::public.project_member_role) then
    raise exception 'role is not invitable' using errcode = '42501';
  end if;

  v_name := btrim(coalesce(p_display_name, ''));
  if v_name = '' then
    raise exception 'display name is required' using errcode = '23514';
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 30 then
    raise exception 'display name must be 2-30 characters' using errcode = '23514';
  end if;

  if p_user_id is null then
    raise exception 'user id is required' using errcode = '23514';
  end if;

  -- 서버 액션이 Admin API로 이미 만들었거나 찾아낸 auth user인지 다시 한번 확인한다.
  -- (SECURITY DEFINER라 RLS가 없으므로, 존재하지 않는 user_id로 project_member가 생기는 것을 막는다.)
  if not exists (select 1 from auth.users as u where u.id = p_user_id) then
    raise exception 'auth user not found' using errcode = '23514';
  end if;

  -- project_member(project_id, user_id)에는 이미 unique 제약이 있어 동시 요청도 막히지만,
  -- 여기서 먼저 확인해 일반적인 경우에는 더 뜻이 분명한 에러 코드/메시지를 돌려준다.
  if exists (
    select 1 from public.project_member as pm
    where pm.project_id = p_project_id and pm.user_id = p_user_id
  ) then
    raise exception 'member already exists in project' using errcode = '23505';
  end if;

  insert into public.project_member (project_id, user_id, role, display_name, active)
  values (p_project_id, p_user_id, p_role, v_name, true)
  returning id into v_member_id;

  return v_member_id;
end;
$$;

revoke all on function public.invite_project_member(uuid, uuid, public.project_member_role, text) from public;

-- 관리자 화면의 사용자 목록. project_member는 RLS SELECT 정책이 없으므로
-- (list_move_in_field_members와 마찬가지로) 이 RPC를 통해서만 읽는다.
-- auth.users를 조인해 이메일을 노출하지만, PROJECT_ADMIN에게만 실행 권한을 준다.
create or replace function public.list_project_members(p_project_id uuid)
returns table (
  member_id uuid,
  user_id uuid,
  display_name text,
  email text,
  role public.project_member_role,
  active boolean,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
begin
  v_actor_id := private.write_rpc_actor(p_project_id);
  perform private.require_project_admin(p_project_id, v_actor_id);

  return query
  select
    pm.id as member_id,
    pm.user_id,
    pm.display_name,
    u.email::text as email,
    pm.role,
    pm.active,
    pm.created_at
  from public.project_member as pm
  join auth.users as u on u.id = pm.user_id
  where pm.project_id = p_project_id
  order by pm.created_at asc;
end;
$$;

revoke all on function public.list_project_members(uuid) from public;

do $priv$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on function public.invite_project_member(uuid, uuid, public.project_member_role, text) from anon';
    execute 'revoke all on function public.list_project_members(uuid) from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function public.invite_project_member(uuid, uuid, public.project_member_role, text) to authenticated';
    execute 'grant execute on function public.list_project_members(uuid) to authenticated';
  end if;
end
$priv$;
