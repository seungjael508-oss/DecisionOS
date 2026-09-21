-- 화양 현장 상담사별 실적 표시를 위해 project_member에 표시 이름을 추가한다.
-- 다른 프로젝트는 null을 유지하며, 화양 3명의 실제 값은 신원 확인 후 별도 데이터 마이그레이션으로 채운다.
-- (신원-계정 매핑은 이 작업지시서 범위 밖이며 production 적용 전 확인이 필요하다.)
alter table public.project_member
  add column display_name text
  constraint project_member_display_name_not_blank
  check (display_name is null or btrim(display_name) <> '');
