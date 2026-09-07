begin;

select no_plan();

do $roles$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
end
$roles$;

select has_table('public'::name, 'market_data'::name);
select col_is_pk('public'::name, 'market_data'::name, 'market_data_id'::name);
select col_not_null('public'::name, 'market_data'::name, 'project_id'::name);
select col_not_null('public'::name, 'market_data'::name, 'data_scope'::name);
select col_not_null('public'::name, 'market_data'::name, 'period'::name);
select col_is_null('public'::name, 'market_data'::name, 'complex_name'::name);
select col_is_null('public'::name, 'market_data'::name, 'unit_type'::name);
select col_is_null('public'::name, 'market_data'::name, 'move_in_date'::name);
select col_is_null('public'::name, 'market_data'::name, 'move_in_units'::name);
select col_is_unique(
  'public'::name,
  'market_data'::name,
  array['market_data_id', 'project_id']::name[]
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
  'uq_market_data_scoped_type'::name
);
select has_index(
  'public'::name,
  'market_data'::name,
  'uq_market_data_scoped_all_types'::name
);
select has_index(
  'public'::name,
  'market_data'::name,
  'uq_market_data_competitor_type'::name
);
select has_index(
  'public'::name,
  'market_data'::name,
  'uq_market_data_competitor_all_types'::name
);
select has_trigger('public'::name, 'market_data'::name, 'set_updated_at'::name);

select ok(
  (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'market_data'
  ),
  'market_data has RLS enabled'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public' and tablename = 'market_data'
  ),
  0,
  'market_data has no RLS policies'
);

select ok(
  not exists (
    select 1 from pg_roles where rolname = 'anon'
  )
  or not has_table_privilege('anon', 'public.market_data', 'SELECT'),
  'anon cannot select market_data'
);

select ok(
  not exists (
    select 1 from pg_roles where rolname = 'anon'
  )
  or (
    not has_table_privilege('anon', 'public.market_data', 'INSERT')
    and not has_table_privilege('anon', 'public.market_data', 'UPDATE')
    and not has_table_privilege('anon', 'public.market_data', 'DELETE')
  ),
  'anon cannot write market_data'
);

select ok(
  not exists (
    select 1 from pg_roles where rolname = 'authenticated'
  )
  or (
    not has_table_privilege('authenticated', 'public.market_data', 'SELECT')
    and not has_table_privilege('authenticated', 'public.market_data', 'INSERT')
    and not has_table_privilege('authenticated', 'public.market_data', 'UPDATE')
    and not has_table_privilege('authenticated', 'public.market_data', 'DELETE')
  ),
  'authenticated cannot directly access market_data'
);

select throws_ok(
  $$
    set local role authenticated;
    select 1 from public.market_data;
  $$,
  '42501'
);

select throws_ok(
  $$
    set local role anon;
    select 1 from public.market_data;
  $$,
  '42501'
);

reset role;

select lives_ok(
  $$
    insert into public.market_data (
      project_id, data_scope, period, unit_type, sale_listing_count
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'INTERNAL',
      '2026-09-01',
      '84',
      12
    );
  $$,
  'INTERNAL typed row succeeds'
);

select lives_ok(
  $$
    insert into public.market_data (
      project_id, data_scope, period, unit_type, sale_listing_count
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'INTERNAL',
      '2026-09-01',
      null,
      40
    );
  $$,
  'INTERNAL unit_type NULL aggregate succeeds'
);

select lives_ok(
  $$
    insert into public.market_data (
      project_id, data_scope, period, unit_type
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'REGION_TOTAL',
      '2026-09-01',
      null
    );
  $$,
  'REGION_TOTAL aggregate can coexist with INTERNAL'
);

select lives_ok(
  $$
    insert into public.market_data (
      project_id, data_scope, complex_name, period, unit_type,
      move_in_date, move_in_units
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'COMPETITOR',
      'Dongmun',
      '2026-09-01',
      '84',
      '2026-11-01',
      700
    );
  $$,
  'COMPETITOR typed row succeeds'
);

select lives_ok(
  $$
    insert into public.market_data (
      project_id, data_scope, complex_name, period, unit_type, move_in_date
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'COMPETITOR',
      'Dongmun',
      '2026-09-01',
      null,
      '2026-11-01'
    );
  $$,
  'COMPETITOR unit_type NULL aggregate succeeds'
);

select lives_ok(
  $$
    insert into public.market_data (
      project_id, data_scope, period, move_in_date, move_in_units
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'INTERNAL',
      '2026-10-01',
      '2026-11-15',
      10
    );
  $$,
  'INTERNAL may store move_in_date without scope restriction'
);

select lives_ok(
  $$
    insert into public.market_data (
      project_id, data_scope, complex_name, period, unit_type
    ) values (
      '20000000-0000-4000-8000-000000000002',
      'COMPETITOR',
      'Dongmun',
      '2026-09-01',
      '84'
    );
  $$,
  'other project may store the same competitor month'
);

select throws_ok(
  $$
    insert into public.market_data (
      project_id, data_scope, period, unit_type
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'INTERNAL',
      '2026-09-01',
      '84'
    );
  $$,
  '23505'
);

select throws_ok(
  $$
    insert into public.market_data (
      project_id, data_scope, period, unit_type
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'INTERNAL',
      '2026-09-01',
      null
    );
  $$,
  '23505'
);

select throws_ok(
  $$
    insert into public.market_data (
      project_id, data_scope, complex_name, period, unit_type
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'COMPETITOR',
      'Dongmun',
      '2026-09-01',
      '84'
    );
  $$,
  '23505'
);

select throws_ok(
  $$
    insert into public.market_data (
      project_id, data_scope, complex_name, period, unit_type
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'COMPETITOR',
      'Dongmun',
      '2026-09-01',
      null
    );
  $$,
  '23505'
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
      'UNKNOWN_SCOPE',
      '2026-09-01'
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.market_data (
      project_id, data_scope, period, complex_name
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'COMPETITOR',
      '2026-09-01',
      null
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.market_data (
      project_id, data_scope, period, complex_name
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'COMPETITOR',
      '2026-09-01',
      ''
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.market_data (
      project_id, data_scope, period, complex_name
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'INTERNAL',
      '2026-09-01',
      'ShouldNotHaveName'
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.market_data (
      project_id, data_scope, period, unit_type
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'INTERNAL',
      '2026-11-01',
      ''
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
      '2026-12-01',
      -1
    );
  $$,
  '23514'
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

select * from finish();
rollback;
