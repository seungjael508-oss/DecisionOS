-- M7: report_template + report snapshot ledger.
-- No RLS, RPC, immutability trigger, or generate_report().

-- Composite parent key for organization/project template FK.
-- Phase 1 project PK is id only; do not rewrite phase1_schema.sql.
alter table public.project
  add constraint project_id_organization_id_key
  unique (id, organization_id);

create table public.report_template (
  template_id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organization (id)
    on delete restrict,
  project_id uuid,
  report_phase public.report_phase not null,
  report_type public.report_type not null,
  name varchar not null,
  template_definition jsonb not null,
  mapping_definition jsonb not null,
  source_type public.report_template_source_type not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (project_id, organization_id)
    references public.project (id, organization_id)
    on delete restrict,
  constraint report_template_name_nonempty_check
    check (btrim(name) <> '')
);

create index idx_report_template_org_active
  on public.report_template (organization_id, active);

create index idx_report_template_project_phase_type
  on public.report_template (project_id, report_phase, report_type);

create trigger set_updated_at
  before update on public.report_template
  for each row
  execute function private.set_updated_at();

create table public.report (
  report_id uuid primary key default gen_random_uuid(),
  project_id uuid not null
    references public.project (id)
    on delete restrict,
  template_id uuid
    references public.report_template (template_id)
    on delete restrict,
  report_phase public.report_phase not null,
  report_type public.report_type not null,
  report_date date not null,
  generated_data jsonb not null,
  version integer not null default 1,
  supersedes_report_id uuid,
  generated_at timestamptz not null default now(),
  generated_by uuid not null,
  created_at timestamptz not null default now(),
  unique (report_id, project_id),
  foreign key (generated_by, project_id)
    references public.project_member (id, project_id)
    on delete restrict,
  foreign key (supersedes_report_id, project_id)
    references public.report (report_id, project_id)
    on delete restrict,
  constraint report_version_positive_check
    check (version >= 1),
  constraint report_supersedes_not_self_check
    check (
      supersedes_report_id is null
      or supersedes_report_id <> report_id
    )
);

create index idx_report_project_date
  on public.report (project_id, report_date desc);

create index idx_report_project_type_date
  on public.report (project_id, report_type, report_date desc);

create index idx_report_project_phase_date
  on public.report (project_id, report_phase, report_date desc);

create index idx_report_supersedes
  on public.report (supersedes_report_id);
