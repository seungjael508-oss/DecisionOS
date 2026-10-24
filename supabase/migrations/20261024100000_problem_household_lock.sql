-- 문제세대 적색 표기·입주 잠금 (A14, Production 미적용, 별도 승인 필요)
-- 선행: 20261020110000_trade_funding_type(A11, 이력 값 'trade_funding_type·status' 허용) 적용 후.
-- 1) unit_occupancy_status에 문제세대 칸 추가(모두 기본값/NULL, 기존 행 값 변경 없음, 새 테이블 없음)
--    problem_flags: SEIZURE(가압류) / LITIGATION(소송) / D_GRADE(D등급) / ASEL(아셀) / TERMINATED(계약해지) 중복 없는 목록
--    problem_lock_released: 관리자 최종 해제 승인(true면 표기는 유지하되 입주완료 처리 허용)
--    problem_note: 관리 메모(200자), problem_updated_by / problem_updated_at: 최종 수정자·시각
-- 2) 잠금: 문제세대이면서 해제 승인 전이면 입주완료(MOVED_IN) 전환·실제 입주일 신규 기록을 막는다(트리거, errcode SJ423).
--    상담 저장·입주 상태 수정 등 모든 저장 경로에 같이 적용된다. 이미 입주완료인 세대는 바꾸지 않는다.
-- 3) 계약자 변경(contract_id 변경) 시 문제세대 칸을 비운다(이전 계약 기준 이력에 남음).
-- 4) contract_status_history.field_changed에 'problem_flags'·'problem_lock_released' 추가(기존 7개 값 유지, 기존 이력 미수정)
-- 5) public.set_move_in_problem_household: PROJECT_ADMIN만, 현재 ACTIVE 계약 확인 후 저장, 바뀐 값만 이력 기록
--    등급·입주진행·납부·상담 기록은 바꾸지 않는다. 테이블 쓰기 권한(RLS)은 바꾸지 않는다(authenticated는 기존처럼 SELECT만).
begin;

do $preflight$
declare
  v_def text;
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'unit_occupancy_status'
      and column_name in ('problem_flags', 'problem_lock_released', 'problem_note', 'problem_updated_by', 'problem_updated_at')
  ) then
    raise exception 'problem household columns already exist; abort';
  end if;
  if exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname = 'set_move_in_problem_household')
     or to_regprocedure('private.enforce_problem_household_lock()') is not null
     or to_regprocedure('private.reset_problem_household_on_contract_change()') is not null then
    raise exception 'problem household functions already exist; abort';
  end if;
  if to_regprocedure('private.write_rpc_actor(uuid)') is null
     or to_regprocedure('private.require_project_admin(uuid,uuid)') is null then
    raise exception 'required functions missing; abort';
  end if;
  -- 이력 값 CHECK가 A11 정의(A2 5개 + trade_funding 2개)일 때만 다시 만든다(다른 형태면 중단)
  select pg_get_constraintdef(oid) into v_def
  from pg_constraint
  where conrelid = 'public.contract_status_history'::regclass and conname = 'contract_status_history_field_changed_check';
  if v_def is null
     or position('trade_funding_status' in v_def) = 0
     or position('problem_' in v_def) > 0
     or (select count(*) from regexp_matches(v_def, '::character varying', 'g')) <> 7 then
    raise exception 'contract_status_history_field_changed_check is not the A11 definition; abort';
  end if;
  perform set_config('lock_timeout', '5s', true);
end
$preflight$;

alter table public.unit_occupancy_status
  add column problem_flags text[] not null default '{}'::text[],
  add column problem_lock_released boolean not null default false,
  add column problem_note text,
  add column problem_updated_by uuid,
  add column problem_updated_at timestamp with time zone,
  add constraint unit_occupancy_status_problem_flags_check
    check (problem_flags <@ array['SEIZURE', 'LITIGATION', 'D_GRADE', 'ASEL', 'TERMINATED']::text[]),
  add constraint unit_occupancy_status_problem_released_check
    check (not problem_lock_released or cardinality(problem_flags) > 0),
  add constraint unit_occupancy_status_problem_note_check
    check (problem_note is null or char_length(problem_note) <= 200),
  add constraint unit_occupancy_status_problem_updated_by_fkey
    foreign key (problem_updated_by, project_id) references public.project_member(id, project_id) on delete restrict;

-- 입주완료 잠금. 모든 저장 경로(상담 저장 RPC·입주 상태 수정 RPC·관리자 수정)가 같은 행을 바꾸므로 트리거 한 곳에서 막는다.
CREATE OR REPLACE FUNCTION private.enforce_problem_household_lock()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if cardinality(new.problem_flags) > 0 and not new.problem_lock_released
     and ((new.move_in_status = 'MOVED_IN'::public.move_in_status
           and old.move_in_status is distinct from 'MOVED_IN'::public.move_in_status)
       or (new.actual_move_in_date is not null and old.actual_move_in_date is null)) then
    raise exception 'problem household locked' using errcode = 'SJ423',
      detail = array_to_string(new.problem_flags, ','),
      hint = '관리자 최종 해제 승인 후에만 입주완료 처리할 수 있습니다.';
  end if;
  return new;
end;
$function$;
revoke all on function private.enforce_problem_household_lock() from public, anon, authenticated, service_role;

create trigger enforce_problem_household_lock
  before update of move_in_status, actual_move_in_date on public.unit_occupancy_status
  for each row execute function private.enforce_problem_household_lock();

-- 계약자 변경 시 이전 계약자의 문제세대 표기가 새 계약자에게 이어지지 않도록 비운다
CREATE OR REPLACE FUNCTION private.reset_problem_household_on_contract_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.contract_id is distinct from old.contract_id then
    new.problem_flags := '{}'::text[];
    new.problem_lock_released := false;
    new.problem_note := null;
    new.problem_updated_by := null;
    new.problem_updated_at := null;
  end if;
  return new;
