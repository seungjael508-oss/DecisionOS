-- Phone quality is independent of source-confirmed customer identity.
create function private.normalized_contact_phone(p_raw text) returns text
language sql immutable set search_path='' as $$
 select case when coalesce(p_raw,'') ~ '^[0-9[:space:]()+.\-]+$'
 and regexp_replace(p_raw,'[^0-9]','','g') ~ '^(01[016789][0-9]{7,8}|02[0-9]{7,8}|0[3-6][0-9][0-9]{7,8}|070[0-9]{8}|1[568][0-9]{6})$'
 then regexp_replace(p_raw,'[^0-9]','','g') else null end
$$;
revoke all on function private.normalized_contact_phone(text) from public;
grant execute on function private.normalized_contact_phone(text) to authenticated;

alter table public.customer alter column phone type text;
alter table public.customer alter column phone_normalized drop not null;
alter table public.customer add column phone_raw text;
alter table public.customer add column source_identity_key text;
alter table public.customer add constraint customer_source_key_valid check (source_identity_key is null or length(btrim(source_identity_key)) between 1 and 200);
alter table public.customer drop constraint customer_project_id_phone_normalized_key;
-- Preserve legacy unkeyed uniqueness; source-confirmed identities may share a number.
create unique index customer_legacy_phone_unique on public.customer(project_id,phone_normalized) where source_identity_key is null;
create unique index customer_source_identity_unique on public.customer(project_id,source_identity_key) where source_identity_key is not null;
update public.customer set phone_raw=phone, phone_normalized=private.normalized_contact_phone(phone);
alter table public.customer alter column phone_raw set not null;
alter table public.customer add column phone_quality text generated always as
 (case when phone_normalized is null then 'PHONE_INVALID' else 'PHONE_VALID' end) stored;
alter table public.customer add constraint customer_phone_quality_consistency
 check (phone_normalized is not distinct from private.normalized_contact_phone(phone));

create function private.customer_phone_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare v_member uuid;
begin
 if tg_op='UPDATE' then
  if new.phone_raw is distinct from old.phone_raw or new.source_identity_key is distinct from old.source_identity_key then
   raise exception 'source identity and original phone are immutable' using errcode='23514';
  end if;
  if new.phone is distinct from old.phone or new.phone_normalized is distinct from old.phone_normalized then
   if auth.uid() is not null then
    v_member:=private.write_rpc_actor(old.project_id);
    perform private.require_project_admin(old.project_id,v_member);
   end if;
  end if;
 else
  new.phone_raw:=coalesce(new.phone_raw,new.phone,'');
 end if;
 new.phone:=coalesce(new.phone,'');
 new.phone_normalized:=private.normalized_contact_phone(new.phone);
 return new;
end $$;
revoke all on function private.customer_phone_guard() from public,anon,authenticated;
create trigger customer_phone_guard before insert or update on public.customer for each row execute function private.customer_phone_guard();

create function public.update_customer_phone(p_project_id uuid,p_customer_id uuid,p_phone text,p_expected_phone text)
returns void language plpgsql security definer set search_path='' as $$
declare v_member uuid; v_phone text;
begin
 v_member:=private.write_rpc_actor(p_project_id);
 perform private.require_project_admin(p_project_id,v_member);
 if p_phone is null or length(p_phone)>200 then raise exception 'invalid phone input' using errcode='23514'; end if;
 select phone into v_phone from public.customer where id=p_customer_id and project_id=p_project_id for update;
 if not found then raise exception 'customer not in project' using errcode='23503'; end if;
 if v_phone is distinct from p_expected_phone then raise exception 'stale phone' using errcode='23514'; end if;
 update public.customer set phone=p_phone where id=p_customer_id and project_id=p_project_id;
end $$;
revoke all on function public.update_customer_phone(uuid,uuid,text,text) from public,anon;
grant execute on function public.update_customer_phone(uuid,uuid,text,text) to authenticated;

-- Historical source holders may have an unconfirmed contract date.
alter table public.contract alter column contracted_at drop not null;

