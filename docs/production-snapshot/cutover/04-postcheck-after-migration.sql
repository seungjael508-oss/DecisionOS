-- [전환 당일 04] 신규 SQL 적용 직후 검증: 함수·권한·등급 분포·상담 건수 — 읽기 전용(단일 SELECT)
-- 생성: docs/production-snapshot/verification/gen-cutover-postcheck.mjs (03과 같은 계산, 직접 수정하지 말 것)
-- verdict: PASS/FAIL = 자동 판정, SAME = 03 결과와 같아야 함, CHANGED = 03과 달라야 함(수동 대조), INFO = 참고
-- FAIL 이 1건이라도 있거나 SAME/CHANGED 대조가 어긋나면 신규 코드 승격을 중단하고 런북의 중단 조건을 따른다.
-- 마이그레이션은 데이터를 바꾸지 않으므로 등급 분포·상담 건수는 03과 같아야 한다(상담 저장 중지 상태 전제).
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
),
state(section, item, value) as (
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
         else (xpath('//row/c/text()', query_to_xml('select count(*) as c from public.move_in_visit_target', false, true, '')))[1]::text end
),
expected(item, expected, mode) as (values
    ('server_version', '', 'INFO'),
    ('checked_at_kst', '', 'INFO'),
    ('mig_20261009_absent_separation', 'true', 'ABS'),
    ('mig_20261015_cd_focus', 'true', 'ABS'),
    ('mig_20261017100000_visit_target', 'true', 'ABS'),
    ('mig_20261017110000_d_admin_guard', 'true', 'ABS'),
    ('mig_20261017120000_auto_d', 'true', 'ABS'),
    ('create_move_in_consultation(17) md5', '03과 다름', 'CHANGED'),
    ('create_move_in_consultation(18) md5', '03과 같음', 'SAME'),
    ('get_move_in_today_queue md5', '03과 다름', 'CHANGED'),
    ('get_move_in_absence_candidates exists', 'true', 'ABS'),
    ('record_move_in_visit_result exists', 'true', 'ABS'),
    ('create_move_in_consultation(17) authenticated EXECUTE', '03과 같음', 'SAME'),
    ('create_move_in_consultation(17) anon EXECUTE', '03과 같음', 'SAME'),
    ('create_move_in_consultation(18) authenticated EXECUTE', '03과 같음', 'SAME'),
    ('create_move_in_consultation(18) anon EXECUTE', '03과 같음', 'SAME'),
    ('get_move_in_today_queue(2) authenticated EXECUTE', '03과 같음', 'SAME'),
    ('get_move_in_today_queue(2) anon EXECUTE', '03과 같음', 'SAME'),
    ('get_move_in_absence_candidates(1) authenticated EXECUTE', 'true', 'ABS'),
    ('get_move_in_absence_candidates(1) anon EXECUTE', 'false', 'ABS'),
    ('record_move_in_visit_result(6) authenticated EXECUTE', 'true', 'ABS'),
    ('record_move_in_visit_result(6) anon EXECUTE', 'false', 'ABS'),
    ('move_in_visit_target exists', 'true', 'ABS'),
    ('move_in_visit_target RLS enabled', 'true', 'ABS'),
    ('move_in_visit_target policies', '1', 'ABS'),
    ('move_in_visit_target authenticated SELECT/INSERT/UPDATE/DELETE', 'true/false/false/false', 'ABS'),
    ('move_in_visit_target anon SELECT', 'false', 'ABS'),
    ('stayj active units', '03과 같음', 'SAME'),
    ('stayj grade A/B/C/D/부재/상담거절/미등록', '03과 같음', 'SAME'),
    ('consultation total (all projects)', '03과 같음', 'SAME'),
    ('consultation stayj', '03과 같음', 'SAME'),
    ('contract_status_history total', '03과 같음', 'SAME'),
    ('contract_status_history legacy_grade', '03과 같음', 'SAME'),
    ('move_in_tracking_disposition total', '03과 같음', 'SAME'),
    ('move_in_visit_target rows', '0', 'ABS')
)
select s.section, s.item, s.value, e.expected,
  case when e.mode is null then 'UNCHECKED'
       when e.mode = 'ABS' then case when s.value = e.expected then 'PASS' else 'FAIL' end
       else e.mode end as verdict
from state s left join expected e on e.item = s.item
union all
select 'summary', 'ABS 항목 FAIL 수', count(*)::text, '0',
  case when count(*) = 0 then 'PASS' else 'FAIL' end
from state s join expected e on e.item = s.item where e.mode = 'ABS' and s.value is distinct from e.expected
union all
select 'summary', '누락 항목(기대값 있는데 결과 없음)', count(*)::text, '0', case when count(*) = 0 then 'PASS' else 'FAIL' end
from expected e where not exists (select 1 from state s where s.item = e.item);
