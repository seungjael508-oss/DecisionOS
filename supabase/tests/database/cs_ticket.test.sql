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

insert into public.project_unit (unit_id, project_id, building_no, unit_no)
values
  (
    '74000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '401',
    '101'
  ),
  (
    '74000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    '401',
    '101'
  );

insert into public.customer (id, project_id, name, phone, phone_normalized)
values
  (
    '55000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'CS Customer 1',
    '01091000001',
    '01091000001'
  ),
  (
    '55000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    'CS Customer 2',
    '01091000002',
    '01091000002'
  );

insert into public.contract (
  contract_id, project_id, customer_id, unit_id, contract_status
) values
  (
    '93000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '55000000-0000-4000-8000-000000000001',
    '74000000-0000-4000-8000-000000000001',
    'ACTIVE'
  ),
  (
    '93000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    '55000000-0000-4000-8000-000000000002',
    '74000000-0000-4000-8000-000000000002',
    'ACTIVE'
  );

insert into public.consultation (
  id, project_id, customer_id, counselor_id, consulted_at, content, created_by
) values
  (
    '62000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '55000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-00000000000a',
    now(),
    'source consultation p1',
    '40000000-0000-4000-8000-00000000000a'
  ),
  (
    '62000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    '55000000-0000-4000-8000-000000000002',
    '40000000-0000-4000-8000-00000000000b',
    now(),
    'source consultation p2',
    '40000000-0000-4000-8000-00000000000b'
  );

select has_table('public'::name, 'cs_ticket'::name);
select col_is_pk('public'::name, 'cs_ticket'::name, 'cs_ticket_id'::name);
select col_is_null('public'::name, 'cs_ticket'::name, 'unit_id'::name);
select col_is_null('public'::name, 'cs_ticket'::name, 'contract_id'::name);
select col_is_null('public'::name, 'cs_ticket'::name, 'source_consultation_id'::name);
select col_is_null('public'::name, 'cs_ticket'::name, 'assigned_to'::name);
select col_not_null('public'::name, 'cs_ticket'::name, 'customer_id'::name);
select col_not_null('public'::name, 'cs_ticket'::name, 'created_by'::name);
select col_default_is(
  'public'::name, 'cs_ticket'::name, 'status'::name, 'OPEN', 'status default'
);
select col_default_is(
  'public'::name, 'cs_ticket'::name, 'priority'::name, 'NORMAL', 'priority default'
);

select ok(
  not exists (select 1 from pg_type where typname = 'cs_ticket_status'),
  'no cs_ticket_status enum'
);

select ok(
  (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'cs_ticket'
  ),
  'cs_ticket has RLS enabled'
);
select is(
  (
    select count(*)::integer from pg_policies
    where schemaname = 'public' and tablename = 'cs_ticket'
  ),
  0,
  'cs_ticket has no RLS policies'
);

