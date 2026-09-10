begin;

select no_plan();

-- TODO(M9):
-- - CS_TICKET SELECT/write RLS
-- - hard delete 운영 차단
-- TODO(M10):
-- - 신규 CS 생성 시 contract_status 검증 (ACTIVE/COMPLETED 등)
-- - CANCELLED 계약의 기존 CS는 보존
-- - create/update CS RPC (direct insert는 RLS 전까지 가능)

insert into public.project_unit (unit_id, project_id, building_no, unit_no)
values
  (
    '81000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '301',
    '1001'
  ),
  (
    '81000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    '301',
    '1002'
  ),
  (
    '81000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000002',
    '301',
    '1001'
  );

insert into public.customer (id, project_id, name, phone, phone_normalized)
values
  (
    '54000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'CS Customer A',
    '01081000001',
    '01081000001'
  ),
  (
    '54000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    'CS Customer B',
    '01081000002',
    '01081000002'
  ),
  (
    '54000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000002',
    'CS Customer C',
    '01081000003',
    '01081000003'
  );

insert into public.contract (
  contract_id, project_id, customer_id, unit_id, contract_status
) values
  (
    '92000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '54000000-0000-4000-8000-000000000001',
    '81000000-0000-4000-8000-000000000001',
    'ACTIVE'
  ),
  (
    '92000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    '54000000-0000-4000-8000-000000000002',
    '81000000-0000-4000-8000-000000000002',
    'ACTIVE'
  ),
  (
    '92000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000002',
    '54000000-0000-4000-8000-000000000003',
    '81000000-0000-4000-8000-000000000003',
    'ACTIVE'
  );

insert into auth.users (id)
values ('30000000-0000-4000-8000-0000000000c8');

insert into public.project_member (id, project_id, user_id, role, active)
values (
  '40000000-0000-4000-8000-0000000000c8',
  '20000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-0000000000c8',
  'COUNSELOR',
  true
);

select has_table('public'::name, 'cs_ticket'::name);
select col_is_pk('public'::name, 'cs_ticket'::name, 'ticket_id'::name);
select col_not_null('public'::name, 'cs_ticket'::name, 'project_id'::name);
select col_not_null('public'::name, 'cs_ticket'::name, 'contract_id'::name);
select col_not_null('public'::name, 'cs_ticket'::name, 'unit_id'::name);
select col_not_null('public'::name, 'cs_ticket'::name, 'customer_id'::name);
select col_not_null('public'::name, 'cs_ticket'::name, 'category'::name);
select col_not_null('public'::name, 'cs_ticket'::name, 'title'::name);
select col_not_null('public'::name, 'cs_ticket'::name, 'description'::name);
select col_default_is(
  'public'::name, 'cs_ticket'::name, 'status'::name, 'OPEN', 'status default OPEN'
);
select col_default_is(
  'public'::name, 'cs_ticket'::name, 'priority'::name, 'MEDIUM',
  'priority default MEDIUM'
);
select col_is_null('public'::name, 'cs_ticket'::name, 'assigned_to'::name);
select col_is_null('public'::name, 'cs_ticket'::name, 'resolved_at'::name);
select has_trigger('public'::name, 'cs_ticket'::name, 'set_updated_at'::name);

select ok(
  not exists (select 1 from pg_type where typname = 'cs_ticket_status'),
  'no cs_ticket_status enum'
);

select ok(
  exists (
    select 1 from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public' and rel.relname = 'contract'
      and c.contype = 'u'
      and pg_get_constraintdef(c.oid)
        = 'UNIQUE (contract_id, customer_id, project_id, unit_id)'
  ),
  'UNIQUE (contract_id, customer_id, project_id, unit_id) on contract'
);

select ok(
  exists (
    select 1 from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public' and rel.relname = 'cs_ticket'
      and c.contype = 'f'
      and pg_get_constraintdef(c.oid) ilike
        '%FOREIGN KEY (contract_id, customer_id, project_id, unit_id) REFERENCES contract(contract_id, customer_id, project_id, unit_id)%'
      and pg_get_constraintdef(c.oid) ilike '%ON DELETE RESTRICT%'
  ),
  'cs_ticket 4-column FK to contract ON DELETE RESTRICT'
);

