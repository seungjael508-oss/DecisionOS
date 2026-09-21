-- COUNSELOR가 project_member 전체 row를 직접 읽지 않고도 화양 현장 담당자 이름을 확인할 수 있도록
-- 최소 필드(member_id, display_name)만 반환하는 SECURITY DEFINER RPC.
-- 기존 project_member SELECT RLS(본인 row만 COUNSELOR에게 허용)는 넓히지 않는다.
-- is_hwayang_field_member가 대상 project_id = 화양 여부와 호출자의 활성 현장 멤버십을 함께 검증하므로,
-- 화양이 아닌 project_id를 넘기거나 비멤버가 호출하면 빈 결과가 반환된다.
create or replace function public.list_move_in_field_members(p_project_id uuid)
returns table (member_id uuid, display_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select pm.id, pm.display_name
  from public.project_member as pm
  where pm.project_id = p_project_id
    and pm.active = true
    and private.is_hwayang_field_member(p_project_id)
  order by pm.created_at;
$$;

revoke all on function public.list_move_in_field_members(uuid) from public;

do $priv$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on function public.list_move_in_field_members(uuid) from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function public.list_move_in_field_members(uuid) to authenticated';
  end if;
end
$priv$;
