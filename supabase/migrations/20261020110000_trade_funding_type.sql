-- C·D등급 매매/임대 자금조달 분류 (Production 미적용, 별도 승인 필요)
-- 선행: 20261017100000_absence_streak_visit_target(A2, 이력 값 'legacy_grade' 허용) 적용 후. 배포 순서는 A10 → A11(같은 객체를 바꾸지 않음).
-- 기존 funding_status(입주 자금·대출 진행 단계: 대출필요·대출상담·대출승인 등)와 의미가 달라 같은 칸에 저장하지 않는다.
-- 전매·전세·월세 거래 유형은 기존 unit_deal(sale/jeonse/monthly_rent_enabled, 복수 선택)에서 그대로 관리한다(이 파일은 바꾸지 않음).
-- 1) unit_occupancy_status에 최소 4개 칸만 추가(모두 NULL 허용, 기존 행 값 변경 없음, 새 테이블 없음)
--    trade_funding_type: OWN_FUNDS_AFTER_BALANCE(자기자금 잔금 납부 후 거래) / BALANCE_SHORTAGE(잔금 부족으로 거래 추진)
--                        / LOAN_REQUIRED(대출 후 잔금 납부·거래) / UNCONFIRMED(미확인)
--    trade_funding_status: CANDIDATE(상담 확인 전 후보) / CONFIRMED(상담 확인). 유형이 없으면 상태도 없다
--    trade_funding_updated_by / trade_funding_updated_at: 분류 최종 수정자·시각(점유 상태의 updated_by와 별개)
-- 2) 계약자 변경 혼입 방지: 같은 점유 행의 contract_id가 바뀌면(transfer_contract_holder) 분류 4칸을 비운다.
--    이전 계약자의 분류는 이전 계약 기준 이력에 남는다.
-- 3) contract_status_history.field_changed에 'trade_funding_type'·'trade_funding_status' 추가(기존 5개 값 유지, 기존 이력 미수정)
-- 4) public.set_move_in_trade_funding: 현재 ACTIVE 계약·프로젝트 직원 권한·고객 쓰기 권한 확인 후 저장, 바뀐 값만 이력 기록
--    등급·납부·계약자·상담 기록은 바꾸지 않는다. 테이블 쓰기 권한(RLS)은 바꾸지 않는다(authenticated는 기존처럼 SELECT만).
begin;

do $preflight$
declare
  v_def text;
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'unit_occupancy_status'
      and column_name in ('trade_funding_type', 'trade_funding_status', 'trade_funding_updated_by', 'trade_funding_updated_at')
  ) then
    raise exception 'trade funding columns already exist; abort';
  end if;
  if exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname = 'set_move_in_trade_funding')
     or to_regprocedure('private.reset_trade_funding_on_contract_change()') is not null then
    raise exception 'trade funding functions already exist; abort';
  end if;
  if to_regprocedure('private.write_rpc_actor(uuid)') is null
     or to_regprocedure('private.require_field_customer_write_access(uuid,uuid,uuid)') is null then
    raise exception 'required functions missing; abort';
  end if;
  -- 이력 값 CHECK가 A2 정의(기존 4개 + legacy_grade)일 때만 다시 만든다(다른 형태면 중단)
  select pg_get_constraintdef(oid) into v_def
  from pg_constraint
  where conrelid = 'public.contract_status_history'::regclass and conname = 'contract_status_history_field_changed_check';
  if v_def is null
     or position('legacy_grade' in v_def) = 0
     or position('trade_funding' in v_def) > 0
     or (select count(*) from regexp_matches(v_def, '::character varying', 'g')) <> 5 then
    raise exception 'contract_status_history_field_changed_check is not the A2 definition; abort';
  end if;
  perform set_config('lock_timeout', '5s', true);
end
$preflight$;

alter table public.unit_occupancy_status
  add column trade_funding_type text,
  add column trade_funding_status text,
  add column trade_funding_updated_by uuid,
  add column trade_funding_updated_at timestamp with time zone,
  add constraint unit_occupancy_status_trade_funding_type_check
    check (trade_funding_type is null or trade_funding_type in ('OWN_FUNDS_AFTER_BALANCE', 'BALANCE_SHORTAGE', 'LOAN_REQUIRED', 'UNCONFIRMED')),
  add constraint unit_occupancy_status_trade_funding_status_check
    check ((trade_funding_type is null and trade_funding_status is null)
        or (trade_funding_type is not null and trade_funding_status in ('CANDIDATE', 'CONFIRMED'))),
  add constraint unit_occupancy_status_trade_funding_updated_by_fkey
    foreign key (trade_funding_updated_by, project_id) references public.project_member(id, project_id) on delete restrict;

-- 계약자 변경 시 이전 계약자의 분류가 새 계약자에게 이어지지 않도록 비운다(다른 칸·트리거 동작은 그대로)
CREATE OR REPLACE FUNCTION private.reset_trade_funding_on_contract_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.contract_id is distinct from old.contract_id then
    new.trade_funding_type := null;
    new.trade_funding_status := null;
    new.trade_funding_updated_by := null;
    new.trade_funding_updated_at := null;
  end if;
  return new;
end;
$function$;
revoke all on function private.reset_trade_funding_on_contract_change() from public, anon, authenticated, service_role;

create trigger reset_trade_funding_on_contract_change
  before update of contract_id on public.unit_occupancy_status
  for each row execute function private.reset_trade_funding_on_contract_change();

