-- 20261020120000_recovery_session_membership_block 롤백: 두 소속 함수를 recovery 제외 조건이 없는 원문으로 되돌린다. 데이터 변경 없음.
begin;

do $preflight$
begin
  -- 두 함수가 이 마이그레이션 적용 상태여야 한다(다르면 아무것도 바꾸지 않고 중단)
  if position('"method": "recovery"' in (select prosrc from pg_proc
       where oid = 'private.current_project_member_id(uuid,public.project_member_role[])'::regprocedure)) = 0
     or to_regprocedure('private.current_project_memberships()') is null
     or position('"method": "recovery"' in (select prosrc from pg_proc
       where oid = 'private.current_project_memberships()'::regprocedure)) = 0 then
    raise exception 'membership functions are not the expected recovery-block state; abort';
  end if;
  perform set_config('lock_timeout', '5s', true);
end
$preflight$;

create or replace function private.current_project_member_id(p_project_id uuid, p_allowed_roles public.project_member_role[])
returns uuid
language sql
stable
security definer
set search_path to ''
as $function$
  select pm.id
  from public.project_member as pm
  inner join public.project as p on p.id = pm.project_id
  inner join public.organization as o on o.id = p.organization_id
  where pm.project_id = p_project_id
    and pm.user_id = auth.uid()
    and pm.active = true
    and p.status = 'ACTIVE'::public.project_status
    and o.status = 'ACTIVE'::public.organization_status
    and pm.role = any (p_allowed_roles)
    and pm.role in (
      'COUNSELOR'::public.project_member_role,
      'PROJECT_ADMIN'::public.project_member_role,
      'CLIENT_MANAGER'::public.project_member_role
    )
  limit 1;
$function$;

create or replace function private.current_project_memberships()
returns table(project_id uuid, member_id uuid, role public.project_member_role)
language sql
stable
security definer
set search_path to ''
as $function$
  select pm.project_id, pm.id, pm.role
  from public.project_member as pm
  inner join public.project as p on p.id = pm.project_id
  inner join public.organization as o on o.id = p.organization_id
  where pm.user_id = auth.uid()
    and pm.active = true
    and p.status = 'ACTIVE'::public.project_status
    and o.status = 'ACTIVE'::public.organization_status
    and pm.role in (
      'COUNSELOR'::public.project_member_role,
      'PROJECT_ADMIN'::public.project_member_role,
      'CLIENT_MANAGER'::public.project_member_role
    );
$function$;

commit;
