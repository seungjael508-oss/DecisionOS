-- 비밀번호 재설정 링크로 만든 세션(JWT amr에 method=recovery)을 업무 소속 판정에서 제외 (Production 미적용, 별도 승인 필요)
-- 원인(2026-10-20 격리 검증 iso-recovery-session-access.mjs): 복구 세션 JWT도 일반 로그인과 같은 sub·role(authenticated)이라
--   private.current_project_member_id / private.current_project_memberships가 소속을 그대로 돌려준다
--   → 고객 조회(전화번호 포함)·프로젝트 조회·상담 저장이 일반 로그인과 똑같이 성공. 앱(proxy)의 /reset-password 강제 이동만으로는
--   Supabase Data API 직접 호출을 막지 못한다.
-- 수정: 두 함수의 소속 조건에 "현재 JWT amr에 recovery가 없음"을 추가한다(시그니처·SECURITY DEFINER·STABLE·search_path·소유자·권한 그대로).
--   SELECT 정책(has_project_role·is_hwayang_field_member·A8 소속 목록)과 쓰기 RPC(write_rpc_actor), 전화번호 변경 트리거가
--   모두 이 두 함수를 거치므로 복구 세션은 소속 없음과 같아진다. amr이 없거나 다른 방식(password·invite·otp 등)이면 결과는 그대로다.
--   비밀번호 변경(GoTrue)·초대(amr=invite)·서버 키(auth.uid() 없음) 경로는 이 함수를 쓰지 않거나 결과가 같다.
-- 정책·다른 함수·데이터는 바꾸지 않는다.
begin;

do $preflight$
begin
  -- 수정 대상 함수 원문이 기대한 정의(운영 원문 + A8)와 같아야 한다(다르면 아무것도 바꾸지 않고 중단)
  if (select md5(prosrc) from pg_proc where oid = 'private.current_project_member_id(uuid,public.project_member_role[])'::regprocedure)
     is distinct from 'c13d451391341afbc7857362c647c12a' then
    raise exception 'private.current_project_member_id is not the expected definition; abort';
  end if;
  if to_regprocedure('private.current_project_memberships()') is null then
    raise exception 'private.current_project_memberships is missing (A8 20261019120000 not applied); abort';
  end if;
  if (select md5(prosrc) from pg_proc where oid = 'private.current_project_memberships()'::regprocedure)
     is distinct from 'a365bc18d38dc104b039355fa0aa3133' then
    raise exception 'private.current_project_memberships is not the expected definition; abort';
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
    and not coalesce((auth.jwt() -> 'amr') @> '[{"method": "recovery"}]'::jsonb, false)
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
    and not coalesce((auth.jwt() -> 'amr') @> '[{"method": "recovery"}]'::jsonb, false)
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
