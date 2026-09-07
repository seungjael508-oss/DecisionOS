begin;

select no_plan();

-- TODO(M9/M10):
-- - UNIT_OCCUPANCY_STATUS는 ACTIVE contract만 허용
-- - current UPDATE는 direct write 차단
-- - current 상태 변경 시 History 자동 생성
-- - current/history transaction rollback
-- - previous/new enum label validation
-- - History direct INSERT 제한

insert into public.project_unit (unit_id, project_id, building_no, unit_no)
values
  ('72000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '201', '101'),
  ('72000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '201', '102'),
  ('72000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', '201', '103'),
  ('72000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', '201', '104'),
  ('72000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000001', '201', '105'),
  ('72000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000002', '201', '101'),
  ('72000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000001', '201', '106');

insert into public.customer (id, project_id, name, phone, phone_normalized)
values
  ('53000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Occ Customer 1', '01080000001', '01080000001'),
  ('53000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Occ Customer 2', '01080000002', '01080000002');

insert into public.contract (
  contract_id, project_id, customer_id, unit_id, contract_status
) values
  ('91000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '53000000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000001', 'ACTIVE'),
  ('91000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '53000000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000002', 'ACTIVE'),
  ('91000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', '53000000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000003', 'ACTIVE'),
  ('91000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', '53000000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000004', 'ACTIVE'),
  ('91000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000001', '53000000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000005', 'ACTIVE'),
  ('91000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000002', '53000000-0000-4000-8000-000000000002', '72000000-0000-4000-8000-000000000006', 'ACTIVE'),
  ('91000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000001', '53000000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000007', 'ACTIVE');

select has_table('public'::name, 'unit_occupancy_status'::name);
select col_is_pk('public'::name, 'unit_occupancy_status'::name, 'occupancy_status_id'::name);
select col_default_is('public'::name, 'unit_occupancy_status'::name, 'occupancy_intent'::name, 'UNDECIDED', 'occupancy_intent default');
select col_default_is('public'::name, 'unit_occupancy_status'::name, 'funding_status'::name, 'UNKNOWN', 'funding_status default');
select col_default_is('public'::name, 'unit_occupancy_status'::name, 'move_in_status'::name, 'NOT_CONTACTED', 'move_in_status default');
select col_is_null('public'::name, 'unit_occupancy_status'::name, 'planned_move_in_date'::name);
select col_is_null('public'::name, 'unit_occupancy_status'::name, 'balance_paid_at'::name);
select col_is_null('public'::name, 'unit_occupancy_status'::name, 'actual_move_in_date'::name);
select col_is_null('public'::name, 'unit_occupancy_status'::name, 'updated_by'::name);
select has_trigger('public'::name, 'unit_occupancy_status'::name, 'set_updated_at'::name);

select has_table('public'::name, 'contract_status_history'::name);
select col_is_pk('public'::name, 'contract_status_history'::name, 'history_id'::name);
select col_is_null('public'::name, 'contract_status_history'::name, 'contact_id'::name);
select hasnt_column('public'::name, 'contract_status_history'::name, 'updated_at'::name);
select hasnt_trigger('public'::name, 'contract_status_history'::name, 'set_updated_at'::name);

select ok(
  exists (
    select 1 from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public'
      and rel.relname = 'contract_status_history'
      and c.contype = 'f'
      and pg_get_constraintdef(c.oid) ilike
        '%FOREIGN KEY (contact_id, project_id) REFERENCES consultation(id, project_id)%'
      and pg_get_constraintdef(c.oid) ilike '%ON DELETE RESTRICT%'
  ),
  'history contact_id FK to consultation is added in M5'
);

select ok(
  exists (
    select 1 from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public' and rel.relname = 'unit_occupancy_status'
      and c.contype = 'u'
      and pg_get_constraintdef(c.oid) = 'UNIQUE (contract_id)'
  ),
  'UNIQUE (contract_id) on occupancy'
);

select ok(
  exists (
    select 1 from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public' and rel.relname = 'unit_occupancy_status'
      and c.contype = 'u'
      and pg_get_constraintdef(c.oid) = 'UNIQUE (project_id, unit_id)'
  ),
  'UNIQUE (project_id, unit_id) on occupancy'
);

select ok(
  exists (
    select 1 from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public' and rel.relname = 'unit_occupancy_status'
      and c.contype = 'f'
      and pg_get_constraintdef(c.oid) ilike
        '%FOREIGN KEY (contract_id, project_id, unit_id) REFERENCES contract(contract_id, project_id, unit_id)%'
      and pg_get_constraintdef(c.oid) ilike '%ON DELETE RESTRICT%'
  ),
  'occupancy composite FK to contract ON DELETE RESTRICT'
);

select ok(
  exists (
    select 1 from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public' and rel.relname = 'unit_occupancy_status'
      and c.contype = 'f'
      and pg_get_constraintdef(c.oid) ilike
        '%FOREIGN KEY (updated_by, project_id) REFERENCES project_member(id, project_id)%'
      and pg_get_constraintdef(c.oid) ilike '%ON DELETE RESTRICT%'
  ),
  'occupancy updated_by composite FK ON DELETE RESTRICT'
);

select has_index(
  'public'::name, 'unit_occupancy_status'::name, 'idx_uos_project_move_in'::name,
  array['project_id', 'move_in_status']::name[]
);
select has_index(
  'public'::name, 'unit_occupancy_status'::name, 'idx_uos_project_intent'::name,
  array['project_id', 'occupancy_intent']::name[]
);
select has_index(
  'public'::name, 'unit_occupancy_status'::name, 'idx_uos_project_funding'::name,
  array['project_id', 'funding_status']::name[]
);
select has_index(
  'public'::name, 'unit_occupancy_status'::name, 'idx_uos_project_next_contact'::name,
  array['project_id', 'next_contact_at']::name[]
);

select is(
  (
    select count(*)::integer
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'unit_occupancy_status'
      and indexname like 'idx_%'
      and indexdef like '%(project_id, unit_id)%'
  ),
  0,
  'no extra btree duplicating UNIQUE (project_id, unit_id)'
);

select has_index(
  'public'::name, 'contract_status_history'::name, 'idx_csh_project_unit_changed'::name,
  array['project_id', 'unit_id', 'changed_at']::name[]
);
select has_index(
  'public'::name, 'contract_status_history'::name, 'idx_csh_project_contract_changed'::name,
  array['project_id', 'contract_id', 'changed_at']::name[]
);
select has_index(
  'public'::name, 'contract_status_history'::name, 'idx_csh_project_field_changed'::name,
  array['project_id', 'field_changed', 'changed_at']::name[]
);

select hasnt_table('public'::name, 'contact_log'::name);

-- Happy occupancy
select lives_ok(
  $$
    insert into public.unit_occupancy_status (
      occupancy_status_id, project_id, unit_id, contract_id
    ) values (
      'a1000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001',
      '72000000-0000-4000-8000-000000000001',
      '91000000-0000-4000-8000-000000000001'
    );
  $$,
  'occupancy row for ACTIVE contract succeeds'
);

select is(
  (
    select occupancy_intent::text
    from public.unit_occupancy_status
    where occupancy_status_id = 'a1000000-0000-4000-8000-000000000001'
  ),
  'UNDECIDED',
  'default occupancy_intent is UNDECIDED'
);

select is(
  (
    select funding_status::text
    from public.unit_occupancy_status
    where occupancy_status_id = 'a1000000-0000-4000-8000-000000000001'
  ),
  'UNKNOWN',
  'default funding_status is UNKNOWN'
);

select is(
  (
    select move_in_status::text
    from public.unit_occupancy_status
    where occupancy_status_id = 'a1000000-0000-4000-8000-000000000001'
  ),
  'NOT_CONTACTED',
  'default move_in_status is NOT_CONTACTED'
);

-- Occupancy IDOR
select throws_ok(
  $$
    insert into public.unit_occupancy_status (
      project_id, unit_id, contract_id
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '72000000-0000-4000-8000-000000000006',
      '91000000-0000-4000-8000-000000000007'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.unit_occupancy_status (
      project_id, unit_id, contract_id
    ) values (
      '20000000-0000-4000-8000-000000000002',
      '72000000-0000-4000-8000-000000000006',
      '91000000-0000-4000-8000-000000000007'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.unit_occupancy_status (
      project_id, unit_id, contract_id
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '72000000-0000-4000-8000-000000000002',
      '91000000-0000-4000-8000-000000000007'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.unit_occupancy_status (
      project_id, unit_id, contract_id, updated_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '72000000-0000-4000-8000-000000000002',
      '91000000-0000-4000-8000-000000000002',
      '40000000-0000-4000-8000-00000000000b'
    );
  $$,
  '23503'
);

-- 1:1
select throws_ok(
  $$
    insert into public.unit_occupancy_status (
      project_id, unit_id, contract_id
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '72000000-0000-4000-8000-000000000001',
      '91000000-0000-4000-8000-000000000001'
    );
  $$,
  '23505'
);

insert into public.contract (
  contract_id, project_id, customer_id, unit_id,
  contract_status, cancellation_reason
) values (
  '91000000-0000-4000-8000-0000000000ca',
  '20000000-0000-4000-8000-000000000001',
  '53000000-0000-4000-8000-000000000001',
  '72000000-0000-4000-8000-000000000001',
  'CANCELLED',
  'HOLDER_CHANGED'
);

select throws_ok(
  $$
    insert into public.unit_occupancy_status (
      project_id, unit_id, contract_id
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '72000000-0000-4000-8000-000000000001',
      '91000000-0000-4000-8000-0000000000ca'
    );
  $$,
  '23505'
);

-- Status CHECKs
select lives_ok(
  $$
    insert into public.unit_occupancy_status (
      project_id, unit_id, contract_id, move_in_status, balance_paid_at
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '72000000-0000-4000-8000-000000000002',
      '91000000-0000-4000-8000-000000000002',
      'BALANCE_PAID',
      now()
    );
  $$,
  'BALANCE_PAID with balance_paid_at succeeds'
);

select throws_ok(
  $$
    insert into public.unit_occupancy_status (
      project_id, unit_id, contract_id, move_in_status
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '72000000-0000-4000-8000-000000000003',
      '91000000-0000-4000-8000-000000000003',
      'BALANCE_PAID'
    );
  $$,
  '23514'
);

select lives_ok(
  $$
    insert into public.unit_occupancy_status (
      project_id, unit_id, contract_id, move_in_status, actual_move_in_date
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '72000000-0000-4000-8000-000000000003',
      '91000000-0000-4000-8000-000000000003',
      'MOVED_IN',
      now()
    );
  $$,
  'MOVED_IN with actual_move_in_date succeeds'
);

select throws_ok(
  $$
    insert into public.unit_occupancy_status (
      project_id, unit_id, contract_id, move_in_status
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '72000000-0000-4000-8000-000000000004',
      '91000000-0000-4000-8000-000000000004',
      'MOVED_IN'
    );
  $$,
  '23514'
);

select lives_ok(
  $$
    insert into public.unit_occupancy_status (
      project_id, unit_id, contract_id, move_in_status, balance_paid_at
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '72000000-0000-4000-8000-000000000004',
      '91000000-0000-4000-8000-000000000004',
      'CONTACTED',
      now()
    );
  $$,
  'balance_paid_at with CONTACTED is allowed'
);

select lives_ok(
  $$
    insert into public.unit_occupancy_status (
      project_id, unit_id, contract_id, move_in_status, actual_move_in_date
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '72000000-0000-4000-8000-000000000005',
      '91000000-0000-4000-8000-000000000005',
      'PLANNED',
      now()
    );
  $$,
  'actual_move_in_date with PLANNED is allowed'
);

-- History happy
select lives_ok(
  $$
    insert into public.contract_status_history (
      project_id, contract_id, unit_id, field_changed, changed_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '91000000-0000-4000-8000-000000000001',
      '72000000-0000-4000-8000-000000000001',
      'occupancy_intent',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  'history occupancy_intent succeeds'
);

select lives_ok(
  $$
    insert into public.contract_status_history (
      project_id, contract_id, unit_id, field_changed, changed_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '91000000-0000-4000-8000-000000000001',
      '72000000-0000-4000-8000-000000000001',
      'funding_status',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  'history funding_status succeeds'
);

select lives_ok(
  $$
    insert into public.contract_status_history (
      project_id, contract_id, unit_id, field_changed, changed_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '91000000-0000-4000-8000-000000000001',
      '72000000-0000-4000-8000-000000000001',
      'move_in_status',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  'history move_in_status succeeds'
);

select throws_ok(
  $$
    insert into public.contract_status_history (
      project_id, contract_id, unit_id, field_changed, changed_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '91000000-0000-4000-8000-000000000001',
      '72000000-0000-4000-8000-000000000001',
      'invalid_field',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23514'
);

-- History IDOR
select throws_ok(
  $$
    insert into public.contract_status_history (
      project_id, contract_id, unit_id, field_changed, changed_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '91000000-0000-4000-8000-000000000001',
      '72000000-0000-4000-8000-000000000006',
      'occupancy_intent',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.contract_status_history (
      project_id, contract_id, unit_id, field_changed, changed_by
    ) values (
      '20000000-0000-4000-8000-000000000002',
      '91000000-0000-4000-8000-000000000001',
      '72000000-0000-4000-8000-000000000006',
      'occupancy_intent',
      '40000000-0000-4000-8000-00000000000b'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.contract_status_history (
      project_id, contract_id, unit_id, field_changed, changed_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '91000000-0000-4000-8000-000000000001',
      '72000000-0000-4000-8000-000000000001',
      'occupancy_intent',
      '40000000-0000-4000-8000-00000000000b'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.contract_status_history (
      project_id, contract_id, unit_id, field_changed, changed_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '91000000-0000-4000-8000-000000000001',
      '72000000-0000-4000-8000-000000000002',
      'occupancy_intent',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23503'
);

-- Delete protection
select throws_ok(
  $$
    delete from public.contract
    where contract_id = '91000000-0000-4000-8000-000000000001';
  $$,
  '23503'
);

select is(
  (
    select count(*)::integer from public.unit_occupancy_status
    where contract_id = '91000000-0000-4000-8000-000000000001'
  ),
  1,
  'contract delete does not cascade occupancy'
);

select is(
  (
    select count(*)::integer from public.contract_status_history
    where contract_id = '91000000-0000-4000-8000-000000000001'
  ),
  3,
  'contract delete does not cascade history'
);

select throws_ok(
  $$
    delete from public.project_unit
    where unit_id = '72000000-0000-4000-8000-000000000001';
  $$,
  '23503'
);

select * from finish();
rollback;
