# 기본등급 보정 후보 (자동 보정 금지)

2026-10-09 운영 읽기 전용 진단 결과. **사용자 별도 승인 전 Production 데이터 보정 금지.**
개인정보 보호를 위해 동·호수/고객 식별자는 저장소에 기록하지 않는다. 아래 조회로 재확인한다.

| 구분 | 세대 | 근거 | 처리 |
|---|---|---|---|
| 앱 저장 RPC가 부재로 덮어씀 | 2 | 현재 계약자 본인 직전 확정 등급 D 1, C 1 (상담이력) | 보정 후보. 관리자 원본 확인 후 승인 시 보정 |
| 9/29 가져오기 출처 부재 | 16 | 일치하는 부재 상담 기록 없음 | 자동 변경 금지. 원본 Excel 확인 전 유지 |

후보 재확인 (읽기 전용):

```sql
begin read only;
select o.unit_id, o.legacy_grade, o.legacy_grade_as_of,
  (select k.structured_tags->>'legacy_grade' from public.consultation k
    where k.project_id = o.project_id and k.unit_id = o.unit_id and k.customer_id = c.customer_id
      and k.structured_tags->>'legacy_grade' in ('A','B','C','D')
    order by k.consulted_at desc, k.id desc limit 1) as prior_confirmed_grade
from public.unit_occupancy_status o
join public.contract c on c.project_id = o.project_id and c.unit_id = o.unit_id
  and c.contract_id = o.contract_id and c.contract_status = 'ACTIVE'
where o.project_id = '1283e198-5043-4027-96d6-edcc7a6686c6' and o.legacy_grade = '부재'
  and exists (select 1 from public.consultation k where k.project_id = o.project_id and k.unit_id = o.unit_id
    and k.customer_id = c.customer_id and k.channel is null and k.consulted_at = o.legacy_grade_as_of
    and k.structured_tags->>'legacy_grade' = '부재');
commit;
```
