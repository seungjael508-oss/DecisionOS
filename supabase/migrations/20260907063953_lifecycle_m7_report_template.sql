create or replace function private.prevent_final_report_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'FINAL' then
    if new.status is distinct from old.status
      or new.project_id is distinct from old.project_id
      or new.report_template_id is distinct from old.report_template_id
      or new.report_type is distinct from old.report_type
      or new.period_start is distinct from old.period_start
      or new.period_end is distinct from old.period_end
      or new.content is distinct from old.content
      or new.generated_by is distinct from old.generated_by
      or new.generated_at is distinct from old.generated_at
      or new.finalized_by is distinct from old.finalized_by
      or new.finalized_at is distinct from old.finalized_at
    then
      raise exception 'FINAL report key fields are immutable'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.prevent_final_report_mutation()
  from public;

do $fnpriv$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on function private.prevent_final_report_mutation() from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on function private.prevent_final_report_mutation() from authenticated';
  end if;
end
$fnpriv$;

create table public.report_template (
  report_template_id uuid primary key default gen_random_uuid(),
  project_id uuid not null
    references public.project (id)
    on delete restrict,
  name varchar not null check (name <> ''),
  report_type public.report_type not null,
  template_schema jsonb not null default '{"sections":[]}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (report_template_id, project_id)
);

create index idx_report_template_project_active
  on public.report_template (project_id, is_active);

create trigger set_updated_at
  before update on public.report_template
  for each row
  execute function private.set_updated_at();

create table public.report (
  report_id uuid primary key default gen_random_uuid(),
  project_id uuid not null
    references public.project (id)
    on delete restrict,
  report_template_id uuid not null,
  report_type public.report_type not null,
  period_start date not null,
  period_end date not null,
  title varchar not null check (title <> ''),
  content jsonb not null default '{}'::jsonb,
  status varchar not null default 'DRAFT',
  generated_at timestamptz not null default now(),
  generated_by uuid not null,
  finalized_at timestamptz,
  finalized_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (report_id, project_id),
  foreign key (report_template_id, project_id)
    references public.report_template (report_template_id, project_id)
    on delete restrict,
  foreign key (generated_by, project_id)
    references public.project_member (id, project_id)
    on delete restrict,
  foreign key (finalized_by, project_id)
    references public.project_member (id, project_id)
    on delete restrict,
  constraint report_status_check
    check (status in ('DRAFT', 'FINAL')),
  constraint report_period_order_check
    check (period_start <= period_end),
  constraint report_finalization_check
    check (
      (
        status = 'DRAFT'
        and finalized_at is null
        and finalized_by is null
      )
      or (
        status = 'FINAL'
        and finalized_at is not null
        and finalized_by is not null
        and content <> '{}'::jsonb
      )
    )
);

create unique index uq_report_final_template_period
  on public.report (
    project_id,
    report_template_id,
    period_start,
    period_end
  )
  where status = 'FINAL';

create index idx_report_project_period
  on public.report (project_id, period_start desc);

create index idx_report_project_template_period
  on public.report (project_id, report_template_id, period_start desc);

create trigger prevent_final_report_mutation
  before update on public.report
  for each row
  execute function private.prevent_final_report_mutation();

create trigger set_updated_at
  before update on public.report
  for each row
  execute function private.set_updated_at();

revoke all on table public.report_template from public;
revoke all on table public.report from public;

do $priv$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on table public.report_template from anon';
    execute 'revoke all on table public.report from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on table public.report_template from authenticated';
    execute 'revoke all on table public.report from authenticated';
  end if;
end
$priv$;

alter table public.report_template enable row level security;
alter table public.report enable row level security;
