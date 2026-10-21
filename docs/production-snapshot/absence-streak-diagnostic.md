# 장기 부재 D등급 전환·방문상담 — 적용 전 읽기 전용 진단

대상 변경: `supabase/migrations/20261017100000_absence_streak_visit_target.sql` (Production 미적용)

사용자 별도 승인 전 Production 데이터 변경·마이그레이션 적용 금지. 아래 쿼리는 모두 `begin read only` 트랜잭션에서만 실행한다.
마이그레이션 적용 전에도 돌릴 수 있도록 `get_move_in_absence_candidates`와 같은 규칙을 CTE로 그대로 옮겼다.
개인정보 보호를 위해 결과의 동·호수/고객 식별자는 저장소에 기록하지 않는다.

## 실행 방법

1. Supabase 대시보드 → 운영 프로젝트 → SQL Editor → New query.
2. 아래 쿼리를 `<project_id>`만 바꿔(화양: `1283e198-5043-4027-96d6-edcc7a6686c6`) **그대로** 붙여 넣는다. `begin read only; … commit;`을 지우지 않는다.
   읽기 전용 트랜잭션이라 INSERT/UPDATE/DDL은 `cannot execute … in a read-only transaction`으로 거부된다.
3. 결과 표의 **숫자만** 회신한다. 동·호수·고객명·전화번호는 회신하지 않는다(1·2·3번 쿼리는 식별자를 출력하지 않는다).

## 회신할 결과 항목

| 쿼리 | 항목 |
|---|---|
| 1 | `streak_3_plus`, `abc_to_d_candidates`, `already_d`, `other_to_d_candidates`, `streak_2_watch` |
| 2 | 등급별 세대 수(A/B/C/D/부재/미등록 × 3회·4회·5회 이상) |
| 3-1 | `legacy_grade`를 쓰는 함수 목록(이름·인자 수·SECURITY DEFINER 여부) |
| 3-2 | `authenticated`의 `unit_occupancy_status` UPDATE 권한 여부(테이블·`legacy_grade` 컬럼) |
| 3-3 | `unit_occupancy_status`·`consultation` 트리거 목록 |
| 3-4 | `create_move_in_consultation` 17/18인자 md5(20261017110000 적용 전 기준값 기록용) |

## 집계 규칙

- 현재 ACTIVE 계약자 본인 상담만(이전 계약자 상담 제외), 추적 제외(`move_in_tracking_exclusion.active`) 세대 제외
- 연속 부재 = 마지막 실제 접촉(부재 외 모든 상담, 상담거절 포함) 이후의 **전화(CALL) 부재** 건수
- 방문 부재 등 전화가 아닌 부재는 세지도 초기화하지도 않음. 실제 접촉과 같은 시각의 부재는 세지 않음
- 가져오기로 `legacy_grade = '부재'`만 있고 상담 기록이 없는 세대(grade-correction-candidates.md의 16세대)는 기록이 없으므로 집계되지 않음

## 1. 연속 부재 3회 이상 · D 변경 후보 · 이미 D

```sql
begin read only;
with
current_holder as (
  select uos.unit_id, uos.contract_id, uos.legacy_grade, c.customer_id
  from public.unit_occupancy_status uos
  join public.contract c on c.project_id = uos.project_id and c.unit_id = uos.unit_id
   and c.contract_id = uos.contract_id and c.contract_status = 'ACTIVE'
  where uos.project_id = '<project_id>'
    and not exists (select 1 from public.move_in_tracking_exclusion x where x.project_id = uos.project_id
      and x.unit_id = uos.unit_id and x.contract_id = uos.contract_id and x.active)
),
hc as (
  select k.unit_id, k.consulted_at, k.contact_type, k.structured_tags->>'legacy_grade' as tag
  from public.consultation k join current_holder h on h.unit_id = k.unit_id and h.customer_id = k.customer_id
  where k.project_id = '<project_id>'
),
last_real as (select unit_id, max(consulted_at) filter (where tag is distinct from '부재') as at from hc group by unit_id),
streak as (
  select hc.unit_id, count(*)::int as n
  from hc join last_real lr on lr.unit_id = hc.unit_id
  where hc.tag = '부재' and hc.contact_type = 'CALL' and (lr.at is null or hc.consulted_at > lr.at)
  group by hc.unit_id
)
select
  count(*) filter (where s.n >= 3) as streak_3_plus,
  count(*) filter (where s.n >= 3 and h.legacy_grade in ('A','B','C')) as abc_to_d_candidates,
  count(*) filter (where s.n >= 3 and h.legacy_grade = 'D') as already_d,
  count(*) filter (where s.n >= 3 and (h.legacy_grade is null or h.legacy_grade not in ('A','B','C','D'))) as other_to_d_candidates,
  count(*) filter (where s.n = 2) as streak_2_watch
from current_holder h join streak s on s.unit_id = h.unit_id;
commit;
```

