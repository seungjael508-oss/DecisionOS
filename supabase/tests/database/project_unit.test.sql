begin;

select no_plan();

-- Seed projects from supabase/seed.sql
-- p1 20000000-0000-4000-8000-000000000001
-- p2 20000000-0000-4000-8000-000000000002

-- Lifecycle enums (Physical Schema v1 names, no _enum suffix)
select has_enum('public'::name, 'contract_status'::name);
select enum_has_labels(
  'public'::name,
  'contract_status'::name,
  array['ACTIVE', 'CANCELLED', 'COMPLETED']::text[]
);

select has_enum('public'::name, 'occupancy_intent'::name);
select enum_has_labels(
  'public'::name,
  'occupancy_intent'::name,
  array['SELF_MOVE_IN', 'SALE', 'JEONSE', 'MONTHLY_RENT', 'UNDECIDED']::text[]
);

select has_enum('public'::name, 'funding_status'::name);
select enum_has_labels(
  'public'::name,
  'funding_status'::name,
  array[
    'NORMAL',
    'LOAN_NEEDED',
    'FUNDING_SHORTAGE',
    'EXISTING_HOME_UNSOLD',
    'UNKNOWN'
  ]::text[]
);

select has_enum('public'::name, 'move_in_status'::name);
select enum_has_labels(
  'public'::name,
  'move_in_status'::name,
  array[
    'NOT_CONTACTED',
    'CONTACTED',
    'PLANNED',
    'DELAYED',
    'BALANCE_PAID',
    'MOVED_IN'
  ]::text[]
);

select ok(
  not exists (select 1 from pg_type where typname = 'move_in_progress'),
  'move_in_progress type must not exist'
);

select has_enum('public'::name, 'customer_unit_interest_status'::name);
select enum_has_labels(
  'public'::name,
  'customer_unit_interest_status'::name,
  array[
    'ACTIVE',
    'HOLD',
    'LOST',
    'CONTRACTED',
    'UNIT_SOLD_TO_OTHER'
  ]::text[]
);

select has_enum('public'::name, 'report_phase'::name);
select enum_has_labels(
  'public'::name,
  'report_phase'::name,
  array['SALES', 'UNSOLD', 'MOVE_IN']::text[]
);

select has_enum('public'::name, 'report_type'::name);
select enum_has_labels(
  'public'::name,
  'report_type'::name,
  array[
    'MORNING_MEETING',
    'EVENING_MEETING',
    'DAILY',
    'WEEKLY',
    'MONTHLY',
    'CLIENT',
    'EXECUTIVE'
  ]::text[]
);

select has_enum('public'::name, 'report_template_source_type'::name);
select enum_has_labels(
  'public'::name,
  'report_template_source_type'::name,
  array['PHOTO', 'SCREENSHOT', 'EXCEL', 'MANUAL']::text[]
);

select has_enum('public'::name, 'contact_schedule_status'::name);
select enum_has_labels(
  'public'::name,
  'contact_schedule_status'::name,
  array['PENDING', 'SENT', 'FAILED', 'SKIPPED']::text[]
);

select ok(
  not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'contact_schedule_status'
      and e.enumlabel in ('SCHEDULED', 'COMPLETED')
  ),
  'contact_schedule_status must not include SCHEDULED or COMPLETED'
);

-- Out of Migration 1 scope (customer_unit_interest is Migration 2)
select hasnt_table('public'::name, 'market_data'::name);
select hasnt_table('public'::name, 'report_template'::name);

-- project_unit columns and defaults
select has_table('public'::name, 'project_unit'::name);
select has_pk('public'::name, 'project_unit'::name);
select col_is_pk('public'::name, 'project_unit'::name, 'unit_id'::name);
select col_type_is('public'::name, 'project_unit'::name, 'unit_id'::name, 'uuid');
select col_not_null('public'::name, 'project_unit'::name, 'unit_id'::name);
select col_default_is(
  'public'::name,
  'project_unit'::name,
  'unit_id'::name,
  'gen_random_uuid()',
  'project_unit.unit_id uses Phase 1 UUID default'
);

select col_type_is('public'::name, 'project_unit'::name, 'project_id'::name, 'uuid');
select col_not_null('public'::name, 'project_unit'::name, 'project_id'::name);
select col_is_fk(
  'public'::name,
  'project_unit'::name,
  'project_id'::name,
  'project_unit.project_id is fk'
);
select fk_ok(
  'public'::name,
  'project_unit'::name,
  'project_id'::name,
  'public'::name,
  'project'::name,
  'id'::name
);

select col_type_is(
  'public'::name,
  'project_unit'::name,
  'building_no'::name,
  'character varying'
);
select col_not_null('public'::name, 'project_unit'::name, 'building_no'::name);

select col_type_is(
  'public'::name,
  'project_unit'::name,
  'unit_no'::name,
  'character varying'
);
select col_not_null('public'::name, 'project_unit'::name, 'unit_no'::name);

