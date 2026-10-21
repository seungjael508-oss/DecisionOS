-- 장기 부재 판정 규칙·실제 데이터 대조 — 읽기 전용(단일 SELECT), 집계값만(고객·세대 식별자 미출력)
-- 1) 현재 ACTIVE 계약자 상담의 contact_type × channel × 등급 태그 분포
-- 2) 연속 전화 부재 3회 이상 세대 수: 현재 DB 규칙 vs 화면 표시 기준 규칙
--    현재 규칙: 부재 = 태그 '부재' AND contact_type 'CALL', 초기화 = 태그가 '부재'가 아닌 모든 상담(문자 포함)
--    화면 기준: 부재 = 태그 '부재' AND (CALL 또는 Stay J 레거시 이관 CONSULTATION(화면에 '콜'로 표시)),
--              초기화 = 태그가 '부재'가 아닌 상담 중 문자(MESSAGE) 제외
-- 3) 두 규칙 차이의 원인별 세대 수(문자 초기화 / 레거시 이관 부재 미집계)
with p as (select '1283e198-5043-4027-96d6-edcc7a6686c6'::uuid as id),
holder as (
  select uos.unit_id, c.customer_id
  from public.unit_occupancy_status uos
  join public.contract c on c.project_id = uos.project_id and c.unit_id = uos.unit_id and c.contract_id = uos.contract_id
   and c.contract_status = 'ACTIVE'
  where uos.project_id = (select id from p)
),
k as (
  select k.unit_id, k.consulted_at, k.contact_type, k.channel, k.structured_tags->>'legacy_grade' as tag
  from public.consultation k join holder h on h.unit_id = k.unit_id and h.customer_id = k.customer_id
  where k.project_id = (select id from p)
),
r as (
  select unit_id,
    max(consulted_at) filter (where tag is distinct from '부재') as last_real_cur,
    max(consulted_at) filter (where tag is distinct from '부재' and contact_type is distinct from 'MESSAGE') as last_real_alt
  from k group by unit_id
),
s as (
  select k.unit_id,
    count(*) filter (where k.tag = '부재' and k.contact_type = 'CALL'
                       and (r.last_real_cur is null or k.consulted_at > r.last_real_cur)) as streak_cur,
    count(*) filter (where k.tag = '부재' and (k.contact_type = 'CALL' or (k.channel = 'LEGACY_IMPORT' and k.contact_type = 'CONSULTATION'))
                       and (r.last_real_alt is null or k.consulted_at > r.last_real_alt)) as streak_alt,
    count(*) filter (where k.tag = '부재' and k.contact_type = 'CALL'
                       and (r.last_real_alt is null or k.consulted_at > r.last_real_alt)) as streak_alt_no_legacy,
    count(*) filter (where k.tag = '부재' and (k.contact_type = 'CALL' or (k.channel = 'LEGACY_IMPORT' and k.contact_type = 'CONSULTATION'))
                       and (r.last_real_cur is null or k.consulted_at > r.last_real_cur)) as streak_alt_no_sms
  from k join r on r.unit_id = k.unit_id group by k.unit_id
)
select '1 분포' as section,
  coalesce(contact_type, '(null)') || ' / ' || coalesce(channel, '(null)') || ' / ' || coalesce(tag, '(태그 없음)') as item,
  count(*)::text as value
from k group by 2
union all select '2 3회+ 세대', '현재 DB 규칙', count(*) filter (where streak_cur >= 3)::text from s
union all select '2 3회+ 세대', '화면 기준 규칙(문자 무시 + 레거시 이관 부재 포함)', count(*) filter (where streak_alt >= 3)::text from s
union all select '3 차이 원인', '문자 초기화만 고칠 때 3회+', count(*) filter (where streak_alt_no_legacy >= 3)::text from s
union all select '3 차이 원인', '레거시 이관 부재만 포함할 때 3회+', count(*) filter (where streak_alt_no_sms >= 3)::text from s
union all select '3 차이 원인', '현재 2회 이하 → 화면 기준 3회+ 세대', count(*) filter (where streak_cur < 3 and streak_alt >= 3)::text from s
union all select '4 방문대상', 'move_in_visit_target 상태별', coalesce((select string_agg(status || '=' || n, ', ') from
  (select status, count(*) n from public.move_in_visit_target where project_id = (select id from p) group by status) v), '0건')
union all select '4 자동 D', 'legacy_grade 이력(장기 부재 사유)', (select count(*)::text from public.contract_status_history
  where project_id = (select id from p) and field_changed = 'legacy_grade' and reason = '장기 부재중(연속 3회)')
union all select '5 제한시간', 'authenticated 역할 설정(statement_timeout 등)',
  coalesce((select array_to_string(rolconfig, ', ') from pg_roles where rolname = 'authenticated'), '(없음)')
order by 1, 2;
