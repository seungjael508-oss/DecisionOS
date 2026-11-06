-- Proposed minimal replacement of two existing RPCs. No new RPC/table/signature.
-- Apply only after full source build and SQL verification pass. Does not mutate household rows by itself.
begin;
CREATE OR REPLACE FUNCTION public.update_unit_occupancy_status(p_project_id uuid, p_unit_id uuid, p_contract_id uuid, p_occupancy_intent occupancy_intent DEFAULT NULL::occupancy_intent, p_funding_status funding_status DEFAULT NULL::funding_status, p_move_in_status move_in_status DEFAULT NULL::move_in_status, p_planned_move_in_date date DEFAULT NULL::date, p_balance_paid_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_actual_move_in_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_last_contact_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_next_contact_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_clear_planned_move_in_date boolean DEFAULT false, p_clear_balance_paid_at boolean DEFAULT false, p_clear_actual_move_in_date boolean DEFAULT false, p_clear_last_contact_at boolean DEFAULT false, p_clear_next_contact_at boolean DEFAULT false, p_contact_id uuid DEFAULT NULL::uuid, p_reason text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_member_id uuid;
  v_contract public.contract%rowtype;
  v_occ public.unit_occupancy_status%rowtype;
  v_intent public.occupancy_intent;
  v_funding public.funding_status;
  v_move public.move_in_status;
  v_planned date;
  v_balance timestamptz;
  v_actual timestamptz;
  v_last timestamptz;
  v_next timestamptz;
  v_id uuid;
begin
  v_member_id := private.write_rpc_actor(p_project_id);

  if (
    coalesce(p_clear_planned_move_in_date, false)
    and p_planned_move_in_date is not null
  ) or (
    coalesce(p_clear_balance_paid_at, false)
    and p_balance_paid_at is not null
  ) or (
    coalesce(p_clear_actual_move_in_date, false)
    and p_actual_move_in_date is not null
  ) or (
    coalesce(p_clear_last_contact_at, false)
    and p_last_contact_at is not null
  ) or (
    coalesce(p_clear_next_contact_at, false)
    and p_next_contact_at is not null
  ) then
    raise exception 'clear flag cannot be combined with a value'
      using errcode = '23514';
  end if;

  select *
    into v_contract
  from public.contract as ct
  where ct.contract_id = p_contract_id
  for update;

  if not found then
    raise exception 'contract not found' using errcode = '23503';
  end if;

  if v_contract.project_id is distinct from p_project_id then
    raise exception 'contract is not in project' using errcode = '23514';
  end if;

  if v_contract.unit_id is distinct from p_unit_id then
    raise exception 'contract unit mismatch' using errcode = '23514';
  end if;

  if v_contract.contract_status is distinct from 'ACTIVE'::public.contract_status then
    raise exception 'contract is not active' using errcode = '23514';
  end if;

  perform private.require_field_customer_write_access(
    p_project_id, v_contract.customer_id, v_member_id
  );

  if p_contact_id is not null then
    if not exists (
      select 1
      from public.consultation as c
      where c.id = p_contact_id
        and c.project_id = p_project_id
        and c.customer_id = v_contract.customer_id
    ) then
      raise exception 'contact does not match contract customer'
        using errcode = '23514';
    end if;
  end if;

  select *
    into v_occ
  from public.unit_occupancy_status as uos
  where uos.project_id = p_project_id
    and uos.contract_id = p_contract_id
  for update;

  if not found then
    raise exception 'occupancy not found' using errcode = '23503';
  end if;

  if v_occ.unit_id is distinct from p_unit_id then
    raise exception 'occupancy unit mismatch' using errcode = '23514';
  end if;

  v_intent := coalesce(p_occupancy_intent, v_occ.occupancy_intent);
  v_funding := coalesce(p_funding_status, v_occ.funding_status);
  v_move := coalesce(p_move_in_status, v_occ.move_in_status);

  if coalesce(p_clear_planned_move_in_date, false) then
    v_planned := null;
  elsif p_planned_move_in_date is not null then
    v_planned := p_planned_move_in_date;
  else
    v_planned := v_occ.planned_move_in_date;
  end if;

  if coalesce(p_clear_balance_paid_at, false) then
    v_balance := null;
  elsif p_balance_paid_at is not null then
    v_balance := p_balance_paid_at;
  else
    v_balance := v_occ.balance_paid_at;
  end if;

  if coalesce(p_clear_actual_move_in_date, false) then
    v_actual := null;
  elsif p_actual_move_in_date is not null then
    v_actual := p_actual_move_in_date;
  else
    v_actual := v_occ.actual_move_in_date;
  end if;

  if coalesce(p_clear_last_contact_at, false) then
    v_last := null;
  elsif p_last_contact_at is not null then
    v_last := p_last_contact_at;
  else
    v_last := v_occ.last_contact_at;
  end if;

  if coalesce(p_clear_next_contact_at, false) then
    v_next := null;
  elsif p_next_contact_at is not null then
    v_next := p_next_contact_at;
  else
    v_next := v_occ.next_contact_at;
  end if;

  -- BALANCE_GUARD_V1: only the dedicated RPC may mutate settlement markers.
  if v_balance is distinct from v_occ.balance_paid_at
     or (v_move is distinct from v_occ.move_in_status and (
       v_move = 'BALANCE_PAID'::public.move_in_status
       or (v_occ.move_in_status = 'BALANCE_PAID'::public.move_in_status
           and (v_move <> 'MOVED_IN'::public.move_in_status or v_balance is null))
     )) then
    raise exception 'use set_move_in_balance_paid for settlement changes'
      using errcode = 'SJ409', hint = '관리자 완납 전용 저장과 조회 당시 기대값이 필요합니다.';
  end if;

  update public.unit_occupancy_status as uos
  set
    occupancy_intent = v_intent,
    funding_status = v_funding,
    move_in_status = v_move,
    planned_move_in_date = v_planned,
    balance_paid_at = v_balance,
    actual_move_in_date = v_actual,
    last_contact_at = v_last,
    next_contact_at = v_next,
    updated_by = v_member_id
  where uos.occupancy_status_id = v_occ.occupancy_status_id
  returning occupancy_status_id into v_id;

  if v_balance is distinct from v_occ.balance_paid_at then
    insert into public.contract_status_history (
      project_id, contract_id, unit_id, field_changed,
      previous_value, new_value, reason, contact_id, changed_by, changed_at
    ) values (
      p_project_id, p_contract_id, p_unit_id, 'balance_paid_at',
      v_occ.balance_paid_at::text, v_balance::text, p_reason, p_contact_id,
      v_member_id, clock_timestamp()
    );
  end if;

  if v_intent is distinct from v_occ.occupancy_intent then
    insert into public.contract_status_history (
      project_id, contract_id, unit_id, field_changed,
      previous_value, new_value, reason, contact_id, changed_by
    ) values (
      p_project_id, p_contract_id, p_unit_id, 'occupancy_intent',
      v_occ.occupancy_intent::text, v_intent::text, p_reason, p_contact_id,
      v_member_id
    );
  end if;

  if v_funding is distinct from v_occ.funding_status then
    insert into public.contract_status_history (
      project_id, contract_id, unit_id, field_changed,
      previous_value, new_value, reason, contact_id, changed_by
    ) values (
      p_project_id, p_contract_id, p_unit_id, 'funding_status',
      v_occ.funding_status::text, v_funding::text, p_reason, p_contact_id,
      v_member_id
    );
  end if;

  if v_move is distinct from v_occ.move_in_status then
    insert into public.contract_status_history (
      project_id, contract_id, unit_id, field_changed,
      previous_value, new_value, reason, contact_id, changed_by
    ) values (
      p_project_id, p_contract_id, p_unit_id, 'move_in_status',
      v_occ.move_in_status::text, v_move::text, p_reason, p_contact_id,
      v_member_id
    );
  end if;

  return v_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_move_in_balance_paid(p_project_id uuid, p_unit_id uuid, p_contract_id uuid, p_customer_id uuid, p_paid boolean, p_expected_balance_paid_at timestamp with time zone, p_paid_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  actor uuid;
  ct public.contract%rowtype;
  occ public.unit_occupancy_status%rowtype;
  paid_at timestamptz;
  move_status public.move_in_status;
  previous_status text;
BEGIN
  actor := private.write_rpc_actor(p_project_id);
  PERFORM private.require_project_admin(p_project_id,actor);
  IF p_paid IS NULL OR (NOT p_paid AND p_paid_at IS NOT NULL)
     OR length(coalesce(p_reason,'')) > 200 THEN
    RAISE EXCEPTION 'invalid balance input' USING ERRCODE='23514';
  END IF;
  SELECT * INTO ct FROM public.contract WHERE contract_id=p_contract_id FOR UPDATE;
  IF NOT FOUND OR ct.project_id IS DISTINCT FROM p_project_id
     OR ct.unit_id IS DISTINCT FROM p_unit_id OR ct.customer_id IS DISTINCT FROM p_customer_id
     OR ct.contract_status IS DISTINCT FROM 'ACTIVE'::public.contract_status THEN
    RAISE EXCEPTION 'active contract identity mismatch' USING ERRCODE='23503';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.project_unit WHERE project_id=p_project_id AND unit_id=p_unit_id) THEN
    RAISE EXCEPTION 'unit is not in project' USING ERRCODE='23503';
  END IF;
  PERFORM private.require_field_customer_write_access(p_project_id,p_customer_id,actor);
  SELECT * INTO occ FROM public.unit_occupancy_status
    WHERE project_id=p_project_id AND contract_id=p_contract_id AND unit_id=p_unit_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'occupancy not found' USING ERRCODE='23503'; END IF;
  IF occ.balance_paid_at IS DISTINCT FROM p_expected_balance_paid_at THEN
    RAISE EXCEPTION 'balance changed; reload' USING ERRCODE='40001';
  END IF;
  IF p_paid_at IS NOT NULL AND (NOT isfinite(p_paid_at) OR p_paid_at > clock_timestamp()) THEN
    RAISE EXCEPTION 'invalid payment date' USING ERRCODE='23514';
  END IF;
  paid_at := CASE WHEN p_paid THEN coalesce(p_paid_at,occ.balance_paid_at) ELSE NULL END;
  IF p_paid AND paid_at IS NULL THEN
    RAISE EXCEPTION 'verified payment date required' USING ERRCODE='23514';
  END IF;
  move_status := occ.move_in_status;
  IF p_paid AND move_status <> 'MOVED_IN'::public.move_in_status THEN
    move_status := 'BALANCE_PAID'::public.move_in_status;
  ELSIF NOT p_paid AND move_status = 'BALANCE_PAID'::public.move_in_status THEN
    SELECT previous_value INTO previous_status FROM public.contract_status_history
      WHERE project_id=p_project_id AND unit_id=p_unit_id AND contract_id=p_contract_id
        AND field_changed='move_in_status' AND new_value='BALANCE_PAID'
      ORDER BY changed_at DESC,history_id DESC LIMIT 1;
    move_status := CASE WHEN previous_status IN ('NOT_CONTACTED','CONTACTED','DELAYED')
      THEN previous_status::public.move_in_status
      WHEN previous_status='PLANNED' AND occ.planned_move_in_date IS NOT NULL THEN 'PLANNED'::public.move_in_status
      ELSE 'CONTACTED'::public.move_in_status END;
  END IF;
  IF paid_at IS NOT DISTINCT FROM occ.balance_paid_at AND move_status IS NOT DISTINCT FROM occ.move_in_status THEN
    RETURN jsonb_build_object('changed',false,'audited',true);
  END IF;
  -- BALANCE_GUARD_V1: retain the verified row lock; do not call the generic writer.
  UPDATE public.unit_occupancy_status
  SET move_in_status=move_status,balance_paid_at=paid_at,updated_by=actor
  WHERE project_id=p_project_id AND unit_id=p_unit_id AND contract_id=p_contract_id;

  IF paid_at IS DISTINCT FROM occ.balance_paid_at THEN
    INSERT INTO public.contract_status_history
      (project_id,contract_id,unit_id,field_changed,previous_value,new_value,reason,contact_id,changed_by,changed_at)
    VALUES (p_project_id,p_contract_id,p_unit_id,'balance_paid_at',occ.balance_paid_at::text,paid_at::text,
      coalesce(nullif(btrim(p_reason),''),'현장 잔금완납 변경'),NULL,actor,clock_timestamp());
  END IF;
  IF move_status IS DISTINCT FROM occ.move_in_status THEN
    INSERT INTO public.contract_status_history
      (project_id,contract_id,unit_id,field_changed,previous_value,new_value,reason,contact_id,changed_by,changed_at)
    VALUES (p_project_id,p_contract_id,p_unit_id,'move_in_status',occ.move_in_status::text,move_status::text,
      coalesce(nullif(btrim(p_reason),''),'현장 잔금완납 변경'),NULL,actor,clock_timestamp());
  END IF;
  RETURN jsonb_build_object('changed',true,'audited',true);
END;
$function$
;
commit;