select col_type_is(
  'public'::name,
  'project_unit'::name,
  'unit_type'::name,
  'character varying'
);
select col_is_null('public'::name, 'project_unit'::name, 'unit_type'::name);

select col_type_is('public'::name, 'project_unit'::name, 'floor'::name, 'integer');
select col_is_null('public'::name, 'project_unit'::name, 'floor'::name);

select col_type_is(
  'public'::name,
  'project_unit'::name,
  'created_at'::name,
  'timestamp with time zone'
);
select col_not_null('public'::name, 'project_unit'::name, 'created_at'::name);
select col_default_is(
  'public'::name,
  'project_unit'::name,
  'created_at'::name,
  'now()',
  'project_unit.created_at default'
);

select col_type_is(
  'public'::name,
  'project_unit'::name,
  'updated_at'::name,
  'timestamp with time zone'
);
select col_not_null('public'::name, 'project_unit'::name, 'updated_at'::name);
select col_default_is(
  'public'::name,
  'project_unit'::name,
  'updated_at'::name,
  'now()',
  'project_unit.updated_at default'
);

select has_trigger('public'::name, 'project_unit'::name, 'set_updated_at'::name);

select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public'
      and rel.relname = 'project_unit'
      and c.contype = 'u'
      and pg_get_constraintdef(c.oid) = 'UNIQUE (project_id, building_no, unit_no)'
  ),
  'UNIQUE (project_id, building_no, unit_no)'
);

select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public'
      and rel.relname = 'project_unit'
      and c.contype = 'u'
      and pg_get_constraintdef(c.oid) = 'UNIQUE (project_id, unit_id)'
  ),
  'UNIQUE (project_id, unit_id) parent key'
);

select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public'
      and rel.relname = 'project_unit'
      and c.contype = 'f'
      and pg_get_constraintdef(c.oid) ilike '%REFERENCES project(id)%'
      and (
        pg_get_constraintdef(c.oid) ilike '%ON DELETE RESTRICT%'
        or pg_get_constraintdef(c.oid) not ilike '%ON DELETE%'
      )
      and pg_get_constraintdef(c.oid) not ilike '%ON DELETE CASCADE%'
  ),
  'project_unit.project_id ON DELETE is RESTRICT/NO ACTION'
);

select has_index(
  'public'::name,
  'project_unit'::name,
  'idx_project_unit_project_type'::name,
  array['project_id', 'unit_type']::name[]
);

select is(
  (
    select count(*)::integer
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'project_unit'
      and indexdef like '%building_no%'
      and indexdef like '%unit_no%'
  ),
  1,
  'no extra index duplicating UNIQUE (project_id, building_no, unit_no)'
);

-- Happy path inserts
select lives_ok(
  $$
    insert into public.project_unit (
      project_id, building_no, unit_no, unit_type, floor
    )
    values (
      '20000000-0000-4000-8000-000000000001',
      '101',
      '1001',
      '84A',
      10
    );
  $$,
  'PROJECT_UNIT insert succeeds'
);

select lives_ok(
  $$
    insert into public.project_unit (project_id, building_no, unit_no)
    values (
      '20000000-0000-4000-8000-000000000001',
      '101',
      '1002'
    );
  $$,
  'same project can register a different unit'
);

select lives_ok(
  $$
    insert into public.project_unit (project_id, building_no, unit_no)
    values (
      '20000000-0000-4000-8000-000000000002',
      '101',
      '1001'
    );
  $$,
  'another project can reuse the same building_no and unit_no'
);

select lives_ok(
  $$
    insert into public.project_unit (project_id, building_no, unit_no)
    values (
      '20000000-0000-4000-8000-000000000001',
      'A-동',
      '10-01호'
    );
  $$,
  'building_no and unit_no store arbitrary strings'
);

select lives_ok(
  $$
    insert into public.project_unit (project_id, building_no, unit_no, unit_type, floor)
    values (
      '20000000-0000-4000-8000-000000000001',
      '102',
      '1503',
      null,
      null
    );
  $$,
  'unit_type and floor are nullable'
);

select throws_ok(
  $$
    insert into public.project_unit (project_id, building_no, unit_no)
    values (
      '20000000-0000-4000-8000-000000000001',
      '101',
      '1001'
    );
  $$,
  '23505'
);

select throws_ok(
  $$
    insert into public.project_unit (project_id, building_no, unit_no)
    values (
      '20000000-0000-4000-8000-000000000099',
      '101',
      '1001'
    );
  $$,
  '23503'
);

select lives_ok(
  $$
    create table public.project_unit_child_probe (
      project_id uuid not null,
      unit_id uuid not null,
      foreign key (project_id, unit_id)
        references public.project_unit (project_id, unit_id)
        on delete restrict
    );
    drop table public.project_unit_child_probe;
  $$,
  'UNIQUE (project_id, unit_id) can be used as a composite parent key'
);

select * from finish();
rollback;
