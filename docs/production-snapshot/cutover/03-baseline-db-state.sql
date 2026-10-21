-- [전환 당일 03] 적용 전 기준선: 함수 원문 지문·권한·마이그레이션 단계·데이터 건수 — 읽기 전용(단일 SELECT)
-- 결과 표 전체를 보관(CSV 다운로드)한다. 04(적용 후)와 같은 항목을 같은 방식으로 계산한다.
-- 기대 상태(현 운영): mig_20261009 = true, 나머지 mig_* = false, visit_target 관련 = n/a
-- 개인정보·식별자는 출력하지 않는다(건수·지문만).
with
fn as (
  select p.oid, p.proname, p.pronargs, pg_get_functiondef(p.oid) as def,
    md5(regexp_replace(pg_get_functiondef(p.oid), '\s+', ' ', 'g')) as def_md5
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.proname in ('create_move_in_consultation', 'get_move_in_today_queue', 'get_move_in_absence_candidates', 'record_move_in_visit_result')
),
c17 as (select * from fn where proname = 'create_move_in_consultation' and pronargs = 17),
c18 as (select * from fn where proname = 'create_move_in_consultation' and pronargs = 18),
q as (select * from fn where proname = 'get_move_in_today_queue'),
vt as (select to_regclass('public.move_in_visit_target') as t),
cur as (
  select uos.legacy_grade
  from public.unit_occupancy_status uos
  join public.contract c on c.project_id = uos.project_id and c.unit_id = uos.unit_id
   and c.contract_id = uos.contract_id and c.contract_status = 'ACTIVE'
  where uos.project_id = '1283e198-5043-4027-96d6-edcc7a6686c6'
),
priv as (
  select f.proname || '(' || f.pronargs || ')' as fn_name,
    has_function_privilege('authenticated', f.oid, 'EXECUTE') as auth_exec,
    has_function_privilege('anon', f.oid, 'EXECUTE') as anon_exec
  from fn f
)
select 'env' as section, 'server_version' as item, current_setting('server_version') as value
union all select 'env', 'checked_at_kst', (now() at time zone 'Asia/Seoul')::text
union all select 'migration', 'mig_20261009_absent_separation', ((select def from c17) like '%부재는 실제 접촉이 아니므로%')::text
union all select 'migration', 'mig_20261015_cd_focus', coalesce(((select def from q) like '%uos.legacy_grade in (''C'', ''D'')%' and (select def from q) not like '%FOLLOW_UP_DUE%'), false)::text
union all select 'migration', 'mig_20261017100000_visit_target', ((select t from vt) is not null and coalesce((select def from q) like '%ABSENCE_STREAK%', false))::text
union all select 'migration', 'mig_20261017110000_d_admin_guard', coalesce((select def from c17) like '%v_grade_before%', false)::text
union all select 'migration', 'mig_20261017120000_auto_d', coalesce((select def from c17) like '%v_absence_streak%', false)::text
union all select 'function', 'create_move_in_consultation(17) md5', coalesce((select def_md5 from c17), 'missing')
union all select 'function', 'create_move_in_consultation(18) md5', coalesce((select def_md5 from c18), 'missing')
union all select 'function', 'get_move_in_today_queue md5', coalesce((select def_md5 from q), 'missing')
union all select 'function', 'get_move_in_absence_candidates exists', exists(select 1 from fn where proname = 'get_move_in_absence_candidates')::text
union all select 'function', 'record_move_in_visit_result exists', exists(select 1 from fn where proname = 'record_move_in_visit_result')::text
union all select 'acl', fn_name || ' authenticated EXECUTE', auth_exec::text from priv
union all select 'acl', fn_name || ' anon EXECUTE', anon_exec::text from priv
union all select 'acl', 'move_in_visit_target exists', ((select t from vt) is not null)::text
union all select 'acl', 'move_in_visit_target RLS enabled', coalesce((select c.relrowsecurity::text from pg_class c where c.oid = (select t from vt)), 'n/a')
union all select 'acl', 'move_in_visit_target policies', coalesce((select count(*)::text from pg_policies where schemaname = 'public' and tablename = 'move_in_visit_target' and (select t from vt) is not null), 'n/a')
union all select 'acl', 'move_in_visit_target authenticated SELECT/INSERT/UPDATE/DELETE',
  case when (select t from vt) is null then 'n/a' else concat_ws('/',
    has_table_privilege('authenticated', (select t from vt), 'SELECT')::text, has_table_privilege('authenticated', (select t from vt), 'INSERT')::text,
    has_table_privilege('authenticated', (select t from vt), 'UPDATE')::text, has_table_privilege('authenticated', (select t from vt), 'DELETE')::text) end
union all select 'acl', 'move_in_visit_target anon SELECT',
  case when (select t from vt) is null then 'n/a' else has_table_privilege('anon', (select t from vt), 'SELECT')::text end
union all select 'data', 'stayj active units', (select count(*) from cur)::text
union all select 'data', 'stayj grade A/B/C/D/부재/상담거절/미등록', concat_ws('/',
  (select count(*) from cur where legacy_grade = 'A'), (select count(*) from cur where legacy_grade = 'B'),
  (select count(*) from cur where legacy_grade = 'C'), (select count(*) from cur where legacy_grade = 'D'),
  (select count(*) from cur where legacy_grade = '부재'), (select count(*) from cur where legacy_grade = '상담거절'),
  (select count(*) from cur where legacy_grade is null))
union all select 'data', 'consultation total (all projects)', (select count(*) from public.consultation)::text
union all select 'data', 'consultation stayj', (select count(*) from public.consultation where project_id = '1283e198-5043-4027-96d6-edcc7a6686c6')::text
union all select 'data', 'contract_status_history total', (select count(*) from public.contract_status_history)::text
union all select 'data', 'contract_status_history legacy_grade', (select count(*) from public.contract_status_history where field_changed = 'legacy_grade')::text
union all select 'data', 'move_in_tracking_disposition total', (select count(*) from public.move_in_tracking_disposition)::text
union all select 'data', 'move_in_visit_target rows',
  case when (select t from vt) is null then 'n/a'
       else (xpath('//row/c/text()', query_to_xml('select count(*) as c from public.move_in_visit_target', false, true, '')))[1]::text end;
