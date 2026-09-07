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

insert into auth.users (id)
values ('30000000-0000-4000-8000-0000000000c1')
on conflict (id) do nothing;

insert into public.project_member (id, project_id, user_id, role, active)
values (
  '40000000-0000-4000-8000-0000000000c1',
  '20000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-0000000000c1',
  'PROJECT_ADMIN',
  true
);

insert into public.report_template (
  report_template_id, project_id, name, report_type, template_schema
) values
  (
    'a1000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'Move-in daily',
    'DAILY',
    '{"sections":["occupancy","consultation"]}'::jsonb
  ),
  (
    'a1000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    'Project two daily',
    'DAILY',
    '{"sections":["occupancy"]}'::jsonb
  );

select has_table('public'::name, 'report_template'::name);
select has_table('public'::name, 'report'::name);
select col_is_pk(
  'public'::name, 'report_template'::name, 'report_template_id'::name
);
select col_is_pk('public'::name, 'report'::name, 'report_id'::name);
select col_type_is(
  'public'::name, 'report_template'::name, 'report_type'::name, 'report_type'
);
select col_type_is(
  'public'::name, 'report'::name, 'report_type'::name, 'report_type'
);
select col_type_is(
  'public'::name, 'report_template'::name, 'template_schema'::name, 'jsonb'
);
select col_type_is('public'::name, 'report'::name, 'content'::name, 'jsonb');
select col_default_is(
  'public'::name, 'report'::name, 'status'::name, 'DRAFT', 'report status default'
);

select ok(
  not exists (select 1 from pg_type where typname = 'report_status'),
  'no report_status enum is added'
);

select ok(
  (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'report_template'
  ),
  'report_template has RLS enabled'
);
select ok(
  (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'report'
  ),
  'report has RLS enabled'
);
select is(
  (
    select count(*)::integer from pg_policies
    where schemaname = 'public'
      and tablename in ('report_template', 'report')
  ),
  0,
  'report tables have no RLS policies'
);

