begin;

select no_plan();

select has_table('public'::name, 'market_data'::name);
select col_is_pk('public'::name, 'market_data'::name, 'market_data_id'::name);
select col_not_null('public'::name, 'market_data'::name, 'project_id'::name);
select col_not_null('public'::name, 'market_data'::name, 'data_scope'::name);
select col_not_null('public'::name, 'market_data'::name, 'period'::name);
select col_is_null('public'::name, 'market_data'::name, 'unit_type'::name);
select col_is_null('public'::name, 'market_data'::name, 'sale_listing_count'::name);
select col_is_null('public'::name, 'market_data'::name, 'jeonse_listing_count'::name);
select col_is_null('public'::name, 'market_data'::name, 'monthly_rent_listing_count'::name);
select col_is_null('public'::name, 'market_data'::name, 'transaction_count'::name);
select col_is_null('public'::name, 'market_data'::name, 'price_avg'::name);
select col_is_null('public'::name, 'market_data'::name, 'source'::name);
select col_default_is(
  'public'::name, 'market_data'::name, 'collected_at'::name, 'now()',
  'collected_at default'
);
select col_default_is(
  'public'::name, 'market_data'::name, 'created_at'::name, 'now()',
  'created_at default'
);
select hasnt_column('public'::name, 'market_data'::name, 'updated_at'::name);
select hasnt_trigger('public'::name, 'market_data'::name, 'set_updated_at'::name);

select has_enum('public'::name, 'market_data_scope'::name);
select enum_has_labels(
  'public'::name,
  'market_data_scope'::name,
  array['INTERNAL', 'COMPETITOR', 'REGION_TOTAL']::text[]
);
select col_type_is(
  'public'::name, 'market_data'::name, 'data_scope'::name, 'market_data_scope'
);

select has_index(
  'public'::name,
  'market_data'::name,
  'idx_market_data_project_period'::name,
  array['project_id', 'period']::name[]
);
select has_index(
  'public'::name,
  'market_data'::name,
  'idx_market_data_project_complex_period'::name,
  array['project_id', 'complex_name', 'period']::name[]
);
select has_index(
  'public'::name,
  'market_data'::name,
  'idx_market_data_project_unit_type_period'::name,
  array['project_id', 'unit_type', 'period']::name[]
);
select has_index(
  'public'::name,
  'market_data'::name,
  'idx_market_data_project_scope_period'::name,
  array['project_id', 'data_scope', 'period']::name[]
);

select lives_ok(
  $$
    insert into public.market_data (
      project_id, data_scope, period, unit_type, sale_listing_count
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'INTERNAL',
      '2026-09-01',
      '84A',
      12
    );
  $$,
  'INTERNAL insert succeeds'
);

select lives_ok(
  $$
    insert into public.market_data (
      project_id, data_scope, complex_name, period, unit_type
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'COMPETITOR',
      '동문',
      '2026-09-01',
      '84A'
    );
  $$,
  'COMPETITOR with complex_name succeeds'
);

select lives_ok(
  $$
    insert into public.market_data (
      project_id, data_scope, period
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'REGION_TOTAL',
      '2026-09-01'
    );
  $$,
  'REGION_TOTAL insert succeeds'
);

select lives_ok(
  $$
    insert into public.market_data (
      project_id, data_scope, period, unit_type
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'INTERNAL',
      '2026-10-01',
      null
    );
  $$,
  'unit_type NULL aggregate row succeeds'
);

select lives_ok(
  $$
    insert into public.market_data (
      project_id, data_scope, period, unit_type, sale_listing_count
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'INTERNAL',
      '2026-10-01',
      '59',
      0
    );
  $$,
  'typed unit_type row and zero count succeed'
);

select lives_ok(
  $$
    insert into public.market_data (
      project_id, data_scope, period
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'INTERNAL',
      '2026-11-01'
    );
  $$,
  'all count columns NULL succeeds'
);

select lives_ok(
  $$
    insert into public.market_data (
      project_id, data_scope, complex_name, period, unit_type, source
    ) values
      (
        '20000000-0000-4000-8000-000000000001',
        'COMPETITOR',
        '동문',
        '2026-09-01',
        '84A',
        '네이버부동산'
      ),
      (
        '20000000-0000-4000-8000-000000000001',
        'COMPETITOR',
        '동문',
        '2026-09-01',
        '84A',
        '현장조사'
      );
  $$,
  'duplicate project/month/complex/unit_type rows are allowed'
);

select lives_ok(
  $$
    insert into public.market_data (
      project_id, data_scope, period
    ) values (
      '20000000-0000-4000-8000-000000000002',
      'REGION_TOTAL',
      '2026-09-01'
    );
  $$,
  'other project can store the same market period independently'
);

select lives_ok(
  $$
    insert into public.market_data (
      project_id, data_scope, period, complex_name
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'INTERNAL',
      '2026-12-01',
      '화양 푸르지오'
    );
  $$,
  'INTERNAL may include complex_name'
);

select throws_ok(
  $$
    insert into public.market_data (
      project_id, data_scope, period
    ) values (
      '20000000-0000-4000-8000-000000000099',
      'INTERNAL',
      '2026-09-01'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.market_data (
      project_id, data_scope, period
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'COMPETITOR',
      '2026-09-01'
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.market_data (
      project_id, data_scope, complex_name, period
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'COMPETITOR',
      '',
      '2026-09-01'
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.market_data (
      project_id, data_scope, complex_name, period
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'COMPETITOR',
      '   ',
      '2026-09-01'
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.market_data (
      project_id, data_scope, period
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'INTERNAL',
      '2026-09-15'
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.market_data (
      project_id, data_scope, period
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'INTERNAL',
      '2026-09-30'
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.market_data (
      project_id, data_scope, period, sale_listing_count
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'INTERNAL',
      '2026-09-01',
      -1
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.market_data (
      project_id, data_scope, period, jeonse_listing_count
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'INTERNAL',
      '2026-09-01',
      -1
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.market_data (
      project_id, data_scope, period, monthly_rent_listing_count
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'INTERNAL',
      '2026-09-01',
      -1
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.market_data (
      project_id, data_scope, period, transaction_count
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'INTERNAL',
      '2026-09-01',
      -1
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.market_data (
      project_id, data_scope, period, move_in_units
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'INTERNAL',
      '2026-09-01',
      -1
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.market_data (
      project_id, data_scope, period, price_avg
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'INTERNAL',
      '2026-09-01',
      -1
    );
  $$,
  '23514'
);

select lives_ok(
  $$
    insert into public.market_data (
      project_id, data_scope, period, source, collected_at
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'INTERNAL',
      '2026-09-01',
      '국토부실거래',
      '2026-09-18 14:20:00+09'
    );
  $$,
  'source string and later collected_at succeed'
);

select lives_ok(
  $$
    insert into public.market_data (
      project_id, data_scope, period, source, collected_at
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'INTERNAL',
      '2026-09-01',
      null,
      '2026-09-20 09:00:00+09'
    );
  $$,
  'source NULL and second collected_at for same period succeed'
);

select * from finish();
rollback;
