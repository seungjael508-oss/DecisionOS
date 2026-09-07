begin;

select no_plan();

-- TODO(M9/M10): contract.customer_id must not be directly UPDATEd after insert.
-- RLS/RPC will enforce this; Migration 3 only prepares structure.

insert into public.project_unit (unit_id, project_id, building_no, unit_no)
values
  (
    '71000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '101',
    '1001'
  ),
  (
    '71000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    '102',
    '1503'
  ),
  (
    '71000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000002',
    '101',
    '1001'
  );

insert into public.customer (id, project_id, name, phone, phone_normalized)
values
  (
    '52000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'Contract Customer 1',
    '01070000001',
    '01070000001'
  ),
  (
    '52000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    'Contract Customer 2',
    '01070000002',
    '01070000002'
  ),
  (
    '52000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000002',
    'Contract Customer 3',
    '01070000003',
    '01070000003'
  );

-- Structure: subscription
select has_table('public'::name, 'subscription'::name);
select col_is_pk(
  'public'::name, 'subscription'::name, 'subscription_id'::name
);
select col_not_null(
  'public'::name, 'subscription'::name, 'subscription_round'::name
);
select col_hasnt_default(
  'public'::name,
  'subscription'::name,
  'subscription_round'::name,
  'subscription_round has no default'
);
select has_trigger(
  'public'::name, 'subscription'::name, 'set_updated_at'::name
);

select ok(
  exists (
    select 1 from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public' and rel.relname = 'subscription'
      and c.contype = 'u'
      and pg_get_constraintdef(c.oid) = 'UNIQUE (subscription_id, project_id)'
  ),
  'UNIQUE (subscription_id, project_id)'
);

select ok(
  exists (
    select 1 from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public' and rel.relname = 'subscription'
      and c.contype = 'u'
      and pg_get_constraintdef(c.oid)
        = 'UNIQUE (subscription_id, customer_id, project_id)'
  ),
  'UNIQUE (subscription_id, customer_id, project_id)'
);

select ok(
  exists (
    select 1 from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public' and rel.relname = 'subscription'
      and c.contype = 'f'
      and pg_get_constraintdef(c.oid) ilike
        '%FOREIGN KEY (customer_id, project_id) REFERENCES customer(id, project_id)%'
      and pg_get_constraintdef(c.oid) ilike '%ON DELETE RESTRICT%'
  ),
  'subscription composite FK to customer ON DELETE RESTRICT'
);

select has_index(
  'public'::name,
  'subscription'::name,
  'idx_subscription_project_customer'::name,
  array['project_id', 'customer_id']::name[]
);

select has_index(
  'public'::name,
  'subscription'::name,
  'idx_subscription_project_subscribed_at'::name,
  array['project_id', 'subscribed_at']::name[]
);

-- Structure: contract
select has_table('public'::name, 'contract'::name);
select col_is_pk('public'::name, 'contract'::name, 'contract_id'::name);
select col_type_is(
  'public'::name, 'contract'::name, 'contract_status'::name, 'contract_status'
);
select col_not_null('public'::name, 'contract'::name, 'contract_status'::name);
select col_hasnt_default(
  'public'::name,
  'contract'::name,
  'contract_status'::name,
  'contract_status has no default'
);
select col_is_null('public'::name, 'contract'::name, 'subscription_id'::name);
select has_trigger('public'::name, 'contract'::name, 'set_updated_at'::name);

select ok(
  exists (
    select 1 from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public' and rel.relname = 'contract'
      and c.contype = 'u'
      and pg_get_constraintdef(c.oid) = 'UNIQUE (contract_id, project_id)'
  ),
  'UNIQUE (contract_id, project_id)'
);

select ok(
  exists (
    select 1 from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public' and rel.relname = 'contract'
      and c.contype = 'u'
      and pg_get_constraintdef(c.oid)
        = 'UNIQUE (contract_id, project_id, unit_id)'
  ),
  'UNIQUE (contract_id, project_id, unit_id)'
);

select ok(
  exists (
    select 1 from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public' and rel.relname = 'contract'
      and c.contype = 'f'
      and pg_get_constraintdef(c.oid) ilike
        '%FOREIGN KEY (customer_id, project_id) REFERENCES customer(id, project_id)%'
      and pg_get_constraintdef(c.oid) ilike '%ON DELETE RESTRICT%'
  ),
  'contract composite FK to customer ON DELETE RESTRICT'
);

select ok(
  exists (
    select 1 from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public' and rel.relname = 'contract'
      and c.contype = 'f'
      and pg_get_constraintdef(c.oid) ilike
        '%FOREIGN KEY (project_id, unit_id) REFERENCES project_unit(project_id, unit_id)%'
      and pg_get_constraintdef(c.oid) ilike '%ON DELETE RESTRICT%'
  ),
  'contract composite FK to project_unit ON DELETE RESTRICT'
);