select ok(
  not has_table_privilege('authenticated', 'public.cs_ticket', 'SELECT')
  and not has_table_privilege('authenticated', 'public.cs_ticket', 'INSERT')
  and not has_table_privilege('authenticated', 'public.cs_ticket', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.cs_ticket', 'DELETE')
  and not has_table_privilege('anon', 'public.cs_ticket', 'SELECT'),
  'anon/authenticated cannot directly access cs_ticket'
);

select throws_ok(
  $$
    set local role authenticated;
    select 1 from public.cs_ticket;
  $$,
  '42501'
);

reset role;

select lives_ok(
  $$
    insert into public.cs_ticket (
      cs_ticket_id, project_id, customer_id, category, title, description, created_by
    ) values (
      'b1000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001',
      '55000000-0000-4000-8000-000000000001',
      '잔금',
      '서류 확인 요청',
      '은행 서류 누락 문의',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  'same-project customer ticket succeeds'
);

select lives_ok(
  $$
    insert into public.cs_ticket (
      project_id, customer_id, unit_id, contract_id, source_consultation_id,
      category, title, description, created_by, assigned_to
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '55000000-0000-4000-8000-000000000001',
      '74000000-0000-4000-8000-000000000001',
      '93000000-0000-4000-8000-000000000001',
      '62000000-0000-4000-8000-000000000001',
      '대출',
      '관련 계약 티켓',
      '동일 프로젝트 선택 연결',
      '40000000-0000-4000-8000-00000000000a',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  'same-project optional unit/contract/consultation/assignee succeed'
);

select lives_ok(
  $$
    insert into public.cs_ticket (
      project_id, customer_id, category, title, description, created_by,
      unit_id, contract_id, source_consultation_id, assigned_to
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '55000000-0000-4000-8000-000000000001',
      '입주',
      '일반 문의',
      '동호/계약/상담/담당 없이 접수',
      '40000000-0000-4000-8000-00000000000a',
      null, null, null, null
    );
  $$,
  'NULL unit/contract/consultation/assigned_to allowed'
);

select throws_ok(
  $$
    insert into public.cs_ticket (
      project_id, customer_id, category, title, description, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '55000000-0000-4000-8000-000000000002',
      '잔금',
      'cross customer',
      'other project customer',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.cs_ticket (
      project_id, customer_id, unit_id, category, title, description, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '55000000-0000-4000-8000-000000000001',
      '74000000-0000-4000-8000-000000000002',
      '잔금',
      'cross unit',
      'other project unit',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.cs_ticket (
      project_id, customer_id, contract_id, category, title, description, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '55000000-0000-4000-8000-000000000001',
      '93000000-0000-4000-8000-000000000002',
      '잔금',
      'cross contract',
      'other project contract',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.cs_ticket (
      project_id, customer_id, source_consultation_id,
      category, title, description, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '55000000-0000-4000-8000-000000000001',
      '62000000-0000-4000-8000-000000000002',
      '잔금',
      'cross consultation',
      'other project consultation',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.cs_ticket (
      project_id, customer_id, assigned_to, category, title, description, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '55000000-0000-4000-8000-000000000001',
      '40000000-0000-4000-8000-00000000000b',
      '잔금',
      'cross assignee',
      'other project member',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.cs_ticket (
      project_id, customer_id, category, title, description, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '55000000-0000-4000-8000-000000000001',
      '잔금',
      'cross creator',
      'other project creator',
      '40000000-0000-4000-8000-00000000000b'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.cs_ticket (
      project_id, customer_id, category, title, description, created_by, status
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '55000000-0000-4000-8000-000000000001',
      '잔금',
      'bad status',
      'invalid',
      '40000000-0000-4000-8000-00000000000a',
      'REOPENED'
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.cs_ticket (
      project_id, customer_id, category, title, description, created_by, priority
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '55000000-0000-4000-8000-000000000001',
      '잔금',
      'bad priority',
      'invalid',
      '40000000-0000-4000-8000-00000000000a',
      'CRITICAL'
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.cs_ticket (
      project_id, customer_id, category, title, description, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '55000000-0000-4000-8000-000000000001',
      '   ',
      'blank category',
      'invalid',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.cs_ticket (
      project_id, customer_id, category, title, description, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '55000000-0000-4000-8000-000000000001',
      '잔금',
      '   ',
      'invalid title',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.cs_ticket (
      project_id, customer_id, category, title, description, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '55000000-0000-4000-8000-000000000001',
      '잔금',
      'blank description',
      '   ',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.cs_ticket (
      project_id, customer_id, category, title, description, created_by,
      status, resolved_at
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '55000000-0000-4000-8000-000000000001',
      '잔금',
      'open with resolved',
      'invalid',
      '40000000-0000-4000-8000-00000000000a',
      'OPEN',
      now()
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.cs_ticket (
      project_id, customer_id, category, title, description, created_by,
      status, resolved_at
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '55000000-0000-4000-8000-000000000001',
      '잔금',
      'resolved no resolution',
      'invalid',
      '40000000-0000-4000-8000-00000000000a',
      'RESOLVED',
      now()
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.cs_ticket (
      project_id, customer_id, category, title, description, created_by,
      status, resolved_at, resolution
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '55000000-0000-4000-8000-000000000001',
      '잔금',
      'resolved blank resolution',
      'invalid',
      '40000000-0000-4000-8000-00000000000a',
      'RESOLVED',
      now(),
      '   '
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.cs_ticket (
      project_id, customer_id, category, title, description, created_by,
      status, resolved_at, resolution
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '55000000-0000-4000-8000-000000000001',
      '잔금',
      'closed missing closed_at',
      'invalid',
      '40000000-0000-4000-8000-00000000000a',
      'CLOSED',
      now(),
      '처리 완료'
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.cs_ticket (
      project_id, customer_id, category, title, description, created_by,
      opened_at, due_at
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '55000000-0000-4000-8000-000000000001',
      '잔금',
      'due before opened',
      'invalid',
      '40000000-0000-4000-8000-00000000000a',
      '2026-09-07 10:00:00+09',
      '2026-09-07 09:00:00+09'
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.cs_ticket (
      project_id, customer_id, category, title, description, created_by,
      status, opened_at, resolved_at, resolution
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '55000000-0000-4000-8000-000000000001',
      '잔금',
      'resolved before opened',
      'invalid',
      '40000000-0000-4000-8000-00000000000a',
      'RESOLVED',
      '2026-09-07 10:00:00+09',
      '2026-09-07 09:00:00+09',
      '처리'
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.cs_ticket (
      project_id, customer_id, category, title, description, created_by,
      status, opened_at, resolved_at, closed_at, resolution
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '55000000-0000-4000-8000-000000000001',
      '잔금',
      'closed before resolved',
      'invalid',
      '40000000-0000-4000-8000-00000000000a',
      'CLOSED',
      '2026-09-07 08:00:00+09',
      '2026-09-07 10:00:00+09',
      '2026-09-07 09:00:00+09',
      '처리'
    );
  $$,
  '23514'
);

select lives_ok(
  $$
    insert into public.cs_ticket (
      project_id, customer_id, category, title, description, created_by,
      status, opened_at, resolved_at, closed_at, resolution
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '55000000-0000-4000-8000-000000000001',
      '잔금',
      'closed ok',
      '정상 종결',
      '40000000-0000-4000-8000-00000000000a',
      'CLOSED',
      '2026-09-07 08:00:00+09',
      '2026-09-07 09:00:00+09',
      '2026-09-07 10:00:00+09',
      '서류 재전송 후 고객 확인'
    );
  $$,
  'CLOSED with resolution and ordered timestamps succeeds'
);

select * from finish();
rollback;
