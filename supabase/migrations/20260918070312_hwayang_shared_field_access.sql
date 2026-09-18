-- 화양 활성 현장 멤버만 공동 조회/작업을 허용한다. 기존 역할/담당자 정책과 관리자 helper는 보존한다.
-- 테이블/컬럼/데이터/DML grant 변경 없음. 다른 프로젝트는 기존 정책/RPC로 판정한다.
create function private.is_hwayang_field_member(p_project_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_project_id = '1283e198-5043-4027-96d6-edcc7a6686c6'::uuid
    and private.current_project_member_id(p_project_id,
      array['COUNSELOR','PROJECT_ADMIN']::public.project_member_role[]) is not null;
$$;
revoke all on function private.is_hwayang_field_member(uuid) from public, anon;
grant execute on function private.is_hwayang_field_member(uuid) to authenticated;

-- 기존 담당자 정책에 화양 membership 조건만 OR로 더한다. SELECT 외 권한은 열지 않는다.
create policy customer_hwayang_field_select on public.customer
for select to authenticated using (private.is_hwayang_field_member(project_id));
create policy consultation_hwayang_field_select on public.consultation
for select to authenticated using (private.is_hwayang_field_member(project_id));
create policy customer_status_log_hwayang_field_select on public.customer_status_log
for select to authenticated using (private.is_hwayang_field_member(project_id));
create policy unit_deal_hwayang_field_select on public.unit_deal
for select to authenticated using (private.is_hwayang_field_member(project_id));
create policy unit_deal_brokerage_hwayang_field_select on public.unit_deal_brokerage
for select to authenticated using (exists (
  select 1 from public.unit_deal d where d.id = unit_deal_brokerage.unit_deal_id
    and private.is_hwayang_field_member(d.project_id)
));

-- 현장 RPC 전용 경계. 공통 require_customer_write_access를 바꾸지 않아
-- 계약/명의변경/이관/그 밖의 RPC 권한이 의도치 않게 확장되지 않는다.
create function private.require_field_customer_write_access(
  p_project_id uuid, p_customer_id uuid, p_member_id uuid
) returns void language plpgsql stable security definer set search_path = '' as $$
begin
  -- 전달된 작성자가 현재 로그인한 활성 멤버인지 재검증한다.
  if p_member_id is distinct from private.write_rpc_actor(p_project_id) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if not private.is_hwayang_field_member(p_project_id) then
    perform private.require_customer_write_access(p_project_id, p_customer_id, p_member_id);
    return;
  end if;
  if not exists (select 1 from public.customer c where c.id = p_customer_id and c.project_id = p_project_id) then
    raise exception 'customer is not in project' using errcode = '23514';
  end if;
end;
$$;
revoke all on function private.require_field_customer_write_access(uuid,uuid,uuid) from public,anon,authenticated;

-- create_move_in_consultation: 기존 검증/트랜잭션/작성자 기록은 유지하고 현장 접근 조건만 교체한다.
create or replace function public.create_move_in_consultation(
  p_project_id uuid,
  p_unit_id uuid,
  p_customer_id uuid,
  p_consultation_type text,
  p_content text,
  p_legacy_grade text default null,
  p_next_contact_at timestamptz default null,
  p_occupancy_intent public.occupancy_intent default null,
  p_funding_status public.funding_status default null,
  p_move_in_status public.move_in_status default null,
  p_planned_move_in_date date default null,
  p_balance_paid_at timestamptz default null,
  p_actual_move_in_date timestamptz default null,
  p_reason text default null,
  p_business_purpose text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
  v_content text;
  v_type text;
  v_contact varchar;
  v_purpose varchar;
  v_grade text;
  v_contract public.contract%rowtype;
  v_consulted_at timestamptz;
  v_id uuid;
  v_want_occupancy boolean;
begin
  v_member_id := private.write_rpc_actor(p_project_id);
  perform private.require_field_customer_write_access(
    p_project_id, p_customer_id, v_member_id
  );

  v_content := btrim(coalesce(p_content, ''));
  if v_content = '' then
    raise exception 'content is required' using errcode = '23514';
  end if;

  v_type := btrim(coalesce(p_consultation_type, ''));
  if v_type = 'OUTBOUND' then
    v_contact := 'CALL';
    v_purpose := 'OUTBOUND';
  elsif v_type = 'INBOUND' then
    v_contact := 'CALL';
    v_purpose := 'INBOUND';
  elsif v_type = 'VISIT' then
    v_contact := 'VISIT';
    v_purpose := 'VISIT';
  elsif v_type = 'MESSAGE' then
    v_contact := 'MESSAGE';
    v_purpose := 'MESSAGE';
  else
    raise exception 'invalid consultation type' using errcode = '23514';
  end if;

  if p_business_purpose is not null then
    if p_business_purpose not in ('성향파악', '입주안내', '잔금독촉', '매칭안내', '기타') then
      raise exception 'invalid business purpose' using errcode = '23514';
    end if;
    v_purpose := p_business_purpose;
  end if;

  v_grade := nullif(btrim(coalesce(p_legacy_grade, '')), '');
  if v_grade is not null
     and v_grade not in ('A', 'B', 'C', 'D', '부재', '상담거절') then
    raise exception 'invalid legacy grade' using errcode = '23514';
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

  select *
    into v_contract
  from public.contract as ct
  where ct.project_id = p_project_id
    and ct.unit_id = p_unit_id
    and ct.customer_id = p_customer_id
    and ct.contract_status = 'ACTIVE'::public.contract_status
  for update;

  if not found then
    raise exception 'active contract not found' using errcode = '23514';
  end if;

  v_consulted_at := now();

  insert into public.consultation (
    project_id,
    customer_id,
    counselor_id,
    consulted_at,
    content,
    created_by,
    unit_id,
    contact_type,
    stage,
    purpose,
    structured_tags,
    next_action_at
  ) values (
    p_project_id,
    p_customer_id,
    v_member_id,
    v_consulted_at,
    v_content,
    v_member_id,
    p_unit_id,
    v_contact,
    'MOVE_IN',
    v_purpose,
    jsonb_strip_nulls(jsonb_build_object('legacy_grade', v_grade, 'consultation_type', v_type)),
    p_next_contact_at
  )
  returning id into v_id;

  v_want_occupancy :=
    p_next_contact_at is not null
    or p_occupancy_intent is not null
    or p_funding_status is not null
    or p_move_in_status is not null
    or p_planned_move_in_date is not null
    or p_balance_paid_at is not null
    or p_actual_move_in_date is not null;

  if v_want_occupancy then
    perform public.update_unit_occupancy_status(
      p_project_id := p_project_id,
      p_unit_id := p_unit_id,
      p_contract_id := v_contract.contract_id,
      p_occupancy_intent := p_occupancy_intent,
      p_funding_status := p_funding_status,
      p_move_in_status := p_move_in_status,
      p_planned_move_in_date := p_planned_move_in_date,
      p_balance_paid_at := p_balance_paid_at,
      p_actual_move_in_date := p_actual_move_in_date,
      p_last_contact_at := v_consulted_at,
      p_next_contact_at := p_next_contact_at,
      p_contact_id := v_id,
      p_reason := nullif(btrim(coalesce(p_reason, '')), '')
    );
  end if;

  return v_id;
end;
$$;

-- update_unit_occupancy_status: 기존 검증/트랜잭션/작성자 기록은 유지하고 현장 접근 조건만 교체한다.
create or replace function public.update_unit_occupancy_status(
  p_project_id uuid,
  p_unit_id uuid,
  p_contract_id uuid,
  p_occupancy_intent public.occupancy_intent default null,
  p_funding_status public.funding_status default null,
  p_move_in_status public.move_in_status default null,
  p_planned_move_in_date date default null,
  p_balance_paid_at timestamptz default null,
  p_actual_move_in_date timestamptz default null,
  p_last_contact_at timestamptz default null,
  p_next_contact_at timestamptz default null,
  p_clear_planned_move_in_date boolean default false,
  p_clear_balance_paid_at boolean default false,
  p_clear_actual_move_in_date boolean default false,
  p_clear_last_contact_at boolean default false,
  p_clear_next_contact_at boolean default false,
  p_contact_id uuid default null,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

-- save_move_in_unit_deal: 기존 검증/트랜잭션/작성자 기록은 유지하고 현장 접근 조건만 교체한다.
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

  perform private.require_field_customer_write_access(
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

-- generate_report: 기존 검증/트랜잭션/작성자 기록은 유지하고 현장 접근 조건만 교체한다.
create or replace function public.generate_report(
  p_project_id uuid,
  p_report_date date,
  p_report_phase public.report_phase,
  p_report_type public.report_type,
  p_generated_data jsonb,
  p_template_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
  v_template public.report_template%rowtype;
  v_project_org uuid;
  v_prev public.report%rowtype;
  v_id uuid;
  v_version integer;
  v_supersedes uuid;
begin
  v_member_id := private.write_rpc_actor(p_project_id);
  if not (private.is_hwayang_field_member(p_project_id) and p_report_phase = 'MOVE_IN'::public.report_phase and p_report_type = 'DAILY'::public.report_type) then
    perform private.require_project_admin(p_project_id, v_member_id);
  end if;

  if p_generated_data is null then
    raise exception 'generated_data is required' using errcode = '23514';
  end if;

  select p.organization_id
    into v_project_org
  from public.project as p
  where p.id = p_project_id;

  if p_template_id is not null then
    select *
      into v_template
    from public.report_template as t
    where t.template_id = p_template_id;

    if not found then
      raise exception 'template not found' using errcode = '23503';
    end if;

    if v_template.organization_id is distinct from v_project_org then
      raise exception 'template organization mismatch' using errcode = '23514';
    end if;

    if v_template.project_id is not null
       and v_template.project_id is distinct from p_project_id then
      raise exception 'template is not in project' using errcode = '23514';
    end if;
  end if;

  select *
    into v_prev
  from public.report as r
  where r.project_id = p_project_id
    and r.report_date = p_report_date
    and r.report_phase = p_report_phase
    and r.report_type = p_report_type
  order by r.version desc
  limit 1
  for update;

  if found then
    v_version := v_prev.version + 1;
    v_supersedes := v_prev.report_id;
  else
    v_version := 1;
    v_supersedes := null;
  end if;

  insert into public.report (
    project_id,
    template_id,
    report_phase,
    report_type,
    report_date,
    generated_data,
    version,
    supersedes_report_id,
    generated_by
  ) values (
    p_project_id,
    p_template_id,
    p_report_phase,
    p_report_type,
    p_report_date,
    p_generated_data,
    v_version,
    v_supersedes,
    v_member_id
  )
  returning report_id into v_id;

  return v_id;
end;
$$;

-- save_brokerage_office: 기존 검증/트랜잭션/작성자 기록은 유지하고 현장 접근 조건만 교체한다.
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
  if not (private.is_hwayang_field_member(p_project_id)) then
    perform private.require_project_admin(p_project_id, v_member_id);
  end if;

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

-- CREATE OR REPLACE는 기존 RPC의 authenticated EXECUTE / PUBLIC·anon 차단을 유지한다.
-- helper는 private schema에만 두며 현장용 customer 검사 helper는 외부 호출을 금지한다.