select ok(
  exists (
    select 1 from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public' and rel.relname = 'contract'
      and c.contype = 'f'
      and pg_get_constraintdef(c.oid) ilike
        '%FOREIGN KEY (subscription_id, customer_id, project_id) REFERENCES subscription(subscription_id, customer_id, project_id)%'
      and pg_get_constraintdef(c.oid) ilike '%ON DELETE RESTRICT%'
  ),
  'contract composite FK to subscription ON DELETE RESTRICT'
);

select ok(
  exists (
    select 1 from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public' and rel.relname = 'contract'
      and c.contype = 'f'
      and pg_get_constraintdef(c.oid) ilike
        '%FOREIGN KEY (previous_contract_id, project_id, unit_id) REFERENCES contract(contract_id, project_id, unit_id)%'
      and pg_get_constraintdef(c.oid) ilike '%ON DELETE RESTRICT%'
      and pg_get_constraintdef(c.oid) not ilike '%ON DELETE CASCADE%'
  ),
  'previous_contract composite FK ON DELETE RESTRICT'
);

select has_index(
  'public'::name,
  'contract'::name,
  'uq_contract_active_unit'::name,
  array['project_id', 'unit_id']::name[]
);

select has_index(
  'public'::name,
  'contract'::name,
  'idx_contract_project_customer'::name,
  array['project_id', 'customer_id']::name[]
);

select has_index(
  'public'::name,
  'contract'::name,
  'idx_contract_project_unit'::name,
  array['project_id', 'unit_id']::name[]
);

select has_index(
  'public'::name,
  'contract'::name,
  'idx_contract_project_status'::name,
  array['project_id', 'contract_status']::name[]
);

select has_index(
  'public'::name,
  'contract'::name,
  'idx_contract_previous'::name,
  array['previous_contract_id']::name[]
);

select has_index(
  'public'::name,
  'contract'::name,
  'idx_contract_project_contracted_at'::name,
  array['project_id', 'contracted_at']::name[]
);

-- Subscription happy / IDOR
select lives_ok(
  $$
    insert into public.subscription (
      subscription_id, project_id, customer_id, subscription_round
    ) values (
      '80000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001',
      '52000000-0000-4000-8000-000000000001',
      '1'
    );
  $$,
  'same-project customer subscription insert succeeds'
);

select lives_ok(
  $$
    insert into public.subscription (
      subscription_id, project_id, customer_id, subscription_round
    ) values (
      '80000000-0000-4000-8000-000000000002',
      '20000000-0000-4000-8000-000000000001',
      '52000000-0000-4000-8000-000000000002',
      '1'
    );
  $$,
  'second same-project customer subscription insert succeeds'
);

select lives_ok(
  $$
    insert into public.subscription (
      subscription_id, project_id, customer_id, subscription_round
    ) values (
      '80000000-0000-4000-8000-000000000003',
      '20000000-0000-4000-8000-000000000002',
      '52000000-0000-4000-8000-000000000003',
      '1'
    );
  $$,
  'other-project subscription insert succeeds'
);

