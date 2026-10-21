-- [05c] 방문상담 대상 백업 검증(운영 테이블 ↔ 백업 테이블) — 읽기 전용(단일 SELECT)
-- 꺾쇠 자리표시(BACKUP_SUFFIX)를 E1 실행 때 쓴 값으로 "모두 바꾸기(Ctrl+H)"한다(예: 20261020_0630, 5곳). 하나라도 남으면 테이블을 찾지 못해 실행되지 않는다.
-- 용도: (1) E1 백업 직후 — rows·md5 모두 같아야 PASS
--       (2) 롤백 후 재적용·E2 복구 직후 — 백업 행이 모두 복구되었는지 확인(backup_rows_missing_in_live = 0)
select
  (select count(*) from public.move_in_visit_target) as live_rows,
  (select count(*) from cutover_backup."move_in_visit_target_<BACKUP_SUFFIX>") as backup_rows,
  (select md5(coalesce(string_agg(v::text, '|' order by v.visit_target_id), '')) from public.move_in_visit_target v) as live_md5,
  (select md5(coalesce(string_agg(b::text, '|' order by b.visit_target_id), '')) from cutover_backup."move_in_visit_target_<BACKUP_SUFFIX>" b) as backup_md5,
  (select count(*) from cutover_backup."move_in_visit_target_<BACKUP_SUFFIX>" b
    where not exists (select 1 from public.move_in_visit_target v where v.visit_target_id = b.visit_target_id
      and (v.*)::text = (b.*)::text)) as backup_rows_missing_in_live,
  case when (select md5(coalesce(string_agg(v::text, '|' order by v.visit_target_id), '')) from public.move_in_visit_target v)
          = (select md5(coalesce(string_agg(b::text, '|' order by b.visit_target_id), '')) from cutover_backup."move_in_visit_target_<BACKUP_SUFFIX>" b)
       then 'PASS(동일)'
       when (select count(*) from cutover_backup."move_in_visit_target_<BACKUP_SUFFIX>" b
         where not exists (select 1 from public.move_in_visit_target v where v.visit_target_id = b.visit_target_id and (v.*)::text = (b.*)::text)) = 0
       then 'PASS(백업 전부 존재, 이후 신규 행 있음)'
       else 'FAIL' end as verdict;
