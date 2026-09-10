create or replace function private.current_project_member_id(
  p_project_id uuid,
  p_allowed_roles public.project_member_role[]
)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select pm.id
  from public.project_member as pm
  inner join public.project as p
    on p.id = pm.project_id
  inner join public.organization as o
    on o.id = p.organization_id
  where pm.project_id = p_project_id
    and pm.user_id = auth.uid()
    and pm.active = true
    and p.status = 'ACTIVE'::public.project_status
    and o.status = 'ACTIVE'::public.organization_status
    and pm.role = any (p_allowed_roles)
    and pm.role in (
      'COUNSELOR'::public.project_member_role,
      'PROJECT_ADMIN'::public.project_member_role
    )
  limit 1;
$$;

create or replace function private.has_project_role(
  p_project_id uuid,
  p_allowed_roles public.project_member_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.current_project_member_id(p_project_id, p_allowed_roles) is not null;
$$;

revoke all on function private.current_project_member_id(uuid, public.project_member_role[])
  from public, anon, authenticated;
revoke all on function private.has_project_role(uuid, public.project_member_role[])
  from public, anon, authenticated;
revoke all on function private.set_updated_at()
  from public, anon, authenticated;

grant execute on function private.current_project_member_id(uuid, public.project_member_role[])
  to authenticated;
grant execute on function private.has_project_role(uuid, public.project_member_role[])
  to authenticated;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

revoke all on table public.organization from public, anon, authenticated;
revoke all on table public.project from public, anon, authenticated;
revoke all on table public.project_member from public, anon, authenticated;
revoke all on table public.customer from public, anon, authenticated;
revoke all on table public.consultation from public, anon, authenticated;
revoke all on table public.customer_status_log from public, anon, authenticated;

grant select on table public.organization to authenticated;
grant select on table public.project to authenticated;
grant select on table public.project_member to authenticated;
grant select on table public.customer to authenticated;
grant select on table public.consultation to authenticated;
grant select on table public.customer_status_log to authenticated;

alter table public.organization enable row level security;
alter table public.project enable row level security;
alter table public.project_member enable row level security;
alter table public.customer enable row level security;
alter table public.consultation enable row level security;
alter table public.customer_status_log enable row level security;

create policy organization_select
on public.organization
for select
to authenticated
using (
  exists (
    select 1
    from public.project as p
    where p.organization_id = organization.id
      and private.has_project_role(
        p.id,
        array['COUNSELOR', 'PROJECT_ADMIN']::public.project_member_role[]
      )
  )
);

create policy project_select
on public.project
for select
to authenticated
using (
  private.has_project_role(
    id,
    array['COUNSELOR', 'PROJECT_ADMIN']::public.project_member_role[]
  )
);

create policy project_member_select
on public.project_member
for select
to authenticated
using (
  id = private.current_project_member_id(
    project_id,
    array['COUNSELOR']::public.project_member_role[]
  )
  or private.has_project_role(
    project_id,
    array['PROJECT_ADMIN']::public.project_member_role[]
  )
);

create policy customer_select
on public.customer
for select
to authenticated
using (
  assigned_counselor_id = private.current_project_member_id(
    project_id,
    array['COUNSELOR']::public.project_member_role[]
  )
  or private.has_project_role(
    project_id,
    array['PROJECT_ADMIN']::public.project_member_role[]
  )
);

create policy consultation_select
on public.consultation
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
    where c.id = consultation.customer_id
      and c.project_id = consultation.project_id
      and c.assigned_counselor_id = private.current_project_member_id(
        consultation.project_id,
        array['COUNSELOR']::public.project_member_role[]
      )
  )
);

create policy customer_status_log_select
on public.customer_status_log
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
    where c.id = customer_status_log.customer_id
      and c.project_id = customer_status_log.project_id
      and c.assigned_counselor_id = private.current_project_member_id(
        customer_status_log.project_id,
        array['COUNSELOR']::public.project_member_role[]
      )
  )
);
