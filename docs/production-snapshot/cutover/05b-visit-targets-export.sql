-- [05b] 방문상담 대상 전체 행 내보내기 — 읽기 전용(단일 SELECT)
-- SQL Editor 결과를 CSV로 내려받아 DB 백업(E1)과 별개의 2차 보관본으로 둔다.
-- 내부 식별자(세대·계약·고객 UUID)가 들어 있으므로 저장소·바탕화면·동기화 폴더·메신저에 두지 않고,
-- 접근이 제한된 보관 위치 1곳에만 둔다. 롤백·복구 판단이 끝나면 보관 기한을 정해 삭제한다.
-- 20261017100000 적용 전에는 테이블이 없어 오류가 난다(그 경우 백업 대상 없음).
select *
from public.move_in_visit_target
order by created_at, visit_target_id;
