-- [전환 당일 02b] 02 STOP 원인 진단 — 읽기 전용(단일 SELECT), 개인정보·식별자 미출력
-- 중지 시각 이후 쓰기의 실제 발생 시각(KST), 같은 상담 저장에서 나온 연쇄 변경 여부, 쓰기가 계속되는지 확인한다.
-- 세대·상담은 md5 앞 8자리 키로만 표시한다(원래 ID·이름·전화·동호수 미출력). 작성자는 역할만 표시한다.
-- 02의 중지 시각·판정은 바꾸지 않는다. 아래 중지 시각은 02와 같아야 한다.
with stop as (select timestamptz '2026-10-19 10:50:00+09' as at),
c as (
  select k.id, k.unit_id, k.counselor_id, k.created_at, k.updated_at, k.consulted_at, k.contact_type,
         k.structured_tags->>'legacy_grade' as grade_tag, m.role::text as author_role
  from public.consultation k
  left join public.project_member m on m.id = k.counselor_id
  cross join stop
  where k.created_at >= stop.at or k.updated_at >= stop.at or k.consulted_at >= stop.at
),
h as (
  select x.history_id, x.unit_id, x.contact_id, x.field_changed, x.changed_at
  from public.contract_status_history x, stop where x.changed_at >= stop.at
),
o as (
  select u.unit_id, u.updated_at, u.updated_by from public.unit_occupancy_status u, stop where u.updated_at >= stop.at
),
kst as (select 'Asia/Seoul'::text as tz),
-- 1) 중지 이후 상담 1건 = 저장 1회. 이력은 contact_id로 같은 상담에 확정 연결된다.
--    점유상태는 상담 ID 연결이 없으므로 같은 세대·±5초·작성자(updated_by) 일치로 추정한다(같은 트랜잭션 확정 증거는 아님)
chain as (
  select
    'chain' as section,
    'c:' || left(md5(c.id::text), 8) || ' u:' || left(md5(c.unit_id::text), 8) as item,
    to_char(c.created_at at time zone (select tz from kst), 'YYYY-MM-DD HH24:MI:SS') as at_kst,
    concat_ws(' / ',
      'created ' || to_char(c.created_at at time zone (select tz from kst), 'HH24:MI:SS'),
      'updated ' || to_char(c.updated_at at time zone (select tz from kst), 'HH24:MI:SS'),
      'consulted ' || to_char(c.consulted_at at time zone (select tz from kst), 'HH24:MI:SS'),
      'type ' || coalesce(c.contact_type, '-'),
      'grade_tag ' || coalesce(c.grade_tag, '-'),
      'author ' || coalesce(c.author_role, '-'),
      'occupancy_same_save ' || (select count(*) from o where o.unit_id = c.unit_id
                                   and abs(extract(epoch from o.updated_at - c.created_at)) <= 5),
      'occupancy_same_save_author ' || (select count(*) from o where o.unit_id = c.unit_id
                                   and abs(extract(epoch from o.updated_at - c.created_at)) <= 5
                                   and o.updated_by = c.counselor_id),
      'history_same_contact ' || (select count(*) || coalesce(' [' || string_agg(h.field_changed, ',') || ']', '')
                                  from h where h.contact_id = c.id)
    ) as detail
  from c
),
-- 2) 상담과 연결되지 않은 변경(다른 경로의 쓰기)
orphan as (
  select 'orphan' as section, 'occupancy u:' || left(md5(o.unit_id::text), 8) as item,
    to_char(o.updated_at at time zone (select tz from kst), 'YYYY-MM-DD HH24:MI:SS') as at_kst,
    '같은 세대 상담 저장(±5초) 없음' as detail
  from o
  where not exists (select 1 from c where c.unit_id = o.unit_id and abs(extract(epoch from o.updated_at - c.created_at)) <= 5)
  union all
  select 'orphan', 'history u:' || left(md5(h.unit_id::text), 8),
    to_char(h.changed_at at time zone (select tz from kst), 'YYYY-MM-DD HH24:MI:SS'),
    'field ' || h.field_changed || ' / 연결 상담 ' || case when h.contact_id is null then '없음' else '중지 전 상담' end
  from h
  where h.contact_id is null or not exists (select 1 from c where c.id = h.contact_id)
),
-- 3) 테이블별 중지 이후 건수·첫/마지막 변경 시각
t as (
  select 'consultation' as tbl, greatest(created_at, updated_at) as at from public.consultation, stop
    where created_at >= stop.at or updated_at >= stop.at
  union all select 'unit_occupancy_status', updated_at from public.unit_occupancy_status, stop where updated_at >= stop.at
  union all select 'contract', updated_at from public.contract, stop where updated_at >= stop.at
  union all select 'contract_status_history', changed_at from public.contract_status_history, stop where changed_at >= stop.at
  union all select 'contact_schedule', greatest(created_at, updated_at) from public.contact_schedule, stop where created_at >= stop.at or updated_at >= stop.at
  union all select 'customer', updated_at from public.customer, stop where updated_at >= stop.at
  union all select 'unit_deal', updated_at from public.unit_deal, stop where updated_at >= stop.at
  union all select 'move_in_special_case', updated_at from public.move_in_special_case, stop where updated_at >= stop.at
),
last as (
  select 'last' as section, tbl as item,
    to_char(max(at) at time zone (select tz from kst), 'YYYY-MM-DD HH24:MI:SS') as at_kst,
    count(*) || '건, 첫 ' || to_char(min(at) at time zone (select tz from kst), 'HH24:MI:SS') as detail
  from t group by tbl
),
-- 4) 쓰기가 계속되는지: 최근 10분·5분 건수와 현재 시각
ongoing as (
  select 'ongoing' as section, 'now' as item,
    to_char(now() at time zone (select tz from kst), 'YYYY-MM-DD HH24:MI:SS') as at_kst,
    '최근 10분 ' || (select count(*) from t where at >= now() - interval '10 minutes')
      || '건 / 최근 5분 ' || (select count(*) from t where at >= now() - interval '5 minutes')
      || '건 / 중지 이후 마지막 ' || coalesce((select to_char(max(at) at time zone (select tz from kst), 'HH24:MI:SS') from t), '없음') as detail
)
select section, item, at_kst, detail from (
  select 1 as s, * from chain
  union all select 2, * from orphan
  union all select 3, * from last
  union all select 4, * from ongoing
) r
order by s, at_kst, item;
