-- M9: lifecycle RLS. Reuses Phase 1 helpers. No new SECURITY DEFINER
-- functions, no RPC, no FORCE RLS, no TEAM_LEAD in policy expressions.
-- HEAD is not a project_member_role value.

alter table public.project_unit enable row level security;
alter table public.customer_unit_interest enable row level security;
alter table public.subscription enable row level security;
alter table public.contract enable row level security;
alter table public.unit_occupancy_status enable row level security;
alter table public.contract_status_history enable row level security;
alter table public.market_data enable row level security;
alter table public.report_template enable row level security;
alter table public.report enable row level security;
alter table public.cs_ticket enable row level security;

create policy project_unit_select
on public.project_unit
for select
to authenticated
using (
  private.has_project_role(
    project_id,
    array['COUNSELOR', 'PROJECT_ADMIN']::public.project_member_role[]
  )
);

create policy project_unit_insert
on public.project_unit
for insert
to authenticated
with check (
  private.has_project_role(
    project_id,
    array['PROJECT_ADMIN']::public.project_member_role[]
  )
);

create policy project_unit_update
on public.project_unit
for update
to authenticated
using (
  private.has_project_role(
    project_id,
    array['PROJECT_ADMIN']::public.project_member_role[]
  )
)
with check (
  private.has_project_role(
    project_id,
    array['PROJECT_ADMIN']::public.project_member_role[]
  )
);

create policy customer_unit_interest_select
on public.customer_unit_interest
for select
to authenticated
using (
  private.has_project_role(
    project_id,
    array['COUNSELOR', 'PROJECT_ADMIN']::public.project_member_role[]
  )
);

create policy customer_unit_interest_insert
on public.customer_unit_interest
for insert
to authenticated
with check (
  private.has_project_role(
    project_id,
    array['PROJECT_ADMIN']::public.project_member_role[]
  )
  or exists (
    select 1
    from public.customer as c
    where c.id = customer_unit_interest.customer_id
      and c.project_id = customer_unit_interest.project_id
      and c.assigned_counselor_id = private.current_project_member_id(
        customer_unit_interest.project_id,
        array['COUNSELOR']::public.project_member_role[]
      )
  )
);

create policy customer_unit_interest_update
on public.customer_unit_interest
for update
to authenticated
using (
  private.has_project_role(
    project_id,
    array['PROJECT_ADMIN']::public.project_member_role[]
  )
  or exists (
    select 1
    from public.customer as c
    where c.id = customer_unit_interest.customer_id
      and c.project_id = customer_unit_interest.project_id
      and c.assigned_counselor_id = private.current_project_member_id(
        customer_unit_interest.project_id,
        array['COUNSELOR']::public.project_member_role[]
      )
  )
)
with check (
  private.has_project_role(
    project_id,
    array['PROJECT_ADMIN']::public.project_member_role[]
  )
  or exists (
    select 1
    from public.customer as c
    where c.id = customer_unit_interest.customer_id
      and c.project_id = customer_unit_interest.project_id
      and c.assigned_counselor_id = private.current_project_member_id(
        customer_unit_interest.project_id,
        array['COUNSELOR']::public.project_member_role[]
      )
  )
);

create policy subscription_select
on public.subscription
for select
to authenticated
using (
  private.has_project_role(
    project_id,
    array['COUNSELOR', 'PROJECT_ADMIN']::public.project_member_role[]
  )
);

create policy subscription_insert
on public.subscription
for insert
to authenticated
with check (
  private.has_project_role(
    project_id,
    array['PROJECT_ADMIN']::public.project_member_role[]
  )
  or exists (
    select 1
    from public.customer as c
    where c.id = subscription.customer_id
      and c.project_id = subscription.project_id
      and c.assigned_counselor_id = private.current_project_member_id(
        subscription.project_id,
        array['COUNSELOR']::public.project_member_role[]
      )
  )
);

create policy subscription_update
on public.subscription
for update
to authenticated
using (
  private.has_project_role(
    project_id,
    array['PROJECT_ADMIN']::public.project_member_role[]
  )
  or exists (
    select 1
    from public.customer as c
    where c.id = subscription.customer_id
      and c.project_id = subscription.project_id
      and c.assigned_counselor_id = private.current_project_member_id(
        subscription.project_id,
        array['COUNSELOR']::public.project_member_role[]
      )
  )
)
with check (
  private.has_project_role(
    project_id,
    array['PROJECT_ADMIN']::public.project_member_role[]
  )
  or exists (
    select 1
    from public.customer as c
    where c.id = subscription.customer_id
      and c.project_id = subscription.project_id
      and c.assigned_counselor_id = private.current_project_member_id(
        subscription.project_id,
        array['COUNSELOR']::public.project_member_role[]
      )
  )
);

create policy contract_select
on public.contract
for select
to authenticated
using (
  private.has_project_role(
    project_id,
    array['COUNSELOR', 'PROJECT_ADMIN']::public.project_member_role[]
  )
);