## 2. 등급별 분포

1번과 같은 CTE에서 마지막 `select … ;`만 아래로 바꾼다(`commit;`은 유지).

```sql
select coalesce(h.legacy_grade, '미등록') as grade,
  count(*) filter (where s.n = 3) as streak_3,
  count(*) filter (where s.n = 4) as streak_4,
  count(*) filter (where s.n >= 5) as streak_5_plus,
  count(*) as total
from current_holder h join streak s on s.unit_id = h.unit_id
where s.n >= 3
group by 1 order by 1;
```

## 3. 관리자 승인 없는 D 변경 경로 점검(카탈로그만 조회, 식별자 없음)

```sql
begin read only;
-- 3-1 legacy_grade를 쓰는 함수
select n.nspname, p.proname, p.pronargs, p.prosecdef
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'private')
  and p.prokind = 'f'
  and (pg_get_functiondef(p.oid) ~* 'update\s+(public\.)?unit_occupancy_status[^;]*legacy_grade\s*='
    or pg_get_functiondef(p.oid) ~* 'insert\s+into\s+(public\.)?unit_occupancy_status[^;]*legacy_grade')
order by 1, 2, 3;
-- 3-2 PostgREST 직접 수정 가능 여부
select has_table_privilege('authenticated', 'public.unit_occupancy_status', 'UPDATE') as table_update,
       has_column_privilege('authenticated', 'public.unit_occupancy_status', 'legacy_grade', 'UPDATE') as legacy_grade_update;
select policyname, cmd, roles from pg_policies
where schemaname = 'public' and tablename = 'unit_occupancy_status' and cmd in ('UPDATE', 'ALL');
-- 3-3 트리거
select c.relname, t.tgname from pg_trigger t join pg_class c on c.oid = t.tgrelid
where not t.tgisinternal and c.relname in ('unit_occupancy_status', 'consultation');
-- 3-4 상담 저장 RPC 정의 기준값
select pronargs, md5(pg_get_functiondef(oid)) from pg_proc
where pronamespace = 'public'::regnamespace and proname = 'create_move_in_consultation' order by 1;
commit;
```

판정: 3-1에서 `create_move_in_consultation`(17) 외 함수가 나오거나 3-2가 `true`이면
관리자 승인 없이 D로 바꿀 수 있는 경로가 남아 있으므로 해당 경로에 같은 가드를 추가해야 한다.

## 4. 방문상담 대상 수(적용 직후 예상)

적용 직후에는 `move_in_visit_target`이 비어 있으므로 방문상담 필요 0세대다. 관리자 승인 1건마다 1세대가 생기며,
계약당 진행 중 방문대상은 1건으로 제한된다. 적용 후 확인:

```sql
begin read only;
select status, count(*) from public.move_in_visit_target where project_id = '<project_id>' group by status;
commit;
```

## 5. 오늘 관리대상 변화(적용 후)

- 추가: 1번의 `streak_3_plus` 세대가 등급과 무관하게 `ABSENCE_STREAK`(HIGH)로 표시된다(A·B 세대 포함).
- 유지: C·D 세대의 기존 사유. A·B 장기 부재 세대에는 C·D 전용 사유(부재 재접촉·매도 관리·방문 예정)가 붙지 않는다.
- `source_fingerprint`에 사유 목록이 포함되므로 마이그레이션 사전 점검이 오늘(KST) 처리 기록이 있으면 중단한다.
