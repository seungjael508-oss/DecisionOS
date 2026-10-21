create function public.create_move_in_consultation(p_project_id uuid, p_unit_id uuid, p_customer_id uuid, p_consultation_type text, p_content text, p_expected_contract_id uuid,
  p_legacy_grade text, p_next_contact_at timestamptz, p_occupancy_intent public.occupancy_intent, p_funding_status public.funding_status,
  p_move_in_status public.move_in_status, p_planned_move_in_date date, p_balance_paid_at timestamptz, p_actual_move_in_date timestamptz,
  p_reason text, p_business_purpose text, p_clear_next_contact_at boolean, p_operational_intent public.operational_intent)
returns uuid language plpgsql security definer set search_path to '' as $$
begin
  if not exists (select 1 from public.contract c where c.project_id = p_project_id and c.unit_id = p_unit_id
     and c.contract_id = p_expected_contract_id and c.customer_id = p_customer_id and c.contract_status = 'ACTIVE') then
    raise exception 'expected contract mismatch' using errcode = '40001'; end if;
  return public.create_move_in_consultation(p_project_id, p_unit_id, p_customer_id, p_consultation_type, p_content,
    p_legacy_grade, p_next_contact_at, p_occupancy_intent, p_funding_status, p_move_in_status, p_planned_move_in_date,
    p_balance_paid_at, p_actual_move_in_date, p_reason, p_business_purpose, p_clear_next_contact_at, p_operational_intent);
end $$;
grant execute on all functions in schema public to authenticated;