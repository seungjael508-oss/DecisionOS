begin;

select no_plan();

-- p1 20000000-0000-4000-8000-000000000001
-- p2 20000000-0000-4000-8000-000000000002
-- counselor p1 40000000-0000-4000-8000-00000000000a
-- counselor p2 40000000-0000-4000-8000-00000000000b

insert into public.project_unit (unit_id, project_id, building_no, unit_no)
values
  (
    '70000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '101',
    '1001'
  ),
  (
    '70000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    '101',
    '1002'
  ),
  (
    '70000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000002',
    '101',
    '1001'
  );

insert into public.customer (id, project_id, name, phone, phone_normalized)
values
  (
    '51000000-0000-4000-8000-0000000000c1',
    '20000000-0000-4000-8000-000000000001',
    'Interest Customer 1',
    '01060000001',
    '01060000001'
  ),
  (
    '51000000-0000-4000-8000-0000000000c2',
    '20000000-0000-4000-8000-000000000001',
    'Interest Customer 2',
    '01060000002',
    '01060000002'
  ),
  (
    '51000000-0000-4000-8000-0000000000c3',
    '20000000-0000-4000-8000-000000000002',
    'Interest Customer 3',
    '01060000003',
    '01060000003'
  );

select has_table('public'::name, 'customer_unit_interest'::name);
select has_pk('public'::name, 'customer_unit_interest'::name);
select col_is_pk(
  'public'::name,
  'customer_unit_interest'::name,
  'interest_id'::name
);
select col_default_is(
  'public'::name,
  'customer_unit_interest'::name,
  'interest_id'::name,
  'gen_random_uuid()',
  'interest_id uses gen_random_uuid()'
);

select col_type_is(
  'public'::name,
  'customer_unit_interest'::name,
  'current_status'::name,
  'customer_unit_interest_status'
);
select col_not_null(
  'public'::name,
  'customer_unit_interest'::name,
  'current_status'::name
);
select col_default_is(
  'public'::name,
  'customer_unit_interest'::name,
  'current_status'::name,
  'ACTIVE',
  'current_status defaults to ACTIVE'
);

select col_is_null(
  'public'::name,
  'customer_unit_interest'::name,
  'interest_level'::name
);
select col_is_null(
  'public'::name,
  'customer_unit_interest'::name,
  'interest_reason'::name
);
select col_is_null(
  'public'::name,
  'customer_unit_interest'::name,
  'assigned_counselor_id'::name
);

select has_trigger(
  'public'::name,
  'customer_unit_interest'::name,
  'set_updated_at'::name
);

select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public'
      and rel.relname = 'customer_unit_interest'
      and c.contype = 'u'
      and pg_get_constraintdef(c.oid)
        = 'UNIQUE (project_id, customer_id, unit_id)'
  ),
  'UNIQUE (project_id, customer_id, unit_id)'
);

select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public'
      and rel.relname = 'customer_unit_interest'
      and c.contype = 'f'
      and pg_get_constraintdef(c.oid)
        ilike '%FOREIGN KEY (customer_id, project_id) REFERENCES customer(id, project_id)%'
      and pg_get_constraintdef(c.oid) ilike '%ON DELETE RESTRICT%'
      and pg_get_constraintdef(c.oid) not ilike '%ON DELETE CASCADE%'
  ),
  'composite FK to customer(id, project_id) ON DELETE RESTRICT'
);

select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public'
      and rel.relname = 'customer_unit_interest'
      and c.contype = 'f'
      and pg_get_constraintdef(c.oid)
        ilike '%FOREIGN KEY (project_id, unit_id) REFERENCES project_unit(project_id, unit_id)%'
      and pg_get_constraintdef(c.oid) ilike '%ON DELETE RESTRICT%'
      and pg_get_constraintdef(c.oid) not ilike '%ON DELETE CASCADE%'
  ),
  'composite FK to project_unit(project_id, unit_id) ON DELETE RESTRICT'
);

