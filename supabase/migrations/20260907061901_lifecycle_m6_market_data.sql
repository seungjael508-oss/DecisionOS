create table public.market_data (
  market_data_id uuid primary key default gen_random_uuid(),
  project_id uuid not null
    references public.project (id)
    on delete restrict,
  data_scope varchar not null,
  complex_name varchar,
  period date not null,
  unit_type varchar,
  sale_listing_count integer,
  jeonse_listing_count integer,
  monthly_rent_listing_count integer,
  price_avg numeric,
  move_in_date date,
  move_in_units integer,
  source varchar,
  collected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (market_data_id, project_id),
  constraint market_data_scope_check
    check (data_scope in ('INTERNAL', 'COMPETITOR', 'REGION_TOTAL')),
  constraint market_data_complex_name_scope_check
    check (
      (
        data_scope = 'COMPETITOR'
        and complex_name is not null
        and complex_name <> ''
      )
      or (
        data_scope in ('INTERNAL', 'REGION_TOTAL')
        and complex_name is null
      )
    ),
  constraint market_data_period_month_start_check
    check (period = (date_trunc('month', period::timestamp)::date)),
  constraint market_data_unit_type_nonempty_check
    check (unit_type is null or unit_type <> ''),
  constraint market_data_sale_listing_count_check
    check (sale_listing_count is null or sale_listing_count >= 0),
  constraint market_data_jeonse_listing_count_check
    check (jeonse_listing_count is null or jeonse_listing_count >= 0),
  constraint market_data_monthly_rent_listing_count_check
    check (
      monthly_rent_listing_count is null
      or monthly_rent_listing_count >= 0
    ),
  constraint market_data_price_avg_check
    check (price_avg is null or price_avg >= 0),
  constraint market_data_move_in_units_check
    check (move_in_units is null or move_in_units >= 0)
);

create unique index uq_market_data_scoped_type
  on public.market_data (project_id, data_scope, period, unit_type)
  where complex_name is null
    and unit_type is not null;

create unique index uq_market_data_scoped_all_types
  on public.market_data (project_id, data_scope, period)
  where complex_name is null
    and unit_type is null;

create unique index uq_market_data_competitor_type
  on public.market_data (
    project_id,
    data_scope,
    period,
    unit_type,
    complex_name
  )
  where complex_name is not null
    and unit_type is not null;

create unique index uq_market_data_competitor_all_types
  on public.market_data (project_id, data_scope, period, complex_name)
  where complex_name is not null
    and unit_type is null;

create index idx_market_data_project_period
  on public.market_data (project_id, period desc);

create trigger set_updated_at
  before update on public.market_data
  for each row
  execute function private.set_updated_at();

-- Phase 1 pattern: revoke client roles. Unlike Phase 1 tables, do not grant
-- SELECT. Enable RLS with no policies so even a later GRANT is deny-by-default.
revoke all on table public.market_data from public;

do $priv$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on table public.market_data from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on table public.market_data from authenticated';
  end if;
end
$priv$;

alter table public.market_data enable row level security;
