-- MARKET_DATA is a collected market ledger, not occupancy/contract source of truth.
-- No updated_at: a new collection creates a new row.

create type public.market_data_scope as enum (
  'INTERNAL',
  'COMPETITOR',
  'REGION_TOTAL'
);

create table public.market_data (
  market_data_id uuid primary key default gen_random_uuid(),
  project_id uuid not null
    references public.project (id)
    on delete restrict,
  data_scope public.market_data_scope not null,
  complex_name varchar,
  period date not null,
  unit_type varchar,
  sale_listing_count integer,
  jeonse_listing_count integer,
  monthly_rent_listing_count integer,
  price_avg numeric,
  transaction_count integer,
  move_in_date date,
  move_in_units integer,
  source varchar,
  collected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint market_data_competitor_complex_name_check
    check (
      data_scope <> 'COMPETITOR'::public.market_data_scope
      or (
        complex_name is not null
        and btrim(complex_name) <> ''
      )
    ),
  constraint market_data_period_month_start_check
    check (period = (date_trunc('month', period)::date)),
  constraint market_data_sale_listing_count_check
    check (sale_listing_count is null or sale_listing_count >= 0),
  constraint market_data_jeonse_listing_count_check
    check (jeonse_listing_count is null or jeonse_listing_count >= 0),
  constraint market_data_monthly_rent_listing_count_check
    check (
      monthly_rent_listing_count is null
      or monthly_rent_listing_count >= 0
    ),
  constraint market_data_transaction_count_check
    check (transaction_count is null or transaction_count >= 0),
  constraint market_data_move_in_units_check
    check (move_in_units is null or move_in_units >= 0),
  constraint market_data_price_avg_check
    check (price_avg is null or price_avg >= 0)
);

create index idx_market_data_project_period
  on public.market_data (project_id, period);

create index idx_market_data_project_complex_period
  on public.market_data (project_id, complex_name, period);

create index idx_market_data_project_unit_type_period
  on public.market_data (project_id, unit_type, period);

create index idx_market_data_project_scope_period
  on public.market_data (project_id, data_scope, period);
