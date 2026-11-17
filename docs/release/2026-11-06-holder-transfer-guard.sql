-- LOCAL CANDIDATE ONLY. Do not apply to production without review.
-- No new table/column/RPC/signature. Existing audit CHECK gains one event type.
-- Reason: app.holder_transfer_reason or x-stayj-transfer-reason = SALE/GIFT/INHERITANCE.
-- Mixed management attribution remains fail-closed pending explicit policy.
BEGIN;
ALTER TABLE public.contract_status_history DROP CONSTRAINT contract_status_history_field_changed_check;
ALTER TABLE public.contract_status_history ADD CONSTRAINT contract_status_history_field_changed_check CHECK(field_changed = ANY(ARRAY['occupancy_intent','funding_status','move_in_status','operational_intent','legacy_grade','trade_funding_type','trade_funding_status','problem_flags','problem_lock_released','balance_paid_at','holder_transfer']::text[]));

CREATE OR REPLACE FUNCTION private.reset_problem_household_on_contract_change()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $guard$
BEGIN
 IF NEW.contract_id IS DISTINCT FROM OLD.contract_id THEN
  IF cardinality(OLD.problem_flags)>0 OR OLD.problem_note IS NOT NULL OR OLD.problem_lock_released
   OR ROW(NEW.problem_flags,NEW.problem_note,NEW.problem_lock_released,NEW.problem_updated_by,NEW.problem_updated_at)
    IS DISTINCT FROM ROW(OLD.problem_flags,OLD.problem_note,OLD.problem_lock_released,OLD.problem_updated_by,OLD.problem_updated_at)
  THEN RAISE EXCEPTION 'problem information attribution requires reviewed policy' USING ERRCODE='SJ422'; END IF;
 END IF;
 RETURN NEW;
END;$guard$;
CREATE OR REPLACE FUNCTION private.reset_trade_funding_on_contract_change()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $guard$
BEGIN
 IF NEW.contract_id IS DISTINCT FROM OLD.contract_id THEN
  IF OLD.trade_funding_type IS NOT NULL OR OLD.trade_funding_status IS NOT NULL
   OR ROW(NEW.trade_funding_type,NEW.trade_funding_status,NEW.trade_funding_updated_by,NEW.trade_funding_updated_at)
    IS DISTINCT FROM ROW(OLD.trade_funding_type,OLD.trade_funding_status,OLD.trade_funding_updated_by,OLD.trade_funding_updated_at)
  THEN RAISE EXCEPTION 'funding information attribution requires reviewed policy' USING ERRCODE='SJ422'; END IF;
 END IF;
 RETURN NEW;
END;$guard$;
CREATE OR REPLACE FUNCTION public.transfer_contract_holder(p_project_id uuid, p_contract_id uuid, p_new_customer_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_member_id uuid;
  v_old public.contract%rowtype;
  v_occ public.unit_occupancy_status%rowtype;
  v_new_id uuid;
  v_reason text;
  v_old_name text;
  v_new_name text;
begin
  v_member_id := private.write_rpc_actor(p_project_id);
  -- Same RPC signature: explicit reason is carried by the existing request/transaction context.
  v_reason := coalesce(nullif(current_setting('app.holder_transfer_reason',true),''), nullif(current_setting('request.headers',true),'')::jsonb ->> 'x-stayj-transfer-reason');
  if v_reason is null or v_reason not in ('SALE','GIFT','INHERITANCE') then
    raise exception 'explicit holder transfer reason required' using errcode='23514';
  end if;
  perform private.require_project_admin(p_project_id, v_member_id);
  perform private.require_customer_write_access(
    p_project_id, p_new_customer_id, v_member_id
  );

  select *
    into v_old
  from public.contract as ct
  where ct.contract_id = p_contract_id
  for update;

  if not found then
    raise exception 'contract not found' using errcode = '23503';
  end if;

  if v_old.project_id is distinct from p_project_id then
    raise exception 'contract is not in project' using errcode = '23514';
  end if;

  if v_old.contract_status is distinct from 'ACTIVE'::public.contract_status then
    raise exception 'contract is not active' using errcode = '23514';
  end if;

  if v_old.customer_id is not distinct from p_new_customer_id then
    raise exception 'new customer must differ' using errcode = '23514';
  end if;

  select *
    into v_occ
  from public.unit_occupancy_status as uos
  where uos.contract_id = v_old.contract_id
    and uos.project_id = v_old.project_id
    and uos.unit_id = v_old.unit_id
  for update;

  if not found then
    raise exception 'occupancy not found' using errcode = '23503';
  end if;

  -- Do not erase or automatically inherit mixed personal/household management facts.
  if cardinality(v_occ.problem_flags)>0 or v_occ.problem_note is not null or v_occ.problem_lock_released
     or v_occ.trade_funding_type is not null or v_occ.trade_funding_status is not null
     or v_occ.funding_status::text not in ('NORMAL','UNKNOWN')
     or v_occ.occupancy_intent::text <> 'UNDECIDED'
     or v_occ.operational_intent::text <> 'UNDECIDED'
     or v_occ.legacy_grade is not null
     or v_occ.last_contact_at is not null or v_occ.next_contact_at is not null then
    raise exception 'management attribution requires reviewed policy' using errcode='SJ422';
  end if;
  select name into v_old_name from public.customer where id=v_old.customer_id and project_id=p_project_id;
  select name into v_new_name from public.customer where id=p_new_customer_id and project_id=p_project_id;
  if v_old_name is null or v_new_name is null then raise exception 'holder identity unavailable' using errcode='23503'; end if;

  update public.contract
  set
    contract_status = 'CANCELLED'::public.contract_status,
    cancellation_reason = 'HOLDER_CHANGED'
  where contract_id = v_old.contract_id
    and project_id = v_old.project_id;

  insert into public.contract (
    project_id,
    customer_id,
    unit_id,
    subscription_id,
    contract_status,
    winner_confirmed,
    winner_list_received_at,
    contract_scheduled_date,
    visit_date_confirmed,
    document_status,
    previous_contract_id
  ) values (
    v_old.project_id,
    p_new_customer_id,
    v_old.unit_id,
    null,
    'ACTIVE'::public.contract_status,
    v_old.winner_confirmed,
    v_old.winner_list_received_at,
    v_old.contract_scheduled_date,
    v_old.visit_date_confirmed,
    v_old.document_status,
    v_old.contract_id
  )
  returning contract_id into v_new_id;

  update public.unit_occupancy_status
  set
    contract_id = v_new_id,
    updated_by = v_member_id
  where occupancy_status_id = v_occ.occupancy_status_id
    and project_id = v_old.project_id
    and unit_id = v_old.unit_id;

  insert into public.contract_status_history(project_id,contract_id,unit_id,field_changed,previous_value,new_value,reason,changed_by,changed_at)
  values(p_project_id,v_new_id,v_old.unit_id,'holder_transfer',
    jsonb_build_object('contract_id',v_old.contract_id,'customer_id',v_old.customer_id,'holder',v_old_name)::text,
    jsonb_build_object('contract_id',v_new_id,'previous_contract_id',v_old.contract_id,'customer_id',p_new_customer_id,'holder',v_new_name)::text,
    v_reason,v_member_id,clock_timestamp());
  return v_new_id;
end;
$function$
;
COMMIT;
