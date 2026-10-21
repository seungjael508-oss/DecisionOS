# 오늘 관리대상 C·D등급 집중관리 — 적용 전 읽기 전용 진단

대상 변경: `supabase/migrations/20261015100000_today_queue_cd_focus.sql` (Production 미적용)

사용자 별도 승인 전 Production 데이터·정책값 변경 및 마이그레이션 적용 금지. 아래 쿼리는 모두 `begin read only` 트랜잭션에서만 실행한다.

## 1. 정책값 확인 (장기 미접촉·부재 재접촉)

정책 행이 없거나 `active = false`이면 해당 사유(D_GRADE_STALE, C_GRADE_STALE, ABSENCE_RETRY)는 변경 전후 모두 선정되지 않는다. 기간 설정은 별도 승인 후 등록한다.

```sql
begin read only;
select reason_code, stale_after, active
from public.move_in_tracking_policy
where project_id = '<project_id>'
  and reason_code in ('D_GRADE_STALE', 'C_GRADE_STALE', 'ABSENCE_RETRY')
order by reason_code;
commit;
```

## 2. 변경 전후 대상 세대 수

현재 운영 함수 결과에서 신규 규칙(C·D만, FOLLOW_UP_DUE 제외)을 적용해 근사한다. 20261009 마이그레이션이 운영에 적용된 상태에서 정확하며, 미적용 상태라면 C·D 부재 세대의 경과 기준이 달라 차이가 날 수 있다. 이전 계약 방문일정만으로 잡힌 세대(신규 함수에서 제외)는 이 근사에 반영되지 않는다.

```sql
begin read only;
with before as (
  select * from public.get_move_in_today_queue('<project_id>', now())
),
after as (
  select * from before
  where legacy_grade in ('C', 'D')
    and array_remove(reason_codes, 'FOLLOW_UP_DUE') <> '{}'::text[]
)
select
  (select count(distinct unit_id) from before) as before_units,
  (select count(distinct unit_id) from after) as after_units,
  (select count(distinct unit_id) from before
    where legacy_grade is null or legacy_grade not in ('C', 'D')) as excluded_not_cd,
  (select count(distinct unit_id) from before
    where legacy_grade in ('C', 'D') and reason_codes = array['FOLLOW_UP_DUE']) as excluded_follow_up_only;
commit;
```

등급별 제외 내역:

```sql
begin read only;
select coalesce(legacy_grade, '미등록') as grade, count(distinct unit_id) as units
from public.get_move_in_today_queue('<project_id>', now())
where legacy_grade is null or legacy_grade not in ('C', 'D')
group by 1
order by 1;
commit;
```

## 참고

- `source_fingerprint`에 사유 목록이 포함되므로, 적용 당일 이미 처리(DONE/SNOOZE)한 세대 중 사유 목록이 바뀐 세대는 다시 표시될 수 있다. 마이그레이션 사전 점검이 오늘(KST) 처리 기록이 1건이라도 있으면 중단하므로 처리 기록이 없는 날에만 적용된다.
- 기존 `legacy_grade = '부재'` 세대(grade-correction-candidates.md의 16+2세대 포함)는 C·D가 아니므로 오늘 관리대상에서 빠진다. 등급 보정은 별도 승인 사항이다.
