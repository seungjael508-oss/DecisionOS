-- MOVE_IN deal + brokerage management. Additive only. Does not rewrite M1-M10C or occupancy RPCs.

create table public.brokerage_office (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project (id) on delete restrict,
  name text not null,
  address text,
  main_phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, project_id),
  check (btrim(name) <> '')
);

create unique index brokerage_office_project_name_key
  on public.brokerage_office (project_id, lower(btrim(name)));

create table public.brokerage_contact (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  brokerage_office_id uuid not null,
  role text not null,
  name text not null,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, project_id),
  unique (brokerage_office_id, role),
  foreign key (brokerage_office_id, project_id)
    references public.brokerage_office (id, project_id)
    on delete restrict,
  check (btrim(name) <> ''),
  check (role in ('REP', 'MANAGER1', 'MANAGER2'))
);

create table public.unit_deal (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project (id) on delete restrict,
  unit_id uuid not null,
  contract_id uuid not null,
  customer_id uuid not null,
  consent_status text not null,
  deal_status text not null,
  sale_enabled boolean not null default false,
  jeonse_enabled boolean not null default false,
  monthly_rent_enabled boolean not null default false,
  sale_note text,
  jeonse_note text,
  monthly_rent_note text,
  details text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by_project_member_id uuid not null,
  unique (project_id, unit_id),
  unique (id, project_id),
  foreign key (project_id, unit_id)
    references public.project_unit (project_id, unit_id)
    on delete restrict,
  foreign key (contract_id, project_id, unit_id)
    references public.contract (contract_id, project_id, unit_id)
    on delete restrict,
  foreign key (customer_id, project_id)
    references public.customer (id, project_id)
    on delete restrict,
  foreign key (updated_by_project_member_id, project_id)
    references public.project_member (id, project_id)
    on delete restrict,
  check (consent_status in ('CONSENTED', 'NOT_CONSENTED')),
  check (deal_status in ('IN_PROGRESS', 'COMPLETED'))
);

create table public.unit_deal_brokerage (
  unit_deal_id uuid not null,
  brokerage_office_id uuid not null,
  brokerage_contact_id uuid,
  created_at timestamptz not null default now(),
  primary key (unit_deal_id, brokerage_office_id),
  foreign key (unit_deal_id) references public.unit_deal (id) on delete restrict,
  foreign key (brokerage_office_id) references public.brokerage_office (id) on delete restrict,
  foreign key (brokerage_contact_id) references public.brokerage_contact (id) on delete restrict
);

create index idx_brokerage_office_project
  on public.brokerage_office (project_id, active);

create index idx_brokerage_contact_office
  on public.brokerage_contact (brokerage_office_id, role);

create index idx_unit_deal_project_customer
  on public.unit_deal (project_id, customer_id);

create trigger set_updated_at
  before update on public.brokerage_office
  for each row
  execute function private.set_updated_at();

create trigger set_updated_at
  before update on public.brokerage_contact
  for each row
  execute function private.set_updated_at();

create trigger set_updated_at
  before update on public.unit_deal
  for each row
  execute function private.set_updated_at();

revoke all on table public.brokerage_office from public, anon, authenticated;
revoke all on table public.brokerage_contact from public, anon, authenticated;
revoke all on table public.unit_deal from public, anon, authenticated;
revoke all on table public.unit_deal_brokerage from public, anon, authenticated;

grant select on table public.brokerage_office to authenticated;
grant select on table public.brokerage_contact to authenticated;
grant select on table public.unit_deal to authenticated;
grant select on table public.unit_deal_brokerage to authenticated;

alter table public.brokerage_office enable row level security;
alter table public.brokerage_contact enable row level security;
alter table public.unit_deal enable row level security;
alter table public.unit_deal_brokerage enable row level security;

create policy brokerage_office_select
on public.brokerage_office
for select
to authenticated
using (
  private.has_project_role(
    project_id,
    array['COUNSELOR', 'PROJECT_ADMIN']::public.project_member_role[]
  )
);

create policy brokerage_contact_select
on public.brokerage_contact
for select
to authenticated
using (
  private.has_project_role(
    project_id,
    array['COUNSELOR', 'PROJECT_ADMIN']::public.project_member_role[]
  )
);

create policy unit_deal_select
on public.unit_deal
for select
to authenticated
using (
  private.has_project_role(
    project_id,
    array['PROJECT_ADMIN']::public.project_member_role[]
  )
  or exists (
    select 1
    from public.customer as c
    where c.id = unit_deal.customer_id
      and c.project_id = unit_deal.project_id
      and c.assigned_counselor_id = private.current_project_member_id(
        unit_deal.project_id,
        array['COUNSELOR']::public.project_member_role[]
      )
  )
);

create policy unit_deal_brokerage_select
on public.unit_deal_brokerage
for select
to authenticated
using (
  exists (
    select 1
    from public.unit_deal as ud
    where ud.id = unit_deal_brokerage.unit_deal_id
      and (
        private.has_project_role(
          ud.project_id,
          array['PROJECT_ADMIN']::public.project_member_role[]
        )
        or exists (
          select 1
          from public.customer as c
          where c.id = ud.customer_id
            and c.project_id = ud.project_id
            and c.assigned_counselor_id = private.current_project_member_id(
              ud.project_id,
              array['COUNSELOR']::public.project_member_role[]
            )
        )
      )
  )
);