-- Replace signature, retaining the existing atomic lifecycle and auth checks.
drop function public.apply_move_in_import_row(uuid,uuid,text,uuid,text,text,uuid,public.occupancy_intent,public.funding_status,public.move_in_status,date,timestamptz,timestamptz,text);
create or replace function public.apply_move_in_import_row(
  p_project_id uuid,
  p_unit_id uuid,
  p_apply_mode text,
  p_existing_customer_id uuid default null,
  p_new_customer_name text default null,
  p_new_customer_phone_normalized text default null,
  p_expected_current_contract_id uuid default null,
  p_occupancy_intent public.occupancy_intent default null,
  p_funding_status public.funding_status default null,
  p_move_in_status public.move_in_status default null,
  p_planned_move_in_date date default null,
  p_balance_paid_at timestamptz default null,
  p_actual_move_in_date timestamptz default null,
  p_reason text default null,
  p_new_customer_phone_raw text default null,
  p_source_identity_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
  v_mode text;
  v_name varchar(100);
  v_phone varchar(20);
  v_customer_id uuid;
  v_active public.contract%rowtype;
  v_active_count integer;
  v_contract_id uuid;
  v_occ public.unit_occupancy_status%rowtype;
  v_want_occupancy boolean;
  v_did_create boolean := false;
  v_did_transfer boolean := false;
  v_did_occupancy boolean := false;
  v_result text;
begin
  v_member_id := private.write_rpc_actor(p_project_id);
  perform private.require_project_admin(p_project_id, v_member_id);

  v_mode := btrim(coalesce(p_apply_mode, ''));
  if v_mode not in (
    'NO_OP',
    'CREATE_CONTRACT',
    'TRANSFER_HOLDER',
    'UPDATE_OCCUPANCY',
    'CREATE_CONTRACT_AND_UPDATE_OCCUPANCY',
    'TRANSFER_HOLDER_AND_UPDATE_OCCUPANCY'
  ) then
    raise exception 'invalid apply_mode' using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.project_unit as pu
    where pu.project_id = p_project_id
      and pu.unit_id = p_unit_id
    for update
  ) then
    raise exception 'unit is not in project' using errcode = '23514';
  end if;

  v_name := left(btrim(coalesce(p_new_customer_name, '')), 100);
  v_phone := left(btrim(coalesce(p_new_customer_phone_normalized, '')), 20);

  select count(*)
    into v_active_count
  from public.contract as ct
  where ct.project_id = p_project_id
    and ct.unit_id = p_unit_id
    and ct.contract_status = 'ACTIVE'::public.contract_status;

  if v_active_count > 1 then
    raise exception 'active contract conflict' using errcode = '23514';
  end if;

  select *
    into v_active
  from public.contract as ct
  where ct.project_id = p_project_id
    and ct.unit_id = p_unit_id
    and ct.contract_status = 'ACTIVE'::public.contract_status
  for update;

  if not found then
    v_active := null;
  end if;

  if v_active.contract_id is distinct from p_expected_current_contract_id then
    raise exception 'stale preview contract' using errcode = '23514';
  end if;

  if p_existing_customer_id is not null then
    select c.id
      into v_customer_id
    from public.customer as c
    where c.id = p_existing_customer_id
    for update;

    if not found then
      raise exception 'customer not found' using errcode = '23503';
    end if;

    if not exists (
      select 1
      from public.customer as c
      where c.id = p_existing_customer_id
        and c.project_id = p_project_id
    ) then
      raise exception 'customer is not in project' using errcode = '23514';
    end if;
    if p_source_identity_key is not null and not exists (
      select 1 from public.customer c where c.id=v_customer_id and c.source_identity_key=p_source_identity_key
    ) then
      raise exception 'source identity does not match customer' using errcode='23514';
    end if;
  elsif p_source_identity_key is not null then
    if length(btrim(p_source_identity_key)) not between 1 and 200 then
      raise exception 'invalid source identity' using errcode='23514';
    end if;
    perform pg_advisory_xact_lock(hashtextextended(p_project_id::text || ':' || p_source_identity_key,0));
    select c.id into v_customer_id from public.customer c
    where c.project_id=p_project_id and c.source_identity_key=p_source_identity_key for update;
    if found and exists(select 1 from public.customer c where c.id=v_customer_id and c.name is distinct from v_name) then
      raise exception 'source holder changed; explicit review required' using errcode='23514';
    end if;
  elsif v_phone <> '' then
    if v_phone !~ '^[0-9]{8,20}$' then
      raise exception 'phone_normalized is invalid' using errcode = '23514';
    end if;

    select c.id
      into v_customer_id
    from public.customer as c
    where c.project_id = p_project_id
      and c.phone_normalized = v_phone
      and c.source_identity_key is null
    for update;
  end if;

  if v_customer_id is null
     and v_mode in (
       'CREATE_CONTRACT',
       'TRANSFER_HOLDER',
       'CREATE_CONTRACT_AND_UPDATE_OCCUPANCY',
       'TRANSFER_HOLDER_AND_UPDATE_OCCUPANCY'
     )
  then
    if v_name = '' or (p_source_identity_key is null and (v_phone = '' or v_phone !~ '^[0-9]{8,20}$')) then
      raise exception 'new customer identity is insufficient' using errcode = '23514';
    end if;

    insert into public.customer (
      project_id,
      name,
      phone,
      phone_normalized,
      phone_raw,
      source_identity_key,
      source
    ) values (
      p_project_id,
      v_name,
      coalesce(p_new_customer_phone_raw,v_phone),
      nullif(v_phone,''),
      coalesce(p_new_customer_phone_raw,v_phone),
      p_source_identity_key,
      'IMPORT'
    )
    returning id into v_customer_id;
  end if;

  if v_mode = 'UPDATE_OCCUPANCY' then
    if v_active.contract_id is null then
      raise exception 'active contract not found' using errcode = '23503';
    end if;
    v_customer_id := coalesce(v_customer_id, v_active.customer_id);
    if v_customer_id is distinct from v_active.customer_id then
      raise exception 'customer does not match active contract' using errcode = '23514';
    end if;
  end if;

  if v_customer_id is null and v_mode <> 'NO_OP' then
    raise exception 'customer is required' using errcode = '23514';
  end if;

  if v_customer_id is not null then
    perform private.require_customer_write_access(
      p_project_id, v_customer_id, v_member_id
    );
  end if;

  v_contract_id := v_active.contract_id;

  if v_mode in ('CREATE_CONTRACT', 'CREATE_CONTRACT_AND_UPDATE_OCCUPANCY') then
    if v_active.contract_id is not null then
      if v_active.customer_id is distinct from v_customer_id then
        raise exception 'active contract already exists' using errcode = '23505';
      end if;
    else
      v_contract_id := public.create_contract(
        p_project_id,
        v_customer_id,
        p_unit_id,
        null
      );
      v_did_create := true;
    end if;
  elsif v_mode in ('TRANSFER_HOLDER', 'TRANSFER_HOLDER_AND_UPDATE_OCCUPANCY') then
    if v_active.contract_id is null then
      raise exception 'active contract not found' using errcode = '23503';
    end if;
    if v_active.customer_id is distinct from v_customer_id then
      v_contract_id := public.transfer_contract_holder(
        p_project_id,
        v_active.contract_id,
        v_customer_id
      );
      v_did_transfer := true;
    end if;
  end if;

  if p_source_identity_key is not null and (v_did_create or v_did_transfer) then
    update public.contract set contracted_at=null where contract_id=v_contract_id and project_id=p_project_id;
  end if;

  v_want_occupancy :=
    p_occupancy_intent is not null
    or p_funding_status is not null
    or p_move_in_status is not null
    or p_planned_move_in_date is not null
    or p_balance_paid_at is not null
    or p_actual_move_in_date is not null;

  if v_mode in (
       'UPDATE_OCCUPANCY',
       'CREATE_CONTRACT_AND_UPDATE_OCCUPANCY',
       'TRANSFER_HOLDER_AND_UPDATE_OCCUPANCY'
     )
     and v_want_occupancy
     and v_contract_id is not null
  then
    select *
      into v_occ
    from public.unit_occupancy_status as uos
    where uos.project_id = p_project_id
      and uos.unit_id = p_unit_id
      and uos.contract_id = v_contract_id
    for update;

    if not found then
      raise exception 'occupancy not found' using errcode = '23503';
    end if;

    if (p_occupancy_intent is null or p_occupancy_intent is not distinct from v_occ.occupancy_intent)
       and (p_funding_status is null or p_funding_status is not distinct from v_occ.funding_status)
       and (p_move_in_status is null or p_move_in_status is not distinct from v_occ.move_in_status)
       and (p_planned_move_in_date is null or p_planned_move_in_date is not distinct from v_occ.planned_move_in_date)
       and (p_balance_paid_at is null or p_balance_paid_at is not distinct from v_occ.balance_paid_at)
       and (p_actual_move_in_date is null or p_actual_move_in_date is not distinct from v_occ.actual_move_in_date)
    then
      v_did_occupancy := false;
    else
      perform public.update_unit_occupancy_status(
        p_project_id,
        p_unit_id,
        v_contract_id,
        p_occupancy_intent,
        p_funding_status,
        p_move_in_status,
        p_planned_move_in_date,
        p_balance_paid_at,
        p_actual_move_in_date,
        null,
        null,
        false,
        false,
        false,
        false,
        false,
        null,
        coalesce(nullif(btrim(coalesce(p_reason, '')), ''), 'IMPORT')
      );
      v_did_occupancy := true;
    end if;
  end if;

  if v_did_create and v_did_occupancy then
    v_result := 'CONTRACT_CREATED_AND_OCCUPANCY_UPDATED';
  elsif v_did_transfer and v_did_occupancy then
    v_result := 'HOLDER_TRANSFERRED_AND_OCCUPANCY_UPDATED';
  elsif v_did_create then
    v_result := 'CONTRACT_CREATED';
  elsif v_did_transfer then
    v_result := 'HOLDER_TRANSFERRED';
  elsif v_did_occupancy then
    v_result := 'OCCUPANCY_UPDATED';
  else
    v_result := 'NO_OP';
  end if;

  return jsonb_build_object(
    'customer_id', v_customer_id,
    'contract_id', v_contract_id,
    'unit_id', p_unit_id,
    'result', v_result
  );
