-- Local-only seed data. Passwords are development values, not production credentials.
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token,
  is_anonymous
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '30000000-0000-4000-8000-00000000000a',
    'authenticated',
    'authenticated',
    'counselor-a@example.test',
    extensions.crypt('local-dev-password', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    '',
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '30000000-0000-4000-8000-00000000000b',
    'authenticated',
    'authenticated',
    'counselor-b@example.test',
    extensions.crypt('local-dev-password', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    '',
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '30000000-0000-4000-8000-0000000000c1',
    'authenticated',
    'authenticated',
    'admin-p1@example.test',
    extensions.crypt('local-dev-password', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    '',
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '30000000-0000-4000-8000-0000000000c2',
    'authenticated',
    'authenticated',
    'admin-p2@example.test',
    extensions.crypt('local-dev-password', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    '',
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '30000000-0000-4000-8000-00000000000e',
    'authenticated',
    'authenticated',
    'team-lead@example.test',
    extensions.crypt('local-dev-password', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    '',
    false
  );

insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
values
  (
    '30000000-0000-4000-8000-00000000000a',
    '30000000-0000-4000-8000-00000000000a',
    jsonb_build_object(
      'sub', '30000000-0000-4000-8000-00000000000a',
      'email', 'counselor-a@example.test',
      'email_verified', true
    ),
    'email',
    '30000000-0000-4000-8000-00000000000a',
    now(),
    now(),
    now()
  ),
  (
    '30000000-0000-4000-8000-00000000000b',
    '30000000-0000-4000-8000-00000000000b',
    jsonb_build_object(
      'sub', '30000000-0000-4000-8000-00000000000b',
      'email', 'counselor-b@example.test',
      'email_verified', true
    ),
    'email',
    '30000000-0000-4000-8000-00000000000b',
    now(),
    now(),
    now()
  ),
  (
    '30000000-0000-4000-8000-0000000000c1',
    '30000000-0000-4000-8000-0000000000c1',
    jsonb_build_object(
      'sub', '30000000-0000-4000-8000-0000000000c1',
      'email', 'admin-p1@example.test',
      'email_verified', true
    ),
    'email',
    '30000000-0000-4000-8000-0000000000c1',
    now(),
    now(),
    now()
  ),
  (
    '30000000-0000-4000-8000-0000000000c2',
    '30000000-0000-4000-8000-0000000000c2',
    jsonb_build_object(
      'sub', '30000000-0000-4000-8000-0000000000c2',
      'email', 'admin-p2@example.test',
      'email_verified', true
    ),
    'email',
    '30000000-0000-4000-8000-0000000000c2',
    now(),
    now(),
    now()
  ),
  (
    '30000000-0000-4000-8000-00000000000e',
    '30000000-0000-4000-8000-00000000000e',
    jsonb_build_object(
      'sub', '30000000-0000-4000-8000-00000000000e',
      'email', 'team-lead@example.test',
      'email_verified', true
    ),
    'email',
    '30000000-0000-4000-8000-00000000000e',
    now(),
    now(),
    now()
  );

insert into public.organization (id, name, status)
values
  ('10000000-0000-4000-8000-000000000001', 'Organization One', 'ACTIVE'),
  ('10000000-0000-4000-8000-000000000002', 'Organization Two', 'ACTIVE');

insert into public.project (id, organization_id, name, timezone, status)
values
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'Project One',
    'Asia/Seoul',
    'ACTIVE'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    'Project Two',
    'Asia/Seoul',
    'ACTIVE'
  );

insert into public.project_member (id, project_id, user_id, role, active)
values
  (
    '40000000-0000-4000-8000-00000000000a',
    '20000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-00000000000a',
    'COUNSELOR',
    true
  ),
  (
    '40000000-0000-4000-8000-00000000000b',
    '20000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-00000000000b',
    'COUNSELOR',
    true
  ),
  (
    '40000000-0000-4000-8000-0000000000c1',
    '20000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-0000000000c1',
    'PROJECT_ADMIN',
    true
  ),
  (
    '40000000-0000-4000-8000-0000000000c2',
    '20000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-0000000000c2',
    'PROJECT_ADMIN',
    true
  ),
  (
    '40000000-0000-4000-8000-00000000000e',
    '20000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-00000000000e',
    'TEAM_LEAD',
    true
  );

-- Cross-assignment counselor in Project One, plus an inactive counselor for denial tests.
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token,
  is_anonymous
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '30000000-0000-4000-8000-00000000000f',
    'authenticated',
    'authenticated',
    'counselor-f@example.test',
    extensions.crypt('local-dev-password', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    '',
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '30000000-0000-4000-8000-00000000000d',
    'authenticated',
    'authenticated',
    'inactive-d@example.test',
    extensions.crypt('local-dev-password', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    '',
    false
  );

insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
values
  (
    '30000000-0000-4000-8000-00000000000f',
    '30000000-0000-4000-8000-00000000000f',
    jsonb_build_object(
      'sub', '30000000-0000-4000-8000-00000000000f',
      'email', 'counselor-f@example.test',
      'email_verified', true
    ),
    'email',
    '30000000-0000-4000-8000-00000000000f',
    now(),
    now(),
    now()
  ),
  (
    '30000000-0000-4000-8000-00000000000d',
    '30000000-0000-4000-8000-00000000000d',
    jsonb_build_object(
      'sub', '30000000-0000-4000-8000-00000000000d',
      'email', 'inactive-d@example.test',
      'email_verified', true
    ),
    'email',
    '30000000-0000-4000-8000-00000000000d',
    now(),
    now(),
    now()
  );

insert into public.project_member (id, project_id, user_id, role, active)
values
  (
    '40000000-0000-4000-8000-00000000000f',
    '20000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-00000000000f',
    'COUNSELOR',
    true
  ),
  (
    '40000000-0000-4000-8000-00000000000d',
    '20000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-00000000000d',
    'COUNSELOR',
    false
  );

insert into public.customer (
  id,
  project_id,
  name,
  phone,
  phone_normalized,
  status,
  grade,
  assigned_counselor_id
)
values
  (
    '50000000-0000-4000-8000-0000000000a1',
    '20000000-0000-4000-8000-000000000001',
    'Customer A1',
    '010-1111-1111',
    '01011111111',
    'ACTIVE',
    'C',
    '40000000-0000-4000-8000-00000000000a'
  ),
  (
    '50000000-0000-4000-8000-0000000000b1',
    '20000000-0000-4000-8000-000000000002',
    'Customer B1',
    '010-2222-2222',
    '01022222222',
    'ACTIVE',
    'B',
    '40000000-0000-4000-8000-00000000000b'
  ),
  (
    '50000000-0000-4000-8000-0000000000f1',
    '20000000-0000-4000-8000-000000000001',
    'Customer F1',
    '010-3333-3333',
    '01033333333',
    'ACTIVE',
    'C',
    '40000000-0000-4000-8000-00000000000f'
  ),
  (
    '50000000-0000-4000-8000-000000000011',
    '20000000-0000-4000-8000-000000000001',
    'Customer Unassigned',
    '010-4444-4444',
    '01044444444',
    'ACTIVE',
    'C',
    null
  ),
  (
    '50000000-0000-4000-8000-0000000000d1',
    '20000000-0000-4000-8000-000000000001',
    'Customer Inactive Assignee',
    '010-5555-5555',
    '01055555555',
    'ACTIVE',
    'C',
    '40000000-0000-4000-8000-00000000000d'
  );

insert into public.consultation (
  id,
  project_id,
  customer_id,
  counselor_id,
  consulted_at,
  content,
  created_by
)
values
  (
    '60000000-0000-4000-8000-0000000000a1',
    '20000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-0000000000a1',
    '40000000-0000-4000-8000-00000000000a',
    '2026-08-01 01:00:00+00',
    'Project One consultation for counselor A',
    '40000000-0000-4000-8000-00000000000a'
  ),
  (
    '60000000-0000-4000-8000-0000000000b1',
    '20000000-0000-4000-8000-000000000002',
    '50000000-0000-4000-8000-0000000000b1',
    '40000000-0000-4000-8000-00000000000b',
    '2026-08-01 02:00:00+00',
    'Project Two consultation for counselor B',
    '40000000-0000-4000-8000-00000000000b'
  ),
  (
    '60000000-0000-4000-8000-0000000000f1',
    '20000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-0000000000f1',
    '40000000-0000-4000-8000-00000000000f',
    '2026-08-01 03:00:00+00',
    'Project One consultation for counselor F',
    '40000000-0000-4000-8000-00000000000f'
  );

insert into public.customer_status_log (
  id,
  project_id,
  customer_id,
  consultation_id,
  grade_before,
  grade_after,
  reason,
  changed_by
)
values
  (
    '70000000-0000-4000-8000-0000000000a1',
    '20000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-0000000000a1',
    '60000000-0000-4000-8000-0000000000a1',
    null,
    'C',
    'seed',
    '40000000-0000-4000-8000-00000000000a'
  ),
  (
    '70000000-0000-4000-8000-0000000000b1',
    '20000000-0000-4000-8000-000000000002',
    '50000000-0000-4000-8000-0000000000b1',
    '60000000-0000-4000-8000-0000000000b1',
    null,
    'B',
    'seed',
    '40000000-0000-4000-8000-00000000000b'
  ),
  (
    '70000000-0000-4000-8000-0000000000f1',
    '20000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-0000000000f1',
    '60000000-0000-4000-8000-0000000000f1',
    null,
    'C',
    'seed',
    '40000000-0000-4000-8000-00000000000f'
  );
