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
