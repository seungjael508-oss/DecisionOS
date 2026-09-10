begin;

select no_plan();

-- TODO(M9/M10):
-- - generated_data / report_date / version / template_id / report_phase / report_type
--   direct UPDATE 차단
-- - regenerate는 새 row만 생성, supersedes로 이전 report 보존
-- - generate_report()에서 template.organization_id = project.organization_id
--   AND (template.project_id IS NULL OR template.project_id = report.project_id)
-- - 회사양식 보고서는 template_id 필수 가능
-- - REPORT hard delete 운영 차단

select has_table('public'::name, 'report_template'::name);
select col_not_null('public'::name, 'report_template'::name, 'organization_id'::name);
select col_is_null('public'::name, 'report_template'::name, 'project_id'::name);
select col_is_pk('public'::name, 'report_template'::name, 'template_id'::name);
select col_default_is(
  'public'::name, 'report_template'::name, 'active'::name, 'true',
  'active default true'
);
select has_trigger(
  'public'::name, 'report_template'::name, 'set_updated_at'::name
);

select has_table('public'::name, 'report'::name);
select col_is_pk('public'::name, 'report'::name, 'report_id'::name);
select col_is_null('public'::name, 'report'::name, 'template_id'::name);
select col_default_is(
  'public'::name, 'report'::name, 'version'::name, '1', 'version default 1'
);
select hasnt_column('public'::name, 'report'::name, 'updated_at'::name);

select has_index(
  'public'::name,
  'report_template'::name,
  'idx_report_template_org_active'::name,
  array['organization_id', 'active']::name[]
);
select has_index(
  'public'::name,
  'report_template'::name,
  'idx_report_template_project_phase_type'::name,
  array['project_id', 'report_phase', 'report_type']::name[]
);
select has_index(
  'public'::name,
  'report'::name,
  'idx_report_project_date'::name,
  array['project_id', 'report_date']::name[]
);
select has_index(
  'public'::name,
  'report'::name,
  'idx_report_project_type_date'::name,
  array['project_id', 'report_type', 'report_date']::name[]
);
select has_index(
  'public'::name,
  'report'::name,
  'idx_report_project_phase_date'::name,
  array['project_id', 'report_phase', 'report_date']::name[]
);
select has_index(
  'public'::name,
  'report'::name,
  'idx_report_supersedes'::name,
  array['supersedes_report_id']::name[]
);

select lives_ok(
  $$
    insert into public.report_template (
      template_id, organization_id, project_id, report_phase, report_type,
      name, template_definition, mapping_definition, source_type
    ) values (
      'a3000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      null,
      'MOVE_IN',
      'DAILY',
      'Org shared daily',
      '{}'::jsonb,
      '{}'::jsonb,
      'MANUAL'
    );
  $$,
  'organization-shared template (project_id NULL) succeeds'
);

select lives_ok(
  $$
    insert into public.report_template (
      template_id, organization_id, project_id, report_phase, report_type,
      name, template_definition, mapping_definition, source_type
    ) values (
      'a3000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001',
      'MOVE_IN',
      'DAILY',
      'Project one daily',
      '{}'::jsonb,
      '{}'::jsonb,
      'PHOTO'
    );
  $$,
  'same-organization project template succeeds'
);

