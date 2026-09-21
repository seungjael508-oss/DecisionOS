-- 화양 3인 실시간 업무일지: 실제 3명 계정과 project_member를 이메일 기준으로 매칭해
-- display_name을 채우는 데이터 마이그레이션. 앱 코드에는 이메일/UUID를 하드코딩하지 않는다.
--
-- 안전 규칙:
-- - project_id를 화양 한 건으로 고정하므로 다른 프로젝트의 project_member는 전혀 건드리지 않는다.
-- - auth.users.email이 매핑 표와 정확히(대소문자 무시) 일치하는 행만 갱신하고,
--   일치하지 않으면(오탈자, 탈퇴 계정, 아직 가입 전 등) 아무 것도 바꾸지 않는다(no-op).
-- - 재실행해도 안전하도록(idempotent) 값이 이미 같으면 갱신하지 않는다.
--
-- private 함수로 분리한 이유: 실행 시점에 매칭 대상 계정이 아직 없으면 이번 마이그레이션은 조용히
-- no-op으로 끝난다. 나중에 계정이 준비된 뒤에도 같은 로직으로 재검증(pgTAP)할 수 있어야 하므로
-- 로직을 함수로 남겨둔다. 앱/사용자에게는 노출하지 않는다(public/anon/authenticated 모두 실행 금지).
create function private.apply_hwayang_field_member_display_names()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_id constant uuid := '1283e198-5043-4027-96d6-edcc7a6686c6';
  v_mapping constant jsonb := '{
    "seungjael508@gmail.com": "이승재",
    "sojin7071@naver.com": "박진하",
    "lovesong7535@naver.com": "송용석"
  }'::jsonb;
begin
  update public.project_member pm
  set display_name = v_mapping ->> lower(u.email),
      updated_at = now()
  from auth.users u
  where pm.user_id = u.id
    and pm.project_id = v_project_id
    and u.email is not null
    and v_mapping ? lower(u.email)
    and pm.display_name is distinct from (v_mapping ->> lower(u.email));
end;
$$;

revoke all on function private.apply_hwayang_field_member_display_names() from public, anon, authenticated;

-- 마이그레이션 적용 시점에 한 번 실행한다. 대상 계정이 아직 이 환경에 없으면
-- 매칭되는 행이 없어 조용히 종료되며, 계정이 생기면 이 함수를 다시 실행해 채울 수 있다.
select private.apply_hwayang_field_member_display_names();