end;
$function$;
revoke all on function private.reset_problem_household_on_contract_change() from public, anon, authenticated, service_role;

create trigger reset_problem_household_on_contract_change
  before update of contract_id on public.unit_occupancy_status
  for each row execute function private.reset_problem_household_on_contract_change();

alter table public.contract_status_history drop constraint contract_status_history_field_changed_check;
alter table public.contract_status_history add constraint contract_status_history_field_changed_check
  check (((field_changed)::text = any (array[('occupancy_intent'::character varying)::text, ('funding_status'::character varying)::text, ('move_in_status'::character varying)::text, ('operational_intent'::character varying)::text, ('legacy_grade'::character varying)::text, ('trade_funding_type'::character varying)::text, ('trade_funding_status'::character varying)::text, ('problem_flags'::character varying)::text, ('problem_lock_released'::character varying)::text])));

-- 관리자 저장. p_flags 빈 배열 = 문제세대 해제(해제 승인·메모도 비움). 해제 승인은 문제세대일 때만 true 가능.
-- 값이 같으면 아무것도 바꾸지 않는다(이력 없음, 중복 저장 방지). 메모만 바뀌면 이력 없이 메모만 저장한다.
CREATE OR REPLACE FUNCTION public.set_move_in_problem_household(p_project_id uuid, p_unit_id uuid, p_customer_id uuid, p_expected_contract_id uuid, p_flags text[], p_lock_released boolean, p_note text, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_member_id uuid;
  v_flags text[];
  v_released boolean;
  v_note text;
  v_reason text;
  v_contract public.contract%rowtype;
  v_flags_before text[];
  v_released_before boolean;
  v_note_before text;
  v_now timestamptz := now();
begin
  v_member_id := private.write_rpc_actor(p_project_id);
  -- 문제세대 지정·해제·잠금 해제 승인은 관리자(PROJECT_ADMIN)만
  perform private.require_project_admin(p_project_id, v_member_id);

  if exists (select 1 from unnest(coalesce(p_flags, '{}'::text[])) f
             where f is null or f not in ('SEIZURE', 'LITIGATION', 'D_GRADE', 'ASEL', 'TERMINATED')) then
    raise exception 'invalid problem household flag' using errcode = '23514';
  end if;
  -- 고정 순서·중복 제거(같은 내용이면 같은 배열)
  select coalesce(array_agg(f order by array_position(array['SEIZURE', 'LITIGATION', 'D_GRADE', 'ASEL', 'TERMINATED']::text[], f)), '{}'::text[])
    into v_flags
  from (select distinct unnest(coalesce(p_flags, '{}'::text[])) as f) d;
  v_released := cardinality(v_flags) > 0 and coalesce(p_lock_released, false);
  v_note := case when cardinality(v_flags) > 0 then nullif(btrim(coalesce(p_note, '')), '') end;
  if v_note is not null and char_length(v_note) > 200 then
    raise exception 'note too long' using errcode = '23514';
  end if;
  v_reason := nullif(btrim(coalesce(p_reason, '')), '');
  if v_reason is null or char_length(v_reason) > 200 then
    raise exception 'reason required' using errcode = '23514';
  end if;

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
  if p_expected_contract_id is null or v_contract.contract_id <> p_expected_contract_id then
    raise exception 'current contract changed' using errcode = '40001';
  end if;

  select uos.problem_flags, uos.problem_lock_released, uos.problem_note
    into v_flags_before, v_released_before, v_note_before
  from public.unit_occupancy_status uos
  where uos.project_id = p_project_id
    and uos.unit_id = p_unit_id
    and uos.contract_id = v_contract.contract_id
  for update;
  if not found then
    raise exception 'unit occupancy status not found' using errcode = '23514';
  end if;

  if v_flags_before = v_flags and v_released_before = v_released and v_note_before is not distinct from v_note then
    return jsonb_build_object('changed', false, 'flags', to_jsonb(v_flags), 'lock_released', v_released);
  end if;

  update public.unit_occupancy_status
  set problem_flags = v_flags,
      problem_lock_released = v_released,
      problem_note = v_note,
      problem_updated_by = v_member_id,
      problem_updated_at = v_now
  where project_id = p_project_id
    and unit_id = p_unit_id
    and contract_id = v_contract.contract_id;

  if v_flags_before <> v_flags then
    insert into public.contract_status_history (
      project_id, contract_id, unit_id, field_changed,
      previous_value, new_value, reason, contact_id, changed_by, changed_at
    ) values (
      p_project_id, v_contract.contract_id, p_unit_id, 'problem_flags',
      nullif(array_to_string(v_flags_before, ','), ''), nullif(array_to_string(v_flags, ','), ''), v_reason, null, v_member_id, v_now
    );
  end if;
  if v_released_before <> v_released then
    insert into public.contract_status_history (
      project_id, contract_id, unit_id, field_changed,
      previous_value, new_value, reason, contact_id, changed_by, changed_at
    ) values (
      p_project_id, v_contract.contract_id, p_unit_id, 'problem_lock_released',
      v_released_before::text, v_released::text, v_reason, null, v_member_id, v_now
    );
  end if;

  return jsonb_build_object('changed', true, 'flags', to_jsonb(v_flags), 'lock_released', v_released);
end;
$function$;

revoke all on function public.set_move_in_problem_household(uuid,uuid,uuid,uuid,text[],boolean,text,text) from public, anon, authenticated, service_role;
grant execute on function public.set_move_in_problem_household(uuid,uuid,uuid,uuid,text[],boolean,text,text) to authenticated;

commit;