create policy unit_occupancy_status_select
on public.unit_occupancy_status
for select
to authenticated
using (
  private.has_project_role(
    project_id,
    array['COUNSELOR', 'PROJECT_ADMIN']::public.project_member_role[]
  )
);

create policy contract_status_history_select
on public.contract_status_history
for select
to authenticated
using (
  private.has_project_role(
    project_id,
    array['COUNSELOR', 'PROJECT_ADMIN']::public.project_member_role[]
  )
);

create policy market_data_select
on public.market_data
for select
to authenticated
using (
  private.has_project_role(
    project_id,
    array['COUNSELOR', 'PROJECT_ADMIN']::public.project_member_role[]
  )
);

create policy market_data_insert
on public.market_data
for insert
to authenticated
with check (
  private.has_project_role(
    project_id,
    array['PROJECT_ADMIN']::public.project_member_role[]
  )
);

create policy market_data_update
on public.market_data
for update
to authenticated
using (
  private.has_project_role(
    project_id,
    array['PROJECT_ADMIN']::public.project_member_role[]
  )
)
with check (
  private.has_project_role(
    project_id,
    array['PROJECT_ADMIN']::public.project_member_role[]
  )
);

create policy report_template_select
on public.report_template
for select
to authenticated
using (
  exists (
    select 1
    from public.project as p
    where p.organization_id = report_template.organization_id
      and private.has_project_role(
        p.id,
        array['COUNSELOR', 'PROJECT_ADMIN']::public.project_member_role[]
      )
  )
  and (
    report_template.project_id is null
    or private.has_project_role(
      report_template.project_id,
      array['COUNSELOR', 'PROJECT_ADMIN']::public.project_member_role[]
    )
  )
);

create policy report_template_insert
on public.report_template
for insert
to authenticated
with check (
  project_id is not null
  and private.has_project_role(
    project_id,
    array['PROJECT_ADMIN']::public.project_member_role[]
  )
);

create policy report_template_update
on public.report_template
for update
to authenticated
using (
  project_id is not null
  and private.has_project_role(
    project_id,
    array['PROJECT_ADMIN']::public.project_member_role[]
  )
)
with check (
  project_id is not null
  and private.has_project_role(
    project_id,
    array['PROJECT_ADMIN']::public.project_member_role[]
  )
);

create policy report_select
on public.report
for select
to authenticated
using (
  private.has_project_role(
    project_id,
    array['COUNSELOR', 'PROJECT_ADMIN']::public.project_member_role[]
  )
);

create policy cs_ticket_select
on public.cs_ticket
for select
to authenticated
using (
  private.has_project_role(
    project_id,
    array['COUNSELOR', 'PROJECT_ADMIN']::public.project_member_role[]
  )
);

revoke all on table public.project_unit from public;
revoke all on table public.customer_unit_interest from public;
revoke all on table public.subscription from public;
revoke all on table public.contract from public;
revoke all on table public.unit_occupancy_status from public;
revoke all on table public.contract_status_history from public;
revoke all on table public.market_data from public;
revoke all on table public.report_template from public;
revoke all on table public.report from public;
revoke all on table public.cs_ticket from public;

do $priv$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on table public.project_unit from anon';
    execute 'revoke all on table public.customer_unit_interest from anon';
    execute 'revoke all on table public.subscription from anon';
    execute 'revoke all on table public.contract from anon';
    execute 'revoke all on table public.unit_occupancy_status from anon';
    execute 'revoke all on table public.contract_status_history from anon';
    execute 'revoke all on table public.market_data from anon';
    execute 'revoke all on table public.report_template from anon';
    execute 'revoke all on table public.report from anon';
    execute 'revoke all on table public.cs_ticket from anon';
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on table public.project_unit from authenticated';
    execute 'revoke all on table public.customer_unit_interest from authenticated';
    execute 'revoke all on table public.subscription from authenticated';
    execute 'revoke all on table public.contract from authenticated';
    execute 'revoke all on table public.unit_occupancy_status from authenticated';
    execute 'revoke all on table public.contract_status_history from authenticated';
    execute 'revoke all on table public.market_data from authenticated';
    execute 'revoke all on table public.report_template from authenticated';
    execute 'revoke all on table public.report from authenticated';
    execute 'revoke all on table public.cs_ticket from authenticated';

    execute 'grant select, insert, update on table public.project_unit to authenticated';
    execute 'grant select, insert, update on table public.customer_unit_interest to authenticated';
    execute 'grant select, insert, update on table public.subscription to authenticated';
    execute 'grant select, insert, update on table public.market_data to authenticated';
    execute 'grant select, insert, update on table public.report_template to authenticated';

    execute 'grant select on table public.contract to authenticated';
    execute 'grant select on table public.unit_occupancy_status to authenticated';
    execute 'grant select on table public.contract_status_history to authenticated';
    execute 'grant select on table public.report to authenticated';
    execute 'grant select on table public.cs_ticket to authenticated';
  end if;
end
$priv$;