select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public'
      and rel.relname = 'customer_unit_interest'
      and c.contype = 'f'
      and pg_get_constraintdef(c.oid)
        ilike '%FOREIGN KEY (assigned_counselor_id, project_id) REFERENCES project_member(id, project_id)%'
      and pg_get_constraintdef(c.oid) ilike '%ON DELETE RESTRICT%'
      and pg_get_constraintdef(c.oid) not ilike '%ON DELETE CASCADE%'
  ),
  'composite FK to project_member(id, project_id) ON DELETE RESTRICT'
);

select has_index(
  'public'::name,
  'customer_unit_interest'::name,
  'idx_cui_project_status'::name,
  array['project_id', 'current_status']::name[]
);

select has_index(
  'public'::name,
  'customer_unit_interest'::name,
  'idx_cui_project_unit_level'::name,
  array['project_id', 'unit_id', 'interest_level']::name[]
);

select is(
  (
    select count(*)::integer
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'customer_unit_interest'
      and indexdef like '%(project_id, customer_id)%'
      and indexdef not like '%unit_id%'
  ),
  0,
  'no extra index duplicating UNIQUE prefix (project_id, customer_id)'
);

select hasnt_table('public'::name, 'market_data'::name);
select hasnt_table('public'::name, 'report_template'::name);
select hasnt_function('public'::name, 'upsert_customer_unit_interest'::name);

-- Happy path
select lives_ok(
  $$
    insert into public.customer_unit_interest (
      project_id, customer_id, unit_id
    )
    values (
      '20000000-0000-4000-8000-000000000001',
      '51000000-0000-4000-8000-0000000000c1',
      '70000000-0000-4000-8000-000000000001'
    );
  $$,
  'same-project customer and unit interest insert succeeds'
);

select lives_ok(
  $$
    insert into public.customer_unit_interest (
      project_id, customer_id, unit_id
    )
    values (
      '20000000-0000-4000-8000-000000000001',
      '51000000-0000-4000-8000-0000000000c1',
      '70000000-0000-4000-8000-000000000002'
    );
  $$,
  'same customer can interest a different unit'
);

select lives_ok(
  $$
    insert into public.customer_unit_interest (
      project_id, customer_id, unit_id
    )
    values (
      '20000000-0000-4000-8000-000000000001',
      '51000000-0000-4000-8000-0000000000c2',
      '70000000-0000-4000-8000-000000000001'
    );
  $$,
  'same unit can have a different customer interest'
);

select lives_ok(
  $$
    insert into public.customer_unit_interest (
      project_id,
      customer_id,
      unit_id,
      interest_level,
      interest_reason
    )
    values (
      '20000000-0000-4000-8000-000000000002',
      '51000000-0000-4000-8000-0000000000c3',
      '70000000-0000-4000-8000-000000000003',
      null,
      null
    );
  $$,
  'interest_level and interest_reason are nullable'
);

select is(
  (
    select current_status::text
    from public.customer_unit_interest
    where customer_id = '51000000-0000-4000-8000-0000000000c1'
      and unit_id = '70000000-0000-4000-8000-000000000001'
  ),
  'ACTIVE',
  'default current_status is ACTIVE'
);

select ok(
  (
    select first_interested_at is not null
      and last_interested_at is not null
    from public.customer_unit_interest
    where customer_id = '51000000-0000-4000-8000-0000000000c1'
      and unit_id = '70000000-0000-4000-8000-000000000001'
  ),
  'first_interested_at and last_interested_at are set'
);