select throws_ok(
  $$
    insert into public.report_template (
      organization_id, project_id, report_phase, report_type,
      name, template_definition, mapping_definition, source_type
    ) values (
      '10000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000002',
      'MOVE_IN',
      'DAILY',
      'cross org project',
      '{}'::jsonb,
      '{}'::jsonb,
      'MANUAL'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.report_template (
      organization_id, report_phase, report_type,
      name, template_definition, mapping_definition, source_type
    ) values (
      '10000000-0000-4000-8000-000000000099',
      'MOVE_IN',
      'DAILY',
      'missing org',
      '{}'::jsonb,
      '{}'::jsonb,
      'MANUAL'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.report_template (
      organization_id, project_id, report_phase, report_type,
      name, template_definition, mapping_definition, source_type
    ) values (
      '10000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000099',
      'MOVE_IN',
      'DAILY',
      'missing project',
      '{}'::jsonb,
      '{}'::jsonb,
      'MANUAL'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.report_template (
      organization_id, report_phase, report_type,
      name, template_definition, mapping_definition, source_type
    ) values (
      '10000000-0000-4000-8000-000000000001',
      'MOVE_IN',
      'DAILY',
      '',
      '{}'::jsonb,
      '{}'::jsonb,
      'MANUAL'
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.report_template (
      organization_id, report_phase, report_type,
      name, template_definition, mapping_definition, source_type
    ) values (
      '10000000-0000-4000-8000-000000000001',
      'MOVE_IN',
      'DAILY',
      '   ',
      '{}'::jsonb,
      '{}'::jsonb,
      'MANUAL'
    );
  $$,
  '23514'
);

select lives_ok(
  $$
    insert into public.report_template (
      organization_id, report_phase, report_type,
      name, template_definition, mapping_definition, source_type
    ) values
      (
        '10000000-0000-4000-8000-000000000001',
        'SALES', 'WEEKLY', 'src screenshot',
        '{}'::jsonb, '{}'::jsonb, 'SCREENSHOT'
      ),
      (
        '10000000-0000-4000-8000-000000000001',
        'SALES', 'WEEKLY', 'src excel',
        '{}'::jsonb, '{}'::jsonb, 'EXCEL'
      );
  $$,
  'SCREENSHOT and EXCEL source_type succeed'
);

select lives_ok(
  $$
    insert into public.report_template (
      organization_id, project_id, report_phase, report_type,
      name, template_definition, mapping_definition, source_type, active
    ) values
      (
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000001',
        'MOVE_IN',
        'DAILY',
        'Second active daily',
        '{}'::jsonb,
        '{}'::jsonb,
        'MANUAL',
        true
      ),
      (
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000001',
        'MOVE_IN',
        'DAILY',
        'Third active daily',
        '{}'::jsonb,
        '{}'::jsonb,
        'MANUAL',
        true
      );
  $$,
  'multiple templates of same org/project/type stay allowed'
);

select is(
  (
    select active
    from public.report_template
    where template_id = 'a3000000-0000-4000-8000-000000000001'
  ),
  true,
  'active defaults to true'
);

select lives_ok(
  $$
    insert into public.report (
      report_id, project_id, template_id, report_phase, report_type,
      report_date, generated_data, generated_by
    ) values (
      'a4000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001',
      'a3000000-0000-4000-8000-000000000002',
      'MOVE_IN',
      'DAILY',
      '2026-09-07',
      '{"contacts":10}'::jsonb,
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  'report with template and generated_data succeeds'
);

select lives_ok(
  $$
    insert into public.report (
      report_id, project_id, template_id, report_phase, report_type,
      report_date, generated_data, generated_by
    ) values (
      'a4000000-0000-4000-8000-000000000002',
      '20000000-0000-4000-8000-000000000001',
      null,
      'MOVE_IN',
      'DAILY',
      '2026-09-08',
      '{}'::jsonb,
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  'report with NULL template_id succeeds'
);

select is(
  (
    select version
    from public.report
    where report_id = 'a4000000-0000-4000-8000-000000000001'
  ),
  1,
  'new report version defaults to 1'
);

select throws_ok(
  $$
    insert into public.report (
      project_id, report_phase, report_type, report_date,
      generated_data, generated_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'MOVE_IN',
      'DAILY',
      '2026-09-07',
      '{}'::jsonb,
      '40000000-0000-4000-8000-00000000000b'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.report (
      project_id, report_phase, report_type, report_date,
      generated_data, generated_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'MOVE_IN',
      'DAILY',
      '2026-09-07',
      '{}'::jsonb,
      '40000000-0000-4000-8000-000000000099'
    );
  $$,
  '23503'
);

select lives_ok(
  $$
    insert into public.report (
      report_id, project_id, report_phase, report_type, report_date,
      generated_data, version, generated_by
    ) values (
      'a4000000-0000-4000-8000-000000000003',
      '20000000-0000-4000-8000-000000000001',
      'MOVE_IN',
      'DAILY',
      '2026-09-09',
      '{}'::jsonb,
      1,
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  'explicit version 1 succeeds'
);

select throws_ok(
  $$
    insert into public.report (
      project_id, report_phase, report_type, report_date,
      generated_data, version, generated_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'MOVE_IN',
      'DAILY',
      '2026-09-09',
      '{}'::jsonb,
      0,
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    insert into public.report (
      project_id, report_phase, report_type, report_date,
      generated_data, version, generated_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'MOVE_IN',
      'DAILY',
      '2026-09-09',
      '{}'::jsonb,
      -1,
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23514'
);

select lives_ok(
  $$
    insert into public.report (
      report_id, project_id, report_phase, report_type, report_date,
      generated_data, version, supersedes_report_id, generated_by
    ) values (
      'a4000000-0000-4000-8000-000000000004',
      '20000000-0000-4000-8000-000000000001',
      'MOVE_IN',
      'DAILY',
      '2026-09-07',
      '{"contacts":11}'::jsonb,
      2,
      'a4000000-0000-4000-8000-000000000001',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  'same-project supersedes succeeds'
);

insert into public.report (
  report_id, project_id, report_phase, report_type, report_date,
  generated_data, generated_by
) values (
  'a4000000-0000-4000-8000-0000000000b1',
  '20000000-0000-4000-8000-000000000002',
  'MOVE_IN',
  'DAILY',
  '2026-09-07',
  '{}'::jsonb,
  '40000000-0000-4000-8000-00000000000b'
);

select throws_ok(
  $$
    insert into public.report (
      project_id, report_phase, report_type, report_date,
      generated_data, supersedes_report_id, generated_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'MOVE_IN',
      'DAILY',
      '2026-09-07',
      '{}'::jsonb,
      'a4000000-0000-4000-8000-0000000000b1',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    insert into public.report (
      report_id, project_id, report_phase, report_type, report_date,
      generated_data, supersedes_report_id, generated_by
    ) values (
      'a4000000-0000-4000-8000-0000000000aa',
      '20000000-0000-4000-8000-000000000001',
      'MOVE_IN',
      'DAILY',
      '2026-09-10',
      '{}'::jsonb,
      'a4000000-0000-4000-8000-0000000000aa',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23514'
);

select throws_ok(
  $$
    delete from public.report
    where report_id = 'a4000000-0000-4000-8000-000000000001';
  $$,
  '23503'
);

select lives_ok(
  $$
    insert into public.report (
      project_id, template_id, report_phase, report_type, report_date,
      generated_data, generated_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'a3000000-0000-4000-8000-000000000001',
      'MOVE_IN',
      'DAILY',
      '2026-09-11',
      '{}'::jsonb,
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  'existing template_id attaches successfully'
);

select throws_ok(
  $$
    insert into public.report (
      project_id, template_id, report_phase, report_type, report_date,
      generated_data, generated_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'a3000000-0000-4000-8000-000000000099',
      'MOVE_IN',
      'DAILY',
      '2026-09-11',
      '{}'::jsonb,
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  '23503'
);

select throws_ok(
  $$
    delete from public.report_template
    where template_id = 'a3000000-0000-4000-8000-000000000002';
  $$,
  '23503'
);

select * from finish();
rollback;
