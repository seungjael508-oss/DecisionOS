-- Display classification only: do not expose the review reason or permit writes.
create function public.list_active_move_in_termination_review_keys(p_project_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_actor uuid;
  v_can_read_project boolean;
  v_keys jsonb;
begin
  v_actor := private.write_rpc_actor(p_project_id);
  v_can_read_project := private.is_hwayang_field_member(p_project_id)
    or private.has_project_role(p_project_id,array['PROJECT_ADMIN']::public.project_member_role[]);
  with latest as (
    select distinct on (e.unit_id,e.contract_id) e.unit_id,e.contract_id,e.active
    from private.move_in_termination_review_event e
    join public.contract c on c.project_id=e.project_id and c.unit_id=e.unit_id and c.contract_id=e.contract_id
      and c.contract_status='ACTIVE'::public.contract_status
    join public.customer u on u.project_id=c.project_id and u.id=c.customer_id
    where e.project_id=p_project_id and (v_can_read_project or u.assigned_counselor_id=v_actor)
    order by e.unit_id,e.contract_id,e.seq desc
  )
  select coalesce(jsonb_agg(jsonb_build_object('unit_id',unit_id,'contract_id',contract_id)),'[]'::jsonb)
  into v_keys from latest where active;
  return v_keys;
end;
$$;
revoke all on function public.list_active_move_in_termination_review_keys(uuid) from public, anon;
grant execute on function public.list_active_move_in_termination_review_keys(uuid) to authenticated;