-- Tenant / IDOR
select throws_ok(
  $$
    insert into public.customer_unit_interest (
      project_id, customer_id, unit_id
    )
    values (
      '20000000-0000-4000-8000-000000000001',
      '51000000-0000-4000-8000-0000000000c1',
      '70000000-0000-4000-8000-000000000003'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.customer_unit_interest (
      project_id, customer_id, unit_id
    )
    values (
      '20000000-0000-4000-8000-000000000002',
      '51000000-0000-4000-8000-0000000000c1',
      '70000000-0000-4000-8000-000000000003'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.customer_unit_interest (
      project_id, customer_id, unit_id
    )
    values (
      '20000000-0000-4000-8000-000000000001',
      '51000000-0000-4000-8000-0000000000c3',
      '70000000-0000-4000-8000-000000000001'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.customer_unit_interest (
      project_id,
      customer_id,
      unit_id,
      assigned_counselor_id
    )
    values (
      '20000000-0000-4000-8000-000000000001',
      '51000000-0000-4000-8000-0000000000c2',
      '70000000-0000-4000-8000-000000000002',
      '40000000-0000-4000-8000-00000000000b'
    );
  $$,
  '23503'
);

select lives_ok(
  $$
    insert into public.customer_unit_interest (
      project_id,
      customer_id,
      unit_id,
      assigned_counselor_id
    )
    values (
      '20000000-0000-4000-8000-000000000001',
      '51000000-0000-4000-8000-0000000000c2',
      '70000000-0000-4000-8000-000000000002',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  'same-project counselor assignment succeeds'
);

-- Duplicate vs other-project independence
select throws_ok(
  $$
    insert into public.customer_unit_interest (
      project_id, customer_id, unit_id
    )
    values (
      '20000000-0000-4000-8000-000000000001',
      '51000000-0000-4000-8000-0000000000c1',
      '70000000-0000-4000-8000-000000000001'
    );
  $$,
  '23505'
);

select is(
  (
    select count(*)::integer
    from public.customer_unit_interest
    where (customer_id, unit_id) in (
      (
        '51000000-0000-4000-8000-0000000000c1',
        '70000000-0000-4000-8000-000000000001'
      ),
      (
        '51000000-0000-4000-8000-0000000000c3',
        '70000000-0000-4000-8000-000000000003'
      )
    )
  ),
  2,
  'same building/unit numbers in different projects remain independent'
);

-- Missing parents
select throws_ok(
  $$
    insert into public.customer_unit_interest (
      project_id, customer_id, unit_id
    )
    values (
      '20000000-0000-4000-8000-000000000001',
      '51000000-0000-4000-8000-000000000099',
      '70000000-0000-4000-8000-000000000001'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.customer_unit_interest (
      project_id, customer_id, unit_id
    )
    values (
      '20000000-0000-4000-8000-000000000001',
      '51000000-0000-4000-8000-0000000000c1',
      '70000000-0000-4000-8000-000000000099'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.customer_unit_interest (
      project_id, customer_id, unit_id
    )
    values (
      '20000000-0000-4000-8000-000000000099',
      '51000000-0000-4000-8000-0000000000c1',
      '70000000-0000-4000-8000-000000000001'
    );
  $$,
  '23503'
);

-- Restrict delete: interest must remain
select throws_ok(
  $$
    delete from public.customer
    where id = '51000000-0000-4000-8000-0000000000c1';
  $$,
  '23503'
);

select is(
  (
    select count(*)::integer
    from public.customer_unit_interest
    where customer_id = '51000000-0000-4000-8000-0000000000c1'
      and unit_id = '70000000-0000-4000-8000-000000000001'
  ),
  1,
  'customer delete does not cascade-remove interest'
);

select throws_ok(
  $$
    delete from public.project_unit
    where unit_id = '70000000-0000-4000-8000-000000000001';
  $$,
  '23503'
);

select is(
  (
    select count(*)::integer
    from public.customer_unit_interest
    where unit_id = '70000000-0000-4000-8000-000000000001'
      and customer_id = '51000000-0000-4000-8000-0000000000c1'
  ),
  1,
  'unit delete does not cascade-remove interest'
);

select * from finish();
rollback;