select has_index(
  'public'::name,
  'cs_ticket'::name,
  'idx_cs_ticket_project_status'::name,
  array['project_id', 'status']::name[]
);
select has_index(
  'public'::name,
  'cs_ticket'::name,
  'idx_cs_ticket_project_unit_status'::name,
  array['project_id', 'unit_id', 'status']::name[]
);
select has_index(
  'public'::name,
  'cs_ticket'::name,
  'idx_cs_ticket_project_contract'::name,
  array['project_id', 'contract_id']::name[]
);
select has_index(
  'public'::name,
  'cs_ticket'::name,
  'idx_cs_ticket_project_assigned_status'::name,
  array['project_id', 'assigned_to', 'status']::name[]
);
select has_index(
  'public'::name,
  'cs_ticket'::name,
  'idx_cs_ticket_project_created_at'::name,
  array['project_id', 'created_at']::name[]
);

select lives_ok(
  $$
    insert into public.cs_ticket (
      ticket_id, project_id, contract_id, unit_id, customer_id,
      category, title, description, created_by
    ) values (
      'c1000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000001',
      '81000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      '누수',
      '천장 누수',
      '101동 1001호 천장에서 물이 샌다.',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  'same project contract/customer/unit insert succeeds'
);

select is(
  (
    select status from public.cs_ticket
    where ticket_id = 'c1000000-0000-4000-8000-000000000001'
  ),
  'OPEN',
  'inserted ticket status defaults OPEN'
);

select is(
  (
    select priority from public.cs_ticket
    where ticket_id = 'c1000000-0000-4000-8000-000000000001'
  ),
  'MEDIUM',
  'inserted ticket priority defaults MEDIUM'
);

select is(
  (
    select assigned_to from public.cs_ticket
    where ticket_id = 'c1000000-0000-4000-8000-000000000001'
  ),
  null,
  'assigned_to NULL succeeds'
);

select lives_ok(
  $$
    insert into public.cs_ticket (
      ticket_id, project_id, contract_id, unit_id, customer_id,
      category, title, description, assigned_to, created_by
    ) values (
      'c1000000-0000-4000-8000-000000000002',
      '20000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000001',
      '81000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      '소음',
      '층간소음',
      '위층에서 야간 소음이 반복된다.',
      '40000000-0000-4000-8000-0000000000c8',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  'same-project assigned_to succeeds'
);

select throws_ok(
  $$
    insert into public.cs_ticket (
      project_id, contract_id, unit_id, customer_id,
      category, title, description, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000001',
      '81000000-0000-4000-8000-000000000003',
      '54000000-0000-4000-8000-000000000001',
      '누수',
      'cross project unit',
      '다른 현장 세대',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.cs_ticket (
      project_id, contract_id, unit_id, customer_id,
      category, title, description, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000001',
      '81000000-0000-4000-8000-000000000002',
      '54000000-0000-4000-8000-000000000001',
      '누수',
      'wrong unit',
      '같은 현장 다른 세대',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.cs_ticket (
      project_id, contract_id, unit_id, customer_id,
      category, title, description, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000001',
      '81000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000002',
      '누수',
      'wrong customer',
      '같은 현장 다른 고객',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.cs_ticket (
      project_id, contract_id, unit_id, customer_id,
      category, title, description, created_by
    ) values (
      '20000000-0000-4000-8000-000000000002',
      '92000000-0000-4000-8000-000000000001',
      '81000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      '누수',
      'forged project',
      'project_id 위조',
      '40000000-0000-4000-8000-00000000000b'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.cs_ticket (
      project_id, contract_id, unit_id, customer_id,
      category, title, description, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000099',
      '81000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      '누수',
      'missing contract',
      '없는 계약',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.cs_ticket (
      project_id, contract_id, unit_id, customer_id,
      category, title, description, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000001',
      '81000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      '누수',
      'cross member create',
      '다른 현장 created_by',
      '40000000-0000-4000-8000-00000000000b'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.cs_ticket (
      project_id, contract_id, unit_id, customer_id,
      category, title, description, assigned_to, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000001',
      '81000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      '누수',
      'cross member assign',
      '다른 현장 assigned_to',
      '40000000-0000-4000-8000-00000000000b',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.cs_ticket (
      project_id, contract_id, unit_id, customer_id,
      category, title, description, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000001',
      '81000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      '누수',
      'missing created_by',
      '없는 작성자',
      '40000000-0000-4000-8000-000000000099'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.cs_ticket (
      project_id, contract_id, unit_id, customer_id,
      category, title, description, assigned_to, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000001',
      '81000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      '누수',
      'missing assigned_to',
      '없는 담당자',
      '40000000-0000-4000-8000-000000000099',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.cs_ticket (
      project_id, contract_id, unit_id, customer_id,
      category, title, description, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000001',
      '81000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      '',
      'empty category',
      '설명',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.cs_ticket (
      project_id, contract_id, unit_id, customer_id,
      category, title, description, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000001',
      '81000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      '   ',
      'blank category',
      '설명',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.cs_ticket (
      project_id, contract_id, unit_id, customer_id,
      category, title, description, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000001',
      '81000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      '누수',
      '',
      '설명',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.cs_ticket (
      project_id, contract_id, unit_id, customer_id,
      category, title, description, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000001',
      '81000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      '누수',
      '   ',
      '설명',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.cs_ticket (
      project_id, contract_id, unit_id, customer_id,
      category, title, description, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000001',
      '81000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      '누수',
      'empty description',
      '',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.cs_ticket (
      project_id, contract_id, unit_id, customer_id,
      category, title, description, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000001',
      '81000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      '누수',
      'blank description',
      '   ',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23514'
);

select lives_ok(
  $$
    insert into public.cs_ticket (
      project_id, contract_id, unit_id, customer_id,
      category, title, description, status, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000001',
      '81000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      '누수',
      'explicit OPEN',
      '처리 중',
      'OPEN',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  'status OPEN succeeds'
);

select lives_ok(
  $$
    insert into public.cs_ticket (
      project_id, contract_id, unit_id, customer_id,
      category, title, description, status, resolved_at, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000001',
      '81000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      '누수',
      'RESOLVED with timestamp',
      '해결됨',
      'RESOLVED',
      now(),
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  'RESOLVED with resolved_at succeeds'
);

select lives_ok(
  $$
    insert into public.cs_ticket (
      project_id, contract_id, unit_id, customer_id,
      category, title, description, status, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000001',
      '81000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      '누수',
      'CLOSED without resolved_at',
      '종료',
      'CLOSED',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  'status CLOSED succeeds'
);

select throws_ok(
  $$
    insert into public.cs_ticket (
      project_id, contract_id, unit_id, customer_id,
      category, title, description, status, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000001',
      '81000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      '누수',
      'invalid status',
      '설명',
      'INVALID',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.cs_ticket (
      project_id, contract_id, unit_id, customer_id,
      category, title, description, status, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000001',
      '81000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      '누수',
      'RESOLVED missing timestamp',
      '설명',
      'RESOLVED',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23514'
);

select lives_ok(
  $$
    insert into public.cs_ticket (
      project_id, contract_id, unit_id, customer_id,
      category, title, description, priority, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000001',
      '81000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      '누수',
      'priority LOW',
      '설명',
      'LOW',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  'priority LOW succeeds'
);

select lives_ok(
  $$
    insert into public.cs_ticket (
      project_id, contract_id, unit_id, customer_id,
      category, title, description, priority, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000001',
      '81000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      '누수',
      'priority MEDIUM',
      '설명',
      'MEDIUM',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  'priority MEDIUM succeeds'
);

select lives_ok(
  $$
    insert into public.cs_ticket (
      project_id, contract_id, unit_id, customer_id,
      category, title, description, priority, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000001',
      '81000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      '누수',
      'priority HIGH',
      '설명',
      'HIGH',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  'priority HIGH succeeds'
);

select throws_ok(
  $$
    insert into public.cs_ticket (
      project_id, contract_id, unit_id, customer_id,
      category, title, description, priority, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000001',
      '81000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      '누수',
      'invalid priority',
      '설명',
      'CRITICAL',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    delete from public.contract
    where contract_id = '92000000-0000-4000-8000-000000000001';
  $$,
  '23503'
);

select throws_ok(
  $$
    delete from public.project_unit
    where unit_id = '81000000-0000-4000-8000-000000000001';
  $$,
  '23503'
);

select throws_ok(
  $$
    delete from public.project_member
    where id = '40000000-0000-4000-8000-00000000000a';
  $$,
  '23503'
);

select throws_ok(
  $$
    delete from public.project_member
    where id = '40000000-0000-4000-8000-0000000000c8';
  $$,
  '23503'
);

select * from finish();
rollback;
