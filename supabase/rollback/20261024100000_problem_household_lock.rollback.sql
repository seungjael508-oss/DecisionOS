-- 20261024100000_problem_household_lock 롤백: 문제세대 RPC·잠금/초기화 트리거·칸·이력 값 허용을 제거한다. 코드를 먼저 되돌린 뒤에만 실행.
-- 저장된 문제세대 표기와 그 변경 이력은 운영 기록이다. 하나라도 있으면 아무것도 바꾸지 않고 중단한다
-- (값을 지우는 롤백은 별도 승인으로 정한다. 그 전에는 신규 코드만 되돌려 화면에서 숨긴다. 잠금 트리거는 계속 동작한다).
begin;

do $preflight$
begin
  if to_regprocedure('public.set_move_in_problem_household(uuid,uuid,uuid,uuid,text[],boolean,text,text)') is null
     or to_regprocedure('private.enforce_problem_household_lock()') is null
     or to_regprocedure('private.reset_problem_household_on_contract_change()') is null
     or not exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'unit_occupancy_status' and column_name = 'problem_flags'
     ) then
    raise exception 'not the 20261024100000 state; abort';
  end if;
  if exists (select 1 from public.unit_occupancy_status where cardinality(problem_flags) > 0 or problem_lock_released or problem_note is not null) then
    raise exception 'problem household values exist; abort (operational records, separate approval required)';
  end if;
  if exists (select 1 from public.contract_status_history where field_changed in ('problem_flags', 'problem_lock_released')) then
    raise exception 'problem household history exists; abort (operational records, separate approval required)';
  end if;
  perform set_config('lock_timeout', '5s', true);
end
$preflight$;

drop function public.set_move_in_problem_household(uuid,uuid,uuid,uuid,text[],boolean,text,text);
drop trigger reset_problem_household_on_contract_change on public.unit_occupancy_status;
drop function private.reset_problem_household_on_contract_change();
drop trigger enforce_problem_household_lock on public.unit_occupancy_status;
drop function private.enforce_problem_household_lock();

alter table public.contract_status_history drop constraint contract_status_history_field_changed_check;
alter table public.contract_status_history add constraint contract_status_history_field_changed_check
  check (((field_changed)::text = any (array[('occupancy_intent'::character varying)::text, ('funding_status'::character varying)::text, ('move_in_status'::character varying)::text, ('operational_intent'::character varying)::text, ('legacy_grade'::character varying)::text, ('trade_funding_type'::character varying)::text, ('trade_funding_status'::character varying)::text])));

alter table public.unit_occupancy_status
  drop constraint unit_occupancy_status_problem_updated_by_fkey,
  drop constraint unit_occupancy_status_problem_note_check,
  drop constraint unit_occupancy_status_problem_released_check,
  drop constraint unit_occupancy_status_problem_flags_check,
  drop column problem_updated_at,
  drop column problem_updated_by,
  drop column problem_note,
  drop column problem_lock_released,
  drop column problem_flags;

commit;
