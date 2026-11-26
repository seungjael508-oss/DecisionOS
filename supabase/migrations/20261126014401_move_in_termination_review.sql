-- Isolated, append-only field review. This does not terminate a contract.
create table private.move_in_termination_review_event (
  seq bigint generated always as identity primary key,
  event_id uuid not null unique default gen_random_uuid(),
  project_id uuid not null references public.project(id),
  unit_id uuid not null,
  contract_id uuid not null,
  active boolean not null,
  reason text not null check (length(reason) between 1 and 500),
  actor_id uuid not null references public.project_member(id),
  recorded_at timestamptz not null default clock_timestamp(),
  foreign key (contract_id,project_id,unit_id) references public.contract(contract_id,project_id,unit_id)
);
create index move_in_termination_review_latest_idx
  on private.move_in_termination_review_event(project_id,unit_id,contract_id,seq desc);
alter table private.move_in_termination_review_event enable row level security;
revoke all on private.move_in_termination_review_event from public, anon, authenticated;

create function public.set_move_in_termination_review(
  p_project_id uuid,p_unit_id uuid,p_contract_id uuid,p_active boolean,p_reason text,p_expected_event_id uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid;
  v_event uuid;
  v_latest uuid;
  v_active boolean;
  v_reason text := btrim(coalesce(p_reason,''));
begin
  v_actor := private.write_rpc_actor(p_project_id);
  perform private.require_project_admin(p_project_id,v_actor);
  if p_active is null or length(v_reason) not between 1 and 500 then
    raise exception 'invalid termination review input' using errcode='22023';
  end if;
  perform 1 from public.contract c where c.project_id=p_project_id and c.unit_id=p_unit_id
    and c.contract_id=p_contract_id and c.contract_status='ACTIVE'::public.contract_status for update;
  if not found then raise exception 'current contract changed' using errcode='40001'; end if;
  select e.event_id,e.active into v_latest,v_active from private.move_in_termination_review_event e
    where e.project_id=p_project_id and e.unit_id=p_unit_id and e.contract_id=p_contract_id order by e.seq desc limit 1;
  if p_expected_event_id is distinct from v_latest then
    raise exception 'termination review changed' using errcode='40001';
  end if;
  if p_active=coalesce(v_active,false) then
    raise exception 'termination review is unchanged' using errcode='22023';
  end if;
  insert into private.move_in_termination_review_event(project_id,unit_id,contract_id,active,reason,actor_id)
    values (p_project_id,p_unit_id,p_contract_id,p_active,v_reason,v_actor) returning event_id into v_event;
  return v_event;
end;
$$;
revoke all on function public.set_move_in_termination_review(uuid,uuid,uuid,boolean,text,uuid) from public, anon;
grant execute on function public.set_move_in_termination_review(uuid,uuid,uuid,boolean,text,uuid) to authenticated;

create function public.list_move_in_termination_review(p_project_id uuid)
returns table(event_id uuid,unit_id uuid,contract_id uuid,active boolean,reason text,recorded_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid;
begin
  v_actor := private.write_rpc_actor(p_project_id);
  perform private.require_project_admin(p_project_id,v_actor);
  return query select distinct on(e.unit_id,e.contract_id) e.event_id,e.unit_id,e.contract_id,e.active,e.reason,e.recorded_at
    from private.move_in_termination_review_event e join public.contract c
      on c.project_id=e.project_id and c.unit_id=e.unit_id and c.contract_id=e.contract_id
     and c.contract_status='ACTIVE'::public.contract_status
    where e.project_id=p_project_id order by e.unit_id,e.contract_id,e.seq desc;
end;
$$;
revoke all on function public.list_move_in_termination_review(uuid) from public, anon;
grant execute on function public.list_move_in_termination_review(uuid) to authenticated;
