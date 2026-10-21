-- [E2] 실행 SQL(쓰기) — 방문상담 대상 복구. 검증 SQL이 아님. 런북에서 승인된 경우에만 실행한다.
-- 언제: DB 롤백 후 20261017100000 을 다시 적용해(테이블 재생성) 방문상담 기능을 되살릴 때.
-- 꺾쇠 자리표시(BACKUP_SUFFIX)를 E1 에서 쓴 값으로 "모두 바꾸기(Ctrl+H)"한다(1곳).
-- 이미 있는 행(같은 visit_target_id), 그리고 재적용 뒤 새로 생긴 진행 중 방문대상과 겹치는 행(계약당 진행 중 1건 제약)은
-- 건너뛴다(on conflict do nothing). 실행 후 05c 로 backup_rows_missing_in_live 를 확인하고, 0이 아니면 건너뛴 행을 검토한다.
-- 기본등급(legacy_grade)·상담이력은 건드리지 않는다.
begin;
insert into public.move_in_visit_target
select * from cutover_backup."move_in_visit_target_<BACKUP_SUFFIX>"
on conflict do nothing;
commit;
