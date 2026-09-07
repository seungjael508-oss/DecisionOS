begin;

select no_plan();

-- Physical CONTACT_LOG is public.consultation (no contact_log table).
-- consulted_at is the contacted_at mapping. Do not rename.

insert into public.project_unit (unit_id, project_id, building_no, unit_no)
values
  (
    '73000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '301',
    '101'
  ),
  (
    '73000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    '301',
    '101'
  );

insert into public.customer (id, project_id, name, phone, phone_normalized)
values
  (
    '54000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'Consult Customer 1',
    '01090000001',
    '01090000001'
  ),
  (
    '54000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    'Consult Customer 2',
    '01090000002',
    '01090000002'
  );

insert into public.contract (
  contract_id, project_id, customer_id, unit_id, contract_status
) values (
  '92000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '54000000-0000-4000-8000-000000000001',
  '73000000-0000-4000-8000-000000000001',
  'ACTIVE'
);

select hasnt_table('public'::name, 'contact_log'::name);

select col_is_null('public'::name, 'consultation'::name, 'unit_id'::name);
select col_is_null('public'::name, 'consultation'::name, 'contact_type'::name);
select col_is_null('public'::name, 'consultation'::name, 'stage'::name);
select col_is_null('public'::name, 'consultation'::name, 'channel'::name);
select col_is_null('public'::name, 'consultation'::name, 'purpose'::name);
select col_type_is(
  'public'::name, 'consultation'::name, 'structured_tags'::name, 'jsonb'
);
select col_is_null('public'::name, 'consultation'::name, 'structured_tags'::name);
select hasnt_column('public'::name, 'consultation'::name, 'contacted_at'::name);

select has_index(
  'public'::name,
  'consultation'::name,
  'idx_consultation_project_customer_time'::name,
  array['project_id', 'customer_id', 'consulted_at']::name[]
);
select has_index(
  'public'::name,
  'consultation'::name,
  'idx_consultation_project_unit_time'::name,
  array['project_id', 'unit_id', 'consulted_at']::name[]
);
select has_index(
  'public'::name,
  'consultation'::name,
  'idx_consultation_project_counselor_time'::name,
  array['project_id', 'counselor_id', 'consulted_at']::name[]
);

select ok(
  exists (
    select 1 from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public' and rel.relname = 'consultation'
      and c.contype = 'f'
      and pg_get_constraintdef(c.oid) ilike
        '%FOREIGN KEY (project_id, unit_id) REFERENCES project_unit(project_id, unit_id)%'
      and pg_get_constraintdef(c.oid) ilike '%ON DELETE RESTRICT%'
  ),
  'consultation unit composite FK ON DELETE RESTRICT'
);

select ok(
  exists (
    select 1 from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public' and rel.relname = 'contract_status_history'
      and c.contype = 'f'
      and pg_get_constraintdef(c.oid) ilike
        '%FOREIGN KEY (contact_id, project_id) REFERENCES consultation(id, project_id)%'
      and pg_get_constraintdef(c.oid) ilike '%ON DELETE RESTRICT%'
  ),
  'history contact_id composite FK to consultation ON DELETE RESTRICT'
);