create or replace function public.save_move_in_unit_deal(
  p_project_id uuid,
  p_unit_id uuid,
  p_contract_id uuid,
  p_customer_id uuid,
  p_consent_status text,
  p_deal_status text,
  p_sale_enabled boolean,
  p_jeonse_enabled boolean,
  p_monthly_rent_enabled boolean,
  p_sale_note text default null,
  p_jeonse_note text default null,
  p_monthly_rent_note text default null,
  p_details text default null,
  p_brokerages jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
  v_contract public.contract%rowtype;
  v_deal_id uuid;
  v_item jsonb;
  v_office public.brokerage_office%rowtype;
  v_contact public.brokerage_contact%rowtype;
  v_office_id uuid;
  v_contact_id uuid;
  v_seen uuid[] := array[]::uuid[];
begin
  v_member_id := private.write_rpc_actor(p_project_id);

  if not exists (
    select 1
    from public.project_unit as pu
    where pu.project_id = p_project_id
      and pu.unit_id = p_unit_id
    for update
  ) then
    raise exception 'unit is not in project' using errcode = '23514';
  end if;

  select *
    into v_contract
  from public.contract as ct
  where ct.project_id = p_project_id
    and ct.unit_id = p_unit_id
    and ct.contract_status = 'ACTIVE'::public.contract_status
  for update;

  if not found then
    raise exception 'active contract not found' using errcode = '23514';
  end if;

  if v_contract.contract_id is distinct from p_contract_id then
    raise exception 'stale contract' using errcode = '23514';
  end if;

  if v_contract.customer_id is distinct from p_customer_id then
    raise exception 'customer does not match active holder' using errcode = '23514';
  end if;

  perform private.require_customer_write_access(
    p_project_id, p_customer_id, v_member_id
  );

  if p_consent_status not in ('CONSENTED', 'NOT_CONSENTED') then
    raise exception 'invalid consent status' using errcode = '23514';
  end if;

  if p_deal_status not in ('IN_PROGRESS', 'COMPLETED') then
    raise exception 'invalid deal status' using errcode = '23514';
  end if;

  if p_brokerages is null or jsonb_typeof(p_brokerages) is distinct from 'array' then
    raise exception 'brokerages must be an array' using errcode = '23514';
  end if;

  for v_item in select value from jsonb_array_elements(p_brokerages)
  loop
    begin
      v_office_id := (v_item ->> 'brokerage_office_id')::uuid;
    exception
      when others then
        raise exception 'invalid brokerage office' using errcode = '23514';
    end;

    if v_office_id is null then
      raise exception 'brokerage office is required' using errcode = '23514';
    end if;

    if v_office_id = any (v_seen) then
      raise exception 'duplicate brokerage office' using errcode = '23514';
    end if;
    v_seen := array_append(v_seen, v_office_id);

    select *
      into v_office
    from public.brokerage_office as bo
    where bo.id = v_office_id
    for update;

    if not found then
      raise exception 'brokerage office not found' using errcode = '23514';
    end if;

    if v_office.project_id is distinct from p_project_id then
      raise exception 'brokerage office is not in project' using errcode = '23514';
    end if;

    if v_office.active is not true then
      raise exception 'brokerage office is not active' using errcode = '23514';
    end if;

    v_contact_id := null;
    if nullif(btrim(coalesce(v_item ->> 'brokerage_contact_id', '')), '') is not null then
      begin
        v_contact_id := (v_item ->> 'brokerage_contact_id')::uuid;
      exception
        when others then
          raise exception 'invalid brokerage contact' using errcode = '23514';
      end;

      select *
        into v_contact
      from public.brokerage_contact as bc
      where bc.id = v_contact_id
      for update;

      if not found then
        raise exception 'brokerage contact not found' using errcode = '23514';
      end if;

      if v_contact.brokerage_office_id is distinct from v_office_id then
        raise exception 'contact is not in office' using errcode = '23514';
      end if;

      if v_contact.project_id is distinct from p_project_id then
        raise exception 'brokerage contact is not in project' using errcode = '23514';
      end if;

      if v_contact.active is not true then
        raise exception 'brokerage contact is not active' using errcode = '23514';
      end if;
    end if;
  end loop;

  insert into public.unit_deal (
    project_id,
    unit_id,
    contract_id,
    customer_id,
    consent_status,
    deal_status,
    sale_enabled,
    jeonse_enabled,
    monthly_rent_enabled,
    sale_note,
    jeonse_note,
    monthly_rent_note,
    details,
    updated_by_project_member_id
  ) values (
    p_project_id,
    p_unit_id,
    p_contract_id,
    p_customer_id,
    p_consent_status,
    p_deal_status,
    coalesce(p_sale_enabled, false),
    coalesce(p_jeonse_enabled, false),
    coalesce(p_monthly_rent_enabled, false),
    nullif(btrim(coalesce(p_sale_note, '')), ''),
    nullif(btrim(coalesce(p_jeonse_note, '')), ''),
    nullif(btrim(coalesce(p_monthly_rent_note, '')), ''),
    nullif(btrim(coalesce(p_details, '')), ''),
    v_member_id
  )
  on conflict (project_id, unit_id)
  do update set
    contract_id = excluded.contract_id,
    customer_id = excluded.customer_id,
    consent_status = excluded.consent_status,
    deal_status = excluded.deal_status,
    sale_enabled = excluded.sale_enabled,
    jeonse_enabled = excluded.jeonse_enabled,
    monthly_rent_enabled = excluded.monthly_rent_enabled,
    sale_note = excluded.sale_note,
    jeonse_note = excluded.jeonse_note,
    monthly_rent_note = excluded.monthly_rent_note,
    details = excluded.details,
    updated_by_project_member_id = excluded.updated_by_project_member_id
  returning id into v_deal_id;

  delete from public.unit_deal_brokerage as udb
  where udb.unit_deal_id = v_deal_id;

  insert into public.unit_deal_brokerage (
    unit_deal_id,
    brokerage_office_id,
    brokerage_contact_id
  )
  select
    v_deal_id,
    (item ->> 'brokerage_office_id')::uuid,
    nullif(item ->> 'brokerage_contact_id', '')::uuid
  from jsonb_array_elements(p_brokerages) as item;

  return v_deal_id;
end;
$$;

create or replace function public.save_brokerage_office(
  p_project_id uuid,
  p_name text,
  p_office_id uuid default null,
  p_address text default null,
  p_main_phone text default null,
  p_active boolean default true,
  p_contacts jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
  v_office_id uuid;
  v_name text;
  v_item jsonb;
  v_role text;
  v_contact_name text;
  v_phone text;
begin
  v_member_id := private.write_rpc_actor(p_project_id);
  perform private.require_project_admin(p_project_id, v_member_id);

  v_name := btrim(coalesce(p_name, ''));
  if v_name = '' then
    raise exception 'name is required' using errcode = '23514';
  end if;

  if p_contacts is null or jsonb_typeof(p_contacts) is distinct from 'array' then
    raise exception 'contacts must be an array' using errcode = '23514';
  end if;

  if p_office_id is null then
    insert into public.brokerage_office (
      project_id, name, address, main_phone, active
    ) values (
      p_project_id,
      v_name,
      nullif(btrim(coalesce(p_address, '')), ''),
      nullif(btrim(coalesce(p_main_phone, '')), ''),
      coalesce(p_active, true)
    )
    returning id into v_office_id;
  else
    if not exists (
      select 1
      from public.brokerage_office as bo
      where bo.id = p_office_id
        and bo.project_id = p_project_id
      for update
    ) then
      raise exception 'brokerage office is not in project' using errcode = '23514';
    end if;

    update public.brokerage_office as bo
    set
      name = v_name,
      address = nullif(btrim(coalesce(p_address, '')), ''),
      main_phone = nullif(btrim(coalesce(p_main_phone, '')), ''),
      active = coalesce(p_active, bo.active)
    where bo.id = p_office_id
      and bo.project_id = p_project_id;

    v_office_id := p_office_id;
  end if;

  update public.brokerage_contact as bc
  set active = false
  where bc.brokerage_office_id = v_office_id
    and bc.project_id = p_project_id;

  for v_item in select value from jsonb_array_elements(p_contacts)
  loop
    v_role := btrim(coalesce(v_item ->> 'role', ''));
    v_contact_name := btrim(coalesce(v_item ->> 'name', ''));
    v_phone := nullif(btrim(coalesce(v_item ->> 'phone', '')), '');

    if v_contact_name = '' then
      continue;
    end if;

    if v_role not in ('REP', 'MANAGER1', 'MANAGER2') then
      raise exception 'invalid contact role' using errcode = '23514';
    end if;

    insert into public.brokerage_contact (
      project_id, brokerage_office_id, role, name, phone, active
    ) values (
      p_project_id, v_office_id, v_role, v_contact_name, v_phone, true
    )
    on conflict (brokerage_office_id, role)
    do update set
      name = excluded.name,
      phone = excluded.phone,
      active = true;
  end loop;

  return v_office_id;
end;
$$;

revoke all on function public.save_move_in_unit_deal(
  uuid, uuid, uuid, uuid, text, text, boolean, boolean, boolean, text, text, text, text, jsonb
) from public, anon, authenticated;

revoke all on function public.save_brokerage_office(
  uuid, text, uuid, text, text, boolean, jsonb
) from public, anon, authenticated;

grant execute on function public.save_move_in_unit_deal(
  uuid, uuid, uuid, uuid, text, text, boolean, boolean, boolean, text, text, text, text, jsonb
) to authenticated;

grant execute on function public.save_brokerage_office(
  uuid, text, uuid, text, text, boolean, jsonb
) to authenticated;
