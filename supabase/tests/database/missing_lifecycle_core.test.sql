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

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create function pg_temp.impersonate(p_user_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', p_user_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
end;
$$;

insert into public.project_unit (unit_id, project_id, building_no, unit_no)
values
  ('7b000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '811', '101'),
  ('7b000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '811', '101');

insert into public.customer (
  id, project_id, name, phone, phone_normalized, assigned_counselor_id
) values
  (
    '5b000000-0000-4000-8000-0000000000a1',
    '20000000-0000-4000-8000-000000000001',
    'Core Customer A',
    '01093000001',
    '01093000001',
    '40000000-0000-4000-8000-00000000000a'
  ),
  (
    '5b000000-0000-4000-8000-0000000000b1',
    '20000000-0000-4000-8000-000000000002',
    'Core Customer B',
    '01093000002',
    '01093000002',
    '40000000-0000-4000-8000-00000000000b'
  );

insert into public.contract (
  contract_id, project_id, customer_id, unit_id, contract_status
) values
  (
    '9b000000-0000-4000-8000-0000000000a1',
    '20000000-0000-4000-8000-000000000001',
    '5b000000-0000-4000-8000-0000000000a1',
    '7b000000-0000-4000-8000-000000000001',
    'ACTIVE'
  ),
  (
    '9b000000-0000-4000-8000-0000000000b1',
    '20000000-0000-4000-8000-000000000002',
    '5b000000-0000-4000-8000-0000000000b1',
    '7b000000-0000-4000-8000-000000000002',
    'ACTIVE'
  );

select has_table('public'::name, 'entry_pool'::name);
select has_table('public'::name, 'contact_schedule'::name);
select has_table('public'::name, 'funnel_event'::name);
select has_table('public'::name, 'community_notice'::name);
select col_is_pk('public'::name, 'entry_pool'::name, 'entry_id'::name);
select col_is_pk('public'::name, 'contact_schedule'::name, 'schedule_id'::name);
select hasnt_column('public'::name, 'funnel_event'::name, 'updated_at'::name);
select has_trigger('public'::name, 'entry_pool'::name, 'set_updated_at'::name);

insert into public.entry_pool (
  entry_id, project_id, phone_normalized
) values (
  'e1000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '01093100001'
);

select throws_ok(
  $$
    insert into public.entry_pool (project_id, phone_normalized)
    values ('20000000-0000-4000-8000-000000000001', '01093100001');
  $$,
  '23505'
);

select lives_ok(
  $$
    insert into public.entry_pool (project_id, phone_normalized)
    values ('20000000-0000-4000-8000-000000000002', '01093100001');
  $$,
  'same phone in another project succeeds'
);

select throws_ok(
  $$
    insert into public.entry_pool (
      project_id, phone_normalized, catalog_view_count
    ) values (
      '20000000-0000-4000-8000-000000000001', '01093100002', -1
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.entry_pool (
      project_id, phone_normalized, price_view_count
    ) values (
      '20000000-0000-4000-8000-000000000001', '01093100003', -1
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.entry_pool (project_id, phone_normalized, status)
    values ('20000000-0000-4000-8000-000000000001', '01093100004', 'INVALID');
  $$,
  '23514'
);

insert into public.contact_schedule (
  schedule_id, project_id, customer_id, contact_type, planned_at, created_by
) values (
  'd1000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '5b000000-0000-4000-8000-0000000000a1',
  'CALL',
  now(),
  '40000000-0000-4000-8000-00000000000a'
);

select throws_ok(
  $$
    insert into public.contact_schedule (
      project_id, customer_id, contact_type, planned_at, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '5b000000-0000-4000-8000-0000000000b1',
      'CALL',
      now(),
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.contact_schedule (
      project_id, customer_id, unit_id, contact_type, planned_at, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '5b000000-0000-4000-8000-0000000000a1',
      '7b000000-0000-4000-8000-000000000002',
      'CALL',
      now(),
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.contact_schedule (
      project_id, customer_id, contact_type, planned_at, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '5b000000-0000-4000-8000-0000000000a1',
      'CALL',
      now(),
      '40000000-0000-4000-8000-00000000000b'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.contact_schedule (
      project_id, customer_id, contact_type, planned_at,
      result_consultation_id, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '5b000000-0000-4000-8000-0000000000a1',
      'CALL',
      now(),
      '60000000-0000-4000-8000-0000000000b1',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.contact_schedule (
      project_id, customer_id, contact_type, planned_at, status, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '5b000000-0000-4000-8000-0000000000a1',
      'CALL',
      now(),
      'SENT',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23514'
);

select lives_ok(
  $$
    insert into public.contact_schedule (
      project_id, customer_id, contact_type, planned_at, status, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '5b000000-0000-4000-8000-0000000000a1',
      'CALL',
      now(),
      'PENDING',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  'PENDING contact_schedule succeeds'
);

insert into public.funnel_event (
  event_id, project_id, customer_id, event_type, created_by
) values (
  'f1000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '5b000000-0000-4000-8000-0000000000a1',
  'CALL',
  '40000000-0000-4000-8000-00000000000a'
);

select throws_ok(
  $$
    insert into public.funnel_event (
      project_id, customer_id, event_type, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '5b000000-0000-4000-8000-0000000000b1',
      'CALL',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.funnel_event (
      project_id, customer_id, event_type, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '5b000000-0000-4000-8000-0000000000a1',
      'CALL',
      '40000000-0000-4000-8000-00000000000b'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.community_notice (
      project_id, target_type, title, content, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'GENERAL',
      '',
      '본문',
      '40000000-0000-4000-8000-0000000000c1'
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.community_notice (
      project_id, target_type, title, content, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'GENERAL',
      '제목',
      '   ',
      '40000000-0000-4000-8000-0000000000c1'
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.community_notice (
      project_id, target_type, title, content, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'ALL',
      '제목',
      '본문',
      '40000000-0000-4000-8000-0000000000c1'
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.community_notice (
      project_id, target_type, title, content, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'GENERAL',
      '제목',
      '본문',
      '40000000-0000-4000-8000-00000000000b'
    );
  $$,
  '23503'
);

insert into public.community_notice (
  notice_id, project_id, target_type, title, content, created_by
) values (
  'aa000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'GENERAL',
  '공지',
  '본문',
  '40000000-0000-4000-8000-0000000000c1'
);

set local role authenticated;
select pg_temp.impersonate('30000000-0000-4000-8000-00000000000a');

select isnt_empty(
  $$ select entry_id from public.entry_pool
     where entry_id = 'e1000000-0000-4000-8000-000000000001' $$,
  'counselor selects same-project entry'
);
select is_empty(
  $$ select entry_id from public.entry_pool
     where project_id = '20000000-0000-4000-8000-000000000002' $$,
  'counselor cannot select other-project entry'
);

select lives_ok(
  $$
    insert into public.entry_pool (project_id, phone_normalized)
    values ('20000000-0000-4000-8000-000000000001', '01093100010');
  $$,
  'COUNSELOR inserts entry_pool'
);

select throws_ok(
  $$ delete from public.entry_pool
     where entry_id = 'e1000000-0000-4000-8000-000000000001' $$,
  '42501'
);

select isnt_empty(
  $$ select schedule_id from public.contact_schedule
     where schedule_id = 'd1000000-0000-4000-8000-000000000001' $$,
  'counselor selects same-project contact_schedule'
);

select throws_ok(
  $$
    insert into public.contact_schedule (
      project_id, customer_id, contact_type, planned_at, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '5b000000-0000-4000-8000-0000000000a1',
      'CALL',
      now(),
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '42501'
);
select throws_ok(
  $$ update public.contact_schedule set contact_type = 'VISIT' $$,
  '42501'
);
select throws_ok(
  $$ delete from public.contact_schedule
     where schedule_id = 'd1000000-0000-4000-8000-000000000001' $$,
  '42501'
);

select isnt_empty(
  $$ select event_id from public.funnel_event
     where event_id = 'f1000000-0000-4000-8000-000000000001' $$,
  'counselor selects same-project funnel_event'
);
select throws_ok(
  $$
    insert into public.funnel_event (
      project_id, customer_id, event_type, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '5b000000-0000-4000-8000-0000000000a1',
      'VISIT',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '42501'
);
select throws_ok($$ update public.funnel_event set event_type = 'X' $$, '42501');
select throws_ok($$ delete from public.funnel_event $$, '42501');

select throws_ok(
  $$
    insert into public.community_notice (
      project_id, target_type, title, content, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'GENERAL',
      'counselor notice',
      '본문',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '42501'
);

select pg_temp.impersonate('30000000-0000-4000-8000-00000000000b');
select is_empty(
  $$ select event_id from public.funnel_event
     where event_id = 'f1000000-0000-4000-8000-000000000001' $$,
  'counselor B cannot select project-one funnel_event'
);

select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c1');
select lives_ok(
  $$
    insert into public.entry_pool (project_id, phone_normalized)
    values ('20000000-0000-4000-8000-000000000001', '01093100011');
  $$,
  'PROJECT_ADMIN inserts entry_pool'
);
select lives_ok(
  $$
    insert into public.community_notice (
      project_id, target_type, title, content, created_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'CONTRACT_HOLDER',
      'admin notice',
      '본문',
      '40000000-0000-4000-8000-0000000000c1'
    );
  $$,
  'PROJECT_ADMIN inserts community_notice'
);
select throws_ok(
  $$ delete from public.community_notice
     where notice_id = 'aa000000-0000-4000-8000-000000000001' $$,
  '42501'
);

reset role;

select * from finish();
rollback;