-- Existing consultation insert (Phase 1 columns only)
select lives_ok(
  $$
    insert into public.consultation (
      id, project_id, customer_id, counselor_id, consulted_at, content, created_by
    ) values (
      '61000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      '40000000-0000-4000-8000-00000000000a',
      now(),
      'baseline consultation content',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  'existing consultation insert without new fields succeeds'
);

select is(
  (
    select ai_analysis_status::text
    from public.consultation
    where id = '61000000-0000-4000-8000-000000000001'
  ),
  'PENDING',
  'existing AI default status is preserved'
);

select is(
  (
    select content_version
    from public.consultation
    where id = '61000000-0000-4000-8000-000000000001'
  ),
  1,
  'existing content_version default is preserved'
);

select has_trigger('public'::name, 'consultation'::name, 'set_updated_at'::name);

select lives_ok(
  $$
    update public.consultation
    set content = 'baseline consultation content (edited)',
        content_version = 2
    where id = '61000000-0000-4000-8000-000000000001';
  $$,
  'existing consultation content and content_version update succeeds'
);

select is(
  (
    select content_version
    from public.consultation
    where id = '61000000-0000-4000-8000-000000000001'
  ),
  2,
  'content_version remains writable after M5'
);

select lives_ok(
  $$
    insert into public.consultation (
      project_id, customer_id, counselor_id, consulted_at, content, created_by,
      stage, unit_id
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      '40000000-0000-4000-8000-00000000000a',
      now(),
      'move-in project-wide call without unit',
      '40000000-0000-4000-8000-00000000000a',
      'MOVE_IN',
      null
    );
  $$,
  'MOVE_IN stage does not require unit_id'
);

select lives_ok(
  $$
    insert into public.consultation (
      id, project_id, customer_id, counselor_id, consulted_at, content,
      created_by, unit_id
    ) values (
      '61000000-0000-4000-8000-000000000002',
      '20000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      '40000000-0000-4000-8000-00000000000a',
      now(),
      'same project unit consultation',
      '40000000-0000-4000-8000-00000000000a',
      '73000000-0000-4000-8000-000000000001'
    );
  $$,
  'same-project consultation + unit succeeds'
);

select lives_ok(
  $$
    insert into public.consultation (
      project_id, customer_id, counselor_id, consulted_at, content, created_by, unit_id
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      '40000000-0000-4000-8000-00000000000a',
      now(),
      'null unit consultation',
      '40000000-0000-4000-8000-00000000000a',
      null
    );
  $$,
  'unit_id NULL succeeds'
);

select throws_ok(
  $$
    insert into public.consultation (
      project_id, customer_id, counselor_id, consulted_at, content, created_by, unit_id
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      '40000000-0000-4000-8000-00000000000a',
      now(),
      'cross project unit',
      '40000000-0000-4000-8000-00000000000a',
      '73000000-0000-4000-8000-000000000002'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.consultation (
      project_id, customer_id, counselor_id, consulted_at, content, created_by, unit_id
    ) values (
      '20000000-0000-4000-8000-000000000002',
      '54000000-0000-4000-8000-000000000002',
      '40000000-0000-4000-8000-00000000000b',
      now(),
      'forged project unit',
      '40000000-0000-4000-8000-00000000000b',
      '73000000-0000-4000-8000-000000000001'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.consultation (
      project_id, customer_id, counselor_id, consulted_at, content, created_by, unit_id
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      '40000000-0000-4000-8000-00000000000a',
      now(),
      'missing unit',
      '40000000-0000-4000-8000-00000000000a',
      '73000000-0000-4000-8000-000000000099'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.consultation (
      project_id, customer_id, counselor_id, consulted_at, content, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000002',
      '40000000-0000-4000-8000-00000000000a',
      now(),
      'cross project customer',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.consultation (
      project_id, customer_id, counselor_id, consulted_at, content, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      '40000000-0000-4000-8000-00000000000b',
      now(),
      'cross project counselor',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23503'
);

-- New field CHECKs
select lives_ok(
  $$
    insert into public.consultation (
      project_id, customer_id, counselor_id, consulted_at, content, created_by,
      contact_type, stage, purpose, structured_tags
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      '40000000-0000-4000-8000-00000000000a',
      now(),
      'typed consultation',
      '40000000-0000-4000-8000-00000000000a',
      'CALL',
      'MOVE_IN',
      'MOVE_IN_INTENT_CHECK',
      '{"price_sensitive": true}'::jsonb
    );
  $$,
  'allowed contact_type, stage, purpose, and jsonb tags succeed'
);

select throws_ok(
  $$
    insert into public.consultation (
      project_id, customer_id, counselor_id, consulted_at, content, created_by,
      contact_type
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      '40000000-0000-4000-8000-00000000000a',
      now(),
      'bad type',
      '40000000-0000-4000-8000-00000000000a',
      'FAX'
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.consultation (
      project_id, customer_id, counselor_id, consulted_at, content, created_by,
      stage
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      '40000000-0000-4000-8000-00000000000a',
      now(),
      'bad stage',
      '40000000-0000-4000-8000-00000000000a',
      'UNKNOWN_STAGE'
    );
  $$,
  '23514'
);

-- History contact_id
select lives_ok(
  $$
    insert into public.contract_status_history (
      project_id, contract_id, unit_id, field_changed, changed_by, contact_id
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000001',
      '73000000-0000-4000-8000-000000000001',
      'occupancy_intent',
      '40000000-0000-4000-8000-00000000000a',
      '61000000-0000-4000-8000-000000000001'
    );
  $$,
  'same-project history + consultation succeeds'
);

select lives_ok(
  $$
    insert into public.contract_status_history (
      project_id, contract_id, unit_id, field_changed, changed_by, contact_id
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000001',
      '73000000-0000-4000-8000-000000000001',
      'funding_status',
      '40000000-0000-4000-8000-00000000000a',
      null
    );
  $$,
  'history contact_id NULL succeeds'
);

insert into public.consultation (
  id, project_id, customer_id, counselor_id, consulted_at, content, created_by
) values (
  '61000000-0000-4000-8000-0000000000b2',
  '20000000-0000-4000-8000-000000000002',
  '54000000-0000-4000-8000-000000000002',
  '40000000-0000-4000-8000-00000000000b',
  now(),
  'project two consultation',
  '40000000-0000-4000-8000-00000000000b'
);

select throws_ok(
  $$
    insert into public.contract_status_history (
      project_id, contract_id, unit_id, field_changed, changed_by, contact_id
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000001',
      '73000000-0000-4000-8000-000000000001',
      'move_in_status',
      '40000000-0000-4000-8000-00000000000a',
      '61000000-0000-4000-8000-0000000000b2'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.contract_status_history (
      project_id, contract_id, unit_id, field_changed, changed_by, contact_id
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000001',
      '73000000-0000-4000-8000-000000000001',
      'move_in_status',
      '40000000-0000-4000-8000-00000000000a',
      '61000000-0000-4000-8000-000000000099'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    delete from public.consultation
    where id = '61000000-0000-4000-8000-000000000001';
  $$,
  '23503'
);

select is(
  (
    select count(*)::integer from public.contract_status_history
    where contact_id = '61000000-0000-4000-8000-000000000001'
  ),
  1,
  'consultation delete does not cascade history'
);

select * from finish();
rollback;