alter table public.contract_status_history drop constraint contract_status_history_field_changed_check;
alter table public.contract_status_history add constraint contract_status_history_field_changed_check
  check (((field_changed)::text = any (array[('occupancy_intent'::character varying)::text, ('funding_status'::character varying)::text, ('move_in_status'::character varying)::text, ('operational_intent'::character varying)::text, ('legacy_grade'::character varying)::text, ('trade_funding_type'::character varying)::text, ('trade_funding_status'::character varying)::text])));

-- 세대 상세 저장. p_trade_funding_type NULL = 분류 해제(상태도 해제). 유형이 있으면 상태 필수(NULL이면 CONFIRMED).
-- 값이 같으면 아무것도 바꾸지 않는다(이력 없음, 중복 저장 방지).
CREATE OR REPLACE FUNCTION public.set_move_in_trade_funding(p_project_id uuid, p_unit_id uuid, p_customer_id uuid, p_expected_contract_id uuid, p_trade_funding_type text, p_trade_funding_status text DEFAULT NULL::text, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_member_id uuid;
  v_type text;
  v_status text;
  v_contract public.contract%rowtype;
  v_type_before text;
  v_status_before text;
  v_now timestamptz := now();
  v_reason text;
begin
  -- 프로젝트의 활성 직원(관리자·상담사·시행사 관리자)만. 비멤버·비활성·익명·타 프로젝트는 여기서 차단
  v_member_id := private.write_rpc_actor(p_project_id);
  -- 상담 저장과 같은 고객 쓰기 권한(현장 공유 프로젝트 외에는 배정 상담사만)
  perform private.require_field_customer_write_access(p_project_id, p_customer_id, v_member_id);

  v_type := nullif(btrim(coalesce(p_trade_funding_type, '')), '');
  v_status := nullif(btrim(coalesce(p_trade_funding_status, '')), '');
  if v_type is not null and v_type not in ('OWN_FUNDS_AFTER_BALANCE', 'BALANCE_SHORTAGE', 'LOAN_REQUIRED', 'UNCONFIRMED') then
    raise exception 'invalid trade funding type' using errcode = '23514';
  end if;
  if v_type is null then
    if v_status is not null then
      raise exception 'status requires a trade funding type' using errcode = '23514';
    end if;
  else
    v_status := coalesce(v_status, 'CONFIRMED');
    if v_status not in ('CANDIDATE', 'CONFIRMED') then
      raise exception 'invalid trade funding status' using errcode = '23514';
    end if;
  end if;
  v_reason := coalesce(nullif(btrim(coalesce(p_reason, '')), ''), '자금조달 분류 수정');

  -- 세대·계약자·현재 ACTIVE 계약이 모두 맞아야 한다(다른 세대·이전 계약자 ID로 저장 불가)
  select * into v_contract
  from public.contract c
  where c.project_id = p_project_id
    and c.unit_id = p_unit_id
    and c.customer_id = p_customer_id
    and c.contract_status = 'ACTIVE'::public.contract_status
  for update;
  if not found then
    raise exception 'active contract not found' using errcode = '23514';
  end if;
  -- 화면이 본 계약과 다르면(그 사이 계약자 변경) 저장하지 않는다
  if p_expected_contract_id is null or v_contract.contract_id <> p_expected_contract_id then
    raise exception 'current contract changed' using errcode = '40001';
  end if;

  select uos.trade_funding_type, uos.trade_funding_status into v_type_before, v_status_before
  from public.unit_occupancy_status uos
  where uos.project_id = p_project_id
    and uos.unit_id = p_unit_id
    and uos.contract_id = v_contract.contract_id
  for update;
  if not found then
    raise exception 'unit occupancy status not found' using errcode = '23514';
  end if;

  if v_type_before is not distinct from v_type and v_status_before is not distinct from v_status then
    return jsonb_build_object('changed', false, 'trade_funding_type', v_type, 'trade_funding_status', v_status);
  end if;

  update public.unit_occupancy_status
  set trade_funding_type = v_type,
      trade_funding_status = v_status,
      trade_funding_updated_by = v_member_id,
      trade_funding_updated_at = v_now
  where project_id = p_project_id
    and unit_id = p_unit_id
    and contract_id = v_contract.contract_id;

  if v_type_before is distinct from v_type then
    insert into public.contract_status_history (
      project_id, contract_id, unit_id, field_changed,
      previous_value, new_value, reason, contact_id, changed_by, changed_at
    ) values (
      p_project_id, v_contract.contract_id, p_unit_id, 'trade_funding_type',
      v_type_before, v_type, v_reason, null, v_member_id, v_now
    );
  end if;
  if v_status_before is distinct from v_status then
    insert into public.contract_status_history (
      project_id, contract_id, unit_id, field_changed,
      previous_value, new_value, reason, contact_id, changed_by, changed_at
    ) values (
      p_project_id, v_contract.contract_id, p_unit_id, 'trade_funding_status',
      v_status_before, v_status, v_reason, null, v_member_id, v_now
    );
  end if;

  return jsonb_build_object('changed', true, 'trade_funding_type', v_type, 'trade_funding_status', v_status);
end;
$function$;

revoke all on function public.set_move_in_trade_funding(uuid,uuid,uuid,uuid,text,text,text) from public, anon, authenticated, service_role;
grant execute on function public.set_move_in_trade_funding(uuid,uuid,uuid,uuid,text,text,text) to authenticated;

commit;
