-- 20261021100000_special_case_visit_target 롤백: 특별관리→방문대상 연결 트리거와 출처 허용을 제거한다. 코드를 먼저 되돌린 뒤에만 실행.
-- 특별관리 출처 방문대상은 운영 기록이다. 하나라도 있으면 아무것도 바꾸지 않고 중단한다
-- (행을 지우거나 출처를 바꾸는 롤백은 별도 승인으로 정한다).
begin;

do $preflight$
begin
  if to_regprocedure('private.open_visit_target_from_special_case()') is null
     or not exists (select 1 from pg_trigger where tgrelid = 'public.move_in_special_case'::regclass
                    and tgname = 'open_visit_target_from_special_case' and not tgisinternal) then
    raise exception 'not the 20261021100000 state; abort';
  end if;
  if exists (select 1 from public.move_in_visit_target where source = 'SPECIAL_CASE') then
    raise exception 'special case visit targets exist; abort (operational records, separate approval required)';
  end if;
  perform set_config('lock_timeout', '5s', true);
end
$preflight$;

drop trigger open_visit_target_from_special_case on public.move_in_special_case;
drop function private.open_visit_target_from_special_case();

alter table public.move_in_visit_target
  drop constraint move_in_visit_target_source_check,
  drop constraint move_in_visit_target_absence_streak_at_open_check;
alter table public.move_in_visit_target
  add constraint move_in_visit_target_source_check check (source in ('ABSENCE_STREAK')),
  add constraint move_in_visit_target_absence_streak_at_open_check check (absence_streak_at_open >= 3);

commit;
