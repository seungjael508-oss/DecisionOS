-- 20261020110000_trade_funding_type 롤백: 자금조달 분류 RPC·트리거·칸·이력 값 허용을 제거한다. 코드를 먼저 되돌린 뒤에만 실행.
-- 저장된 분류 값과 그 변경 이력은 운영 기록이다. 하나라도 있으면 아무것도 바꾸지 않고 중단한다
-- (값을 지우는 롤백은 별도 승인으로 정한다. 그 전에는 신규 코드만 되돌려 화면에서 숨긴다).
begin;

do $preflight$
begin
  if to_regprocedure('public.set_move_in_trade_funding(uuid,uuid,uuid,uuid,text,text,text)') is null
     or to_regprocedure('private.reset_trade_funding_on_contract_change()') is null
     or not exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'unit_occupancy_status' and column_name = 'trade_funding_type'
     ) then
    raise exception 'not the 20261020110000 state; abort';
  end if;
  if exists (select 1 from public.unit_occupancy_status where trade_funding_type is not null or trade_funding_status is not null) then
    raise exception 'trade funding values exist; abort (operational records, separate approval required)';
  end if;
  if exists (select 1 from public.contract_status_history where field_changed in ('trade_funding_type', 'trade_funding_status')) then
    raise exception 'trade funding history exists; abort (operational records, separate approval required)';
  end if;
  perform set_config('lock_timeout', '5s', true);
end
$preflight$;

drop function public.set_move_in_trade_funding(uuid,uuid,uuid,uuid,text,text,text);
drop trigger reset_trade_funding_on_contract_change on public.unit_occupancy_status;
drop function private.reset_trade_funding_on_contract_change();

alter table public.contract_status_history drop constraint contract_status_history_field_changed_check;
alter table public.contract_status_history add constraint contract_status_history_field_changed_check
  check (((field_changed)::text = any (array[('occupancy_intent'::character varying)::text, ('funding_status'::character varying)::text, ('move_in_status'::character varying)::text, ('operational_intent'::character varying)::text, ('legacy_grade'::character varying)::text])));

alter table public.unit_occupancy_status
  drop constraint unit_occupancy_status_trade_funding_updated_by_fkey,
  drop constraint unit_occupancy_status_trade_funding_status_check,
  drop constraint unit_occupancy_status_trade_funding_type_check,
  drop column trade_funding_updated_at,
  drop column trade_funding_updated_by,
  drop column trade_funding_status,
  drop column trade_funding_type;

commit;