end;
$$;

revoke all on function public.apply_move_in_import_row(
  uuid, uuid, text, uuid, text, text, uuid,
  public.occupancy_intent, public.funding_status, public.move_in_status,
  date, timestamptz, timestamptz, text, text, text
) from public;

do $priv$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute $sql$
      revoke all on function public.apply_move_in_import_row(
        uuid, uuid, text, uuid, text, text, uuid,
        public.occupancy_intent, public.funding_status, public.move_in_status,
        date, timestamptz, timestamptz, text, text, text
      ) from anon
    $sql$;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute $sql$
      grant execute on function public.apply_move_in_import_row(
        uuid, uuid, text, uuid, text, text, uuid,
        public.occupancy_intent, public.funding_status, public.move_in_status,
        date, timestamptz, timestamptz, text, text, text
      ) to authenticated
    $sql$;
  end if;
end
$priv$;

-- M10A: missing write RPCs. Does not replace M10 functions.
-- Helpers SoT: private.write_rpc_actor / private.require_customer_write_access
-- from M10, and Phase 1 current_project_member_id / has_project_role.

create or replace function public.promote_entry_to_customer(
  p_project_id uuid,
  p_entry_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
  v_entry public.entry_pool%rowtype;
  v_customer_id uuid;
  v_name varchar(100);
  v_phone varchar(20);
  v_source varchar(50);
begin
  v_member_id := private.write_rpc_actor(p_project_id);

  select *
    into v_entry
  from public.entry_pool as e
  where e.entry_id = p_entry_id
  for update;

  if not found then
    raise exception 'entry not found' using errcode = '23503';
  end if;

  if v_entry.project_id is distinct from p_project_id then
    raise exception 'entry is not in project' using errcode = '23514';
  end if;

  if v_entry.status = 'DORMANT' then
    raise exception 'entry is dormant' using errcode = '23514';
  end if;

  if v_entry.phone_normalized !~ '^[0-9]+$' then
    raise exception 'invalid entry phone' using errcode='23514';
  end if;

  select c.id
    into v_customer_id
  from public.customer as c
  where c.project_id = p_project_id
    and c.phone_normalized = v_entry.phone_normalized
    and c.source_identity_key is null
  for update;

  if v_entry.status = 'PROMOTED' then
    if v_customer_id is null then
      raise exception 'promoted entry has no customer' using errcode = '23503';
    end if;
    return v_customer_id;
  end if;

  if v_customer_id is null then
    v_name := left(
      coalesce(
        nullif(btrim(coalesce(v_entry.name_or_nickname, '')), ''),
        'Entry ' || v_entry.phone_normalized
      ),
      100
    );
    v_phone := left(v_entry.phone_normalized, 20);
    v_source := left(v_entry.acquisition_channel, 50);

    insert into public.customer (
      project_id,
      name,
      phone,
      phone_normalized,
      source,
      assigned_counselor_id
    ) values (
      p_project_id,
      v_name,
      v_phone,
      v_entry.phone_normalized,
      v_source,
      v_member_id
    )
    returning id into v_customer_id;
  else
    update public.customer
    set source = coalesce(source, left(v_entry.acquisition_channel, 50))
    where id = v_customer_id
      and project_id = p_project_id;
  end if;

  update public.entry_pool
  set status = 'PROMOTED'
  where entry_id = p_entry_id
    and project_id = p_project_id;

  insert into public.funnel_event (
    project_id,
    customer_id,
    event_type,
    source_channel,
    metadata,
    created_by
  ) values (
    p_project_id,
    v_customer_id,
    'ENTRY_PROMOTED',
    v_entry.acquisition_channel,
    jsonb_build_object('entry_id', p_entry_id),
    v_member_id
  );

  return v_customer_id;
end;
$$;


notify pgrst, 'reload schema';