select throws_ok(
  $$
    insert into public.subscription (
      project_id, customer_id, subscription_round
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '52000000-0000-4000-8000-000000000003',
      '1'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.subscription (
      project_id, customer_id, subscription_round
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '52000000-0000-4000-8000-000000000099',
      '1'
    );
  $$,
  '23503'
);

-- Contract happy path
select lives_ok(
  $$
    insert into public.contract (
      contract_id, project_id, customer_id, unit_id,
      subscription_id, contract_status
    ) values (
      '90000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001',
      '52000000-0000-4000-8000-000000000001',
      '71000000-0000-4000-8000-000000000001',
      '80000000-0000-4000-8000-000000000001',
      'ACTIVE'
    );
  $$,
  'same-project customer, unit, and subscription contract succeeds'
);

select lives_ok(
  $$
    insert into public.contract (
      project_id, customer_id, unit_id, subscription_id, contract_status
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '52000000-0000-4000-8000-000000000001',
      '71000000-0000-4000-8000-000000000002',
      null,
      'ACTIVE'
    );
  $$,
  'subscription_id NULL direct contract succeeds'
);

-- Subscription IDOR on contract
select throws_ok(
  $$
    insert into public.contract (
      project_id, customer_id, unit_id, subscription_id, contract_status
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '52000000-0000-4000-8000-000000000001',
      '71000000-0000-4000-8000-000000000002',
      '80000000-0000-4000-8000-000000000002',
      'COMPLETED'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.contract (
      project_id, customer_id, unit_id, subscription_id, contract_status
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '52000000-0000-4000-8000-000000000001',
      '71000000-0000-4000-8000-000000000002',
      '80000000-0000-4000-8000-000000000003',
      'COMPLETED'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.contract (
      project_id, customer_id, unit_id, contract_status
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '52000000-0000-4000-8000-000000000001',
      '71000000-0000-4000-8000-000000000003',
      'ACTIVE'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.contract (
      project_id, customer_id, unit_id, contract_status
    ) values (
      '20000000-0000-4000-8000-000000000002',
      '52000000-0000-4000-8000-000000000001',
      '71000000-0000-4000-8000-000000000003',
      'ACTIVE'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.contract (
      project_id, customer_id, unit_id, contract_status
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '52000000-0000-4000-8000-000000000003',
      '71000000-0000-4000-8000-000000000001',
      'COMPLETED'
    );
  $$,
  '23503'
);

-- ACTIVE uniqueness
select throws_ok(
  $$
    insert into public.contract (
      project_id, customer_id, unit_id, contract_status
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '52000000-0000-4000-8000-000000000002',
      '71000000-0000-4000-8000-000000000001',
      'ACTIVE'
    );
  $$,
  '23505'
);

select lives_ok(
  $$
    update public.contract
    set contract_status = 'CANCELLED',
        cancellation_reason = 'HOLDER_CHANGED'
    where contract_id = '90000000-0000-4000-8000-000000000001';
  $$,
  'ACTIVE can be cancelled with a reason'
);

select lives_ok(
  $$
    insert into public.contract (
      contract_id, project_id, customer_id, unit_id,
      contract_status, previous_contract_id
    ) values (
      '90000000-0000-4000-8000-000000000002',
      '20000000-0000-4000-8000-000000000001',
      '52000000-0000-4000-8000-000000000002',
      '71000000-0000-4000-8000-000000000001',
      'ACTIVE',
      '90000000-0000-4000-8000-000000000001'
    );
  $$,
  'new ACTIVE after CANCELLED on same unit with previous_contract succeeds'
);

select lives_ok(
  $$
    insert into public.contract (
      contract_id, project_id, customer_id, unit_id, contract_status
    ) values (
      '90000000-0000-4000-8000-000000000003',
      '20000000-0000-4000-8000-000000000002',
      '52000000-0000-4000-8000-000000000003',
      '71000000-0000-4000-8000-000000000003',
      'ACTIVE'
    );
  $$,
  'other project same building/unit numbers can have independent ACTIVE'
);

-- previous_contract IDOR
select throws_ok(
  $$
    insert into public.contract (
      project_id, customer_id, unit_id, contract_status, previous_contract_id
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '52000000-0000-4000-8000-000000000001',
      '71000000-0000-4000-8000-000000000002',
      'COMPLETED',
      '90000000-0000-4000-8000-000000000003'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.contract (
      project_id, customer_id, unit_id, contract_status, previous_contract_id
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '52000000-0000-4000-8000-000000000001',
      '71000000-0000-4000-8000-000000000002',
      'COMPLETED',
      '90000000-0000-4000-8000-000000000002'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.contract (
      contract_id, project_id, customer_id, unit_id,
      contract_status, previous_contract_id
    ) values (
      '90000000-0000-4000-8000-0000000000aa',
      '20000000-0000-4000-8000-000000000001',
      '52000000-0000-4000-8000-000000000001',
      '71000000-0000-4000-8000-000000000002',
      'COMPLETED',
      '90000000-0000-4000-8000-0000000000aa'
    );
  $$,
  '23514'
);

-- cancellation CHECKs
select lives_ok(
  $$
    insert into public.contract (
      project_id, customer_id, unit_id,
      contract_status, cancellation_reason
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '52000000-0000-4000-8000-000000000001',
      '71000000-0000-4000-8000-000000000002',
      'CANCELLED',
      'TEST_CANCEL'
    );
  $$,
  'CANCELLED with cancellation_reason succeeds'
);

select throws_ok(
  $$
    insert into public.contract (
      project_id, customer_id, unit_id, contract_status
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '52000000-0000-4000-8000-000000000001',
      '71000000-0000-4000-8000-000000000002',
      'CANCELLED'
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.contract (
      project_id, customer_id, unit_id,
      contract_status, cancellation_reason
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '52000000-0000-4000-8000-000000000001',
      '71000000-0000-4000-8000-000000000002',
      'ACTIVE',
      'SHOULD_NOT'
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.contract (
      project_id, customer_id, unit_id,
      contract_status, cancellation_reason
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '52000000-0000-4000-8000-000000000001',
      '71000000-0000-4000-8000-000000000002',
      'COMPLETED',
      'SHOULD_NOT'
    );
  $$,
  '23514'
);

-- Delete protection
select throws_ok(
  $$
    delete from public.customer
    where id = '52000000-0000-4000-8000-000000000002';
  $$,
  '23503'
);

select is(
  (
    select count(*)::integer from public.contract
    where contract_id = '90000000-0000-4000-8000-000000000002'
  ),
  1,
  'customer delete does not cascade-remove contract'
);

select throws_ok(
  $$
    delete from public.project_unit
    where unit_id = '71000000-0000-4000-8000-000000000001';
  $$,
  '23503'
);

select is(
  (
    select count(*)::integer from public.contract
    where unit_id = '71000000-0000-4000-8000-000000000001'
  ),
  2,
  'unit delete does not cascade-remove contract'
);

select throws_ok(
  $$
    delete from public.contract
    where contract_id = '90000000-0000-4000-8000-000000000001';
  $$,
  '23503'
);

select * from finish();
rollback;