select ok(
  not has_table_privilege('anon', 'public.report_template', 'SELECT')
  and not has_table_privilege('anon', 'public.report', 'SELECT'),
  'anon cannot select report tables'
);
select ok(
  not has_table_privilege('authenticated', 'public.report_template', 'SELECT')
  and not has_table_privilege('authenticated', 'public.report', 'SELECT')
  and not has_table_privilege('authenticated', 'public.report', 'INSERT')
  and not has_table_privilege('authenticated', 'public.report', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.report', 'DELETE'),
  'authenticated cannot directly access report tables'
);

select throws_ok(
  $$
    set local role authenticated;
    select 1 from public.report;
  $$,
  '42501'
);

select throws_ok(
  $$
    set local role anon;
    select 1 from public.report_template;
  $$,
  '42501'
);

reset role;

select lives_ok(
  $$
    insert into public.report (
      report_id, project_id, report_template_id, report_type,
      period_start, period_end, title, generated_by
    ) values (
      'a2000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001',
      'a1000000-0000-4000-8000-000000000001',
      'DAILY',
      '2026-09-07',
      '2026-09-07',
      'Draft one',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  'same-project DRAFT succeeds'
);

select lives_ok(
  $$
    insert into public.report (
      project_id, report_template_id, report_type,
      period_start, period_end, title, generated_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'a1000000-0000-4000-8000-000000000001',
      'DAILY',
      '2026-09-07',
      '2026-09-07',
      'Draft two',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  'multiple DRAFTs for the same template period are allowed'
);

select lives_ok(
  $$
    update public.report
    set content = '{"contacts":83}'::jsonb
    where report_id = 'a2000000-0000-4000-8000-000000000001';
  $$,
  'DRAFT content can be updated'
);

select throws_ok(
  $$
    insert into public.report (
      project_id, report_template_id, report_type,
      period_start, period_end, title, generated_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'a1000000-0000-4000-8000-000000000002',
      'DAILY',
      '2026-09-07',
      '2026-09-07',
      'Cross project template',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.report (
      project_id, report_template_id, report_type,
      period_start, period_end, title, generated_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'a1000000-0000-4000-8000-000000000001',
      'DAILY',
      '2026-09-07',
      '2026-09-07',
      'Cross project generator',
      '40000000-0000-4000-8000-00000000000b'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.report (
      project_id, report_template_id, report_type,
      period_start, period_end, title, generated_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'a1000000-0000-4000-8000-000000000001',
      'DAILY',
      '2026-09-08',
      '2026-09-07',
      'Reversed period',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23514'
);

select lives_ok(
  $$
    insert into public.report (
      report_id, project_id, report_template_id, report_type,
      period_start, period_end, title, content, status,
      generated_by, finalized_at, finalized_by
    ) values (
      'a2000000-0000-4000-8000-0000000000f1',
      '20000000-0000-4000-8000-000000000001',
      'a1000000-0000-4000-8000-000000000001',
      'DAILY',
      '2026-09-07',
      '2026-09-07',
      'Official daily',
      '{"contacts":83,"grade_a":21}'::jsonb,
      'FINAL',
      '40000000-0000-4000-8000-00000000000a',
      now(),
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  'FINAL insert with snapshot succeeds'
);

select throws_ok(
  $$
    insert into public.report (
      project_id, report_template_id, report_type,
      period_start, period_end, title, content, status,
      generated_by, finalized_at, finalized_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'a1000000-0000-4000-8000-000000000001',
      'DAILY',
      '2026-09-07',
      '2026-09-07',
      'Second official',
      '{"contacts":99}'::jsonb,
      'FINAL',
      '40000000-0000-4000-8000-00000000000a',
      now(),
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23505'
);

select throws_ok(
  $$
    insert into public.report (
      project_id, report_template_id, report_type,
      period_start, period_end, title, status,
      generated_by, finalized_at, finalized_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'a1000000-0000-4000-8000-000000000001',
      'DAILY',
      '2026-09-09',
      '2026-09-09',
      'Empty final',
      'FINAL',
      '40000000-0000-4000-8000-00000000000a',
      now(),
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.report (
      project_id, report_template_id, report_type,
      period_start, period_end, title, status,
      generated_by, finalized_at
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'a1000000-0000-4000-8000-000000000001',
      'DAILY',
      '2026-09-09',
      '2026-09-09',
      'Draft with finalized_at',
      'DRAFT',
      '40000000-0000-4000-8000-00000000000a',
      now()
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.report (
      project_id, report_template_id, report_type,
      period_start, period_end, title, content, status,
      generated_by, finalized_at, finalized_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'a1000000-0000-4000-8000-000000000001',
      'DAILY',
      '2026-09-10',
      '2026-09-10',
      'Cross project finalizer',
      '{"ok":true}'::jsonb,
      'FINAL',
      '40000000-0000-4000-8000-00000000000a',
      now(),
      '40000000-0000-4000-8000-00000000000b'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    update public.report
    set content = '{"contacts":1}'::jsonb
    where report_id = 'a2000000-0000-4000-8000-0000000000f1';
  $$,
  '23514'
);

select throws_ok(
  $$
    update public.report
    set status = 'DRAFT',
        finalized_at = null,
        finalized_by = null
    where report_id = 'a2000000-0000-4000-8000-0000000000f1';
  $$,
  '23514'
);

select throws_ok(
  $$
    update public.report
    set period_end = '2026-09-08'
    where report_id = 'a2000000-0000-4000-8000-0000000000f1';
  $$,
  '23514'
);

select throws_ok(
  $$
    update public.report
    set generated_at = generated_at + interval '1 second'
    where report_id = 'a2000000-0000-4000-8000-0000000000f1';
  $$,
  '23514'
);

select throws_ok(
  $$
    update public.report
    set report_type = 'WEEKLY'
    where report_id = 'a2000000-0000-4000-8000-0000000000f1';
  $$,
  '23514'
);

select throws_ok(
  $$
    update public.report
    set finalized_by = '40000000-0000-4000-8000-0000000000c1'
    where report_id = 'a2000000-0000-4000-8000-0000000000f1';
  $$,
  '23514'
);

select throws_ok(
  $$
    update public.report
    set finalized_at = finalized_at + interval '1 second'
    where report_id = 'a2000000-0000-4000-8000-0000000000f1';
  $$,
  '23514'
);

select lives_ok(
  $$
    update public.report
    set title = 'Official daily (display)'
    where report_id = 'a2000000-0000-4000-8000-0000000000f1';
  $$,
  'FINAL non-key title update is allowed'
);

select lives_ok(
  $$
    insert into public.report (
      report_id, project_id, report_template_id, report_type,
      period_start, period_end, title, generated_by
    ) values (
      'a2000000-0000-4000-8000-0000000000d3',
      '20000000-0000-4000-8000-000000000001',
      'a1000000-0000-4000-8000-000000000001',
      'WEEKLY',
      '2026-09-01',
      '2026-09-06',
      'Short week draft',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  'WEEKLY period is not forced to 7 days'
);

select hasnt_column('public'::name, 'report'::name, 'consultation_id'::name);
select hasnt_column('public'::name, 'report'::name, 'contract_id'::name);
select hasnt_column('public'::name, 'report'::name, 'unit_id'::name);
select hasnt_column('public'::name, 'report'::name, 'market_data_id'::name);

select * from finish();
rollback;
