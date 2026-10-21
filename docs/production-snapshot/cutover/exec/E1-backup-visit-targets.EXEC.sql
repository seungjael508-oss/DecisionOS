-- [E1] 실행 SQL(쓰기) — 방문상담 대상 DB 백업. 검증 SQL이 아님. 런북에서 승인된 단계에서만 실행한다.
-- 언제: DB 롤백(20261017100000 롤백은 move_in_visit_target 을 삭제)을 결정하기 전, 반드시 먼저 실행.
-- 꺾쇠 자리표시(BACKUP_SUFFIX)를 실행 시각으로 "모두 바꾸기(Ctrl+H)"한다(예: 20261020_0630, 2곳). 하나라도 남으면 실행되지 않는다.
-- 백업 스키마는 API(PostgREST) 노출 대상이 아니며, anon·authenticated 권한을 모두 제거한다.
-- 실행 후 05a(운영 지문)·05c(백업 검증)를 실행해 PASS 를 확인한다.
begin;
create schema if not exists cutover_backup;
revoke all on schema cutover_backup from public, anon, authenticated;
create table cutover_backup."move_in_visit_target_<BACKUP_SUFFIX>" as
  select * from public.move_in_visit_target;
revoke all on table cutover_backup."move_in_visit_target_<BACKUP_SUFFIX>" from public, anon, authenticated;
commit;
