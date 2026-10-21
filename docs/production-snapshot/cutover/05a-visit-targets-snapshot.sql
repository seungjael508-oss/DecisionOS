-- [05a] 방문상담 대상 현재 상태 지문 — 읽기 전용(단일 SELECT)
-- 백업 전·롤백 판단 전에 실행해 결과를 보관한다. 테이블이 없으면(20261017100000 미적용) n/a.
-- 식별자는 출력하지 않는다(건수·상태별 건수·전체 지문만).
with vt as (select to_regclass('public.move_in_visit_target') as t)
select
  (select t is not null from vt) as table_exists,
  case when (select t from vt) is null then 'n/a' else (xpath('//row/n/text()', query_to_xml(
    'select count(*) as n from public.move_in_visit_target', false, true, '')))[1]::text end as total_rows,
  case when (select t from vt) is null then 'n/a' else (xpath('//row/s/text()', query_to_xml(
    $q$select coalesce(string_agg(status || '=' || n, ' / ' order by status), 'none') as s
       from (select status, count(*) n from public.move_in_visit_target group by status) x$q$, false, true, '')))[1]::text end as rows_by_status,
  case when (select t from vt) is null then 'n/a' else (xpath('//row/h/text()', query_to_xml(
    $q$select md5(coalesce(string_agg(v::text, '|' order by v.visit_target_id), '')) as h from public.move_in_visit_target v$q$, false, true, '')))[1]::text end as rows_md5,
  now() at time zone 'Asia/Seoul' as checked_at_kst;
