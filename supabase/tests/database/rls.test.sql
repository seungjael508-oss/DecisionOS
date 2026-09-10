begin;

select no_plan();

-- Deterministic seed identifiers
-- org1 10000000-0000-4000-8000-000000000001
-- org2 10000000-0000-4000-8000-000000000002
-- p1   20000000-0000-4000-8000-000000000001
-- p2   20000000-0000-4000-8000-000000000002
-- users: A ...000a, B ...000b, adminP1 ...000c1, adminP2 ...000c2,
--        TEAM_LEAD ...000e, fellow F ...000f, inactive D ...000d

-- RLS must be on, with no delete policies, before any row access is trusted.
select ok(
  (select c.relrowsecurity
   from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'organization'),
  'organization has rls enabled'
);
select ok(
  (select c.relrowsecurity
   from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'project'),
  'project has rls enabled'
);
select ok(
  (select c.relrowsecurity
   from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'project_member'),
  'project_member has rls enabled'
);
select ok(
  (select c.relrowsecurity
   from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'customer'),
  'customer has rls enabled'
);
select ok(
  (select c.relrowsecurity
   from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'consultation'),
  'consultation has rls enabled'
);
select ok(
  (select c.relrowsecurity
   from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'customer_status_log'),
  'customer_status_log has rls enabled'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and cmd = 'DELETE'
      and tablename in (
        'organization',
        'project',
        'project_member',
        'customer',
        'consultation',
        'customer_status_log'
      )
  ),
  0,
  'no Phase 1 table has a delete policy'
);

select is(
  (
    select count(*)::integer
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and (
        coalesce(pg_get_expr(p.polqual, p.polrelid), '') ilike '%TEAM_LEAD%'
        or coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') ilike '%TEAM_LEAD%'
      )
  ),
  0,
  'no policy expression authorizes TEAM_LEAD'
);

select has_function('private'::name, 'current_project_member_id'::name);
select has_function('private'::name, 'has_project_role'::name);

select ok(not has_table_privilege('anon', 'public.organization', 'SELECT'), 'anon cannot select organization');
select ok(not has_table_privilege('anon', 'public.project', 'SELECT'), 'anon cannot select project');
select ok(not has_table_privilege('anon', 'public.project_member', 'SELECT'), 'anon cannot select project_member');
select ok(not has_table_privilege('anon', 'public.customer', 'SELECT'), 'anon cannot select customer');
select ok(not has_table_privilege('anon', 'public.consultation', 'SELECT'), 'anon cannot select consultation');
select ok(not has_table_privilege('anon', 'public.customer_status_log', 'SELECT'), 'anon cannot select customer_status_log');

select ok(not has_table_privilege('authenticated', 'public.organization', 'INSERT'), 'authenticated cannot insert organization');
select ok(not has_table_privilege('authenticated', 'public.organization', 'UPDATE'), 'authenticated cannot update organization');
select ok(not has_table_privilege('authenticated', 'public.organization', 'DELETE'), 'authenticated cannot delete organization');
select ok(not has_table_privilege('authenticated', 'public.project', 'INSERT'), 'authenticated cannot insert project');
select ok(not has_table_privilege('authenticated', 'public.project', 'UPDATE'), 'authenticated cannot update project');
select ok(not has_table_privilege('authenticated', 'public.project', 'DELETE'), 'authenticated cannot delete project');
select ok(not has_table_privilege('authenticated', 'public.project_member', 'INSERT'), 'authenticated cannot insert project_member');
select ok(not has_table_privilege('authenticated', 'public.project_member', 'UPDATE'), 'authenticated cannot update project_member');
select ok(not has_table_privilege('authenticated', 'public.project_member', 'DELETE'), 'authenticated cannot delete project_member');
select ok(not has_table_privilege('authenticated', 'public.customer', 'INSERT'), 'authenticated cannot insert customer');
select ok(not has_table_privilege('authenticated', 'public.customer', 'UPDATE'), 'authenticated cannot update customer');
select ok(not has_table_privilege('authenticated', 'public.customer', 'DELETE'), 'authenticated cannot delete customer');
select ok(not has_table_privilege('authenticated', 'public.consultation', 'INSERT'), 'authenticated cannot insert consultation');
select ok(not has_table_privilege('authenticated', 'public.consultation', 'UPDATE'), 'authenticated cannot update consultation');
select ok(not has_table_privilege('authenticated', 'public.consultation', 'DELETE'), 'authenticated cannot delete consultation');
select ok(not has_table_privilege('authenticated', 'public.customer_status_log', 'INSERT'), 'authenticated cannot insert customer_status_log');
select ok(not has_table_privilege('authenticated', 'public.customer_status_log', 'UPDATE'), 'authenticated cannot update customer_status_log');
select ok(not has_table_privilege('authenticated', 'public.customer_status_log', 'DELETE'), 'authenticated cannot delete customer_status_log');

select ok(has_table_privilege('authenticated', 'public.organization', 'SELECT'), 'authenticated can select organization');
select ok(has_table_privilege('authenticated', 'public.project', 'SELECT'), 'authenticated can select project');
select ok(has_table_privilege('authenticated', 'public.project_member', 'SELECT'), 'authenticated can select project_member');
select ok(has_table_privilege('authenticated', 'public.customer', 'SELECT'), 'authenticated can select customer');
select ok(has_table_privilege('authenticated', 'public.consultation', 'SELECT'), 'authenticated can select consultation');
select ok(has_table_privilege('authenticated', 'public.customer_status_log', 'SELECT'), 'authenticated can select customer_status_log');

create function pg_temp.impersonate(p_user_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', p_user_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', p_user_id::text,
      'role', 'authenticated',
      'email', p_user_id::text
    )::text,
    true
  );
end;
$$;

create function pg_temp.clear_auth()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', '', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;

-- Unauthenticated / anon
select pg_temp.clear_auth();
set local role anon;

select throws_ok(
  $$ select id from public.customer $$,
  '42501',
  'permission denied for table customer',
  'anon cannot select customer'
);
select throws_ok(
  $$ select id from public.consultation $$,
  '42501',
  'permission denied for table consultation',
  'anon cannot select consultation'
);
select throws_ok(
  $$ select id from public.project $$,
  '42501',
  'permission denied for table project',
  'anon cannot select project'
);

reset role;
select pg_temp.clear_auth();
set local role authenticated;

select is_empty(
  $$ select id from public.customer $$,
  'authenticated without jwt sees no customers'
);
select is_empty(
  $$ select id from public.project $$,
  'authenticated without jwt sees no projects'
);

-- Counselor A: assigned rows only
select pg_temp.impersonate('30000000-0000-4000-8000-00000000000a');

select results_eq(
  $$ select id from public.organization order by id $$,
  $$ values ('10000000-0000-4000-8000-000000000001'::uuid) $$,
  'counselor A sees only organization one'
);
select results_eq(
  $$ select id from public.project order by id $$,
  $$ values ('20000000-0000-4000-8000-000000000001'::uuid) $$,
  'counselor A sees only project one'
);
select results_eq(
  $$ select id from public.project_member order by id $$,
  $$ values ('40000000-0000-4000-8000-00000000000a'::uuid) $$,
  'counselor A sees only own membership'
);
select results_eq(
  $$ select id from public.customer order by id $$,
  $$ values ('50000000-0000-4000-8000-0000000000a1'::uuid) $$,
  'counselor A sees only currently assigned customers'
);
select results_eq(
  $$ select id from public.consultation order by id $$,
  $$ values ('60000000-0000-4000-8000-0000000000a1'::uuid) $$,
  'counselor A sees consultations for assigned customers only'
);
select results_eq(
  $$ select id from public.customer_status_log order by id $$,
  $$ values ('70000000-0000-4000-8000-0000000000a1'::uuid) $$,
  'counselor A sees grade history for assigned customers only'
);

-- Cross-assignment denial inside the same project
select is_empty(
  $$ select id from public.customer where id = '50000000-0000-4000-8000-0000000000f1' $$,
  'counselor A cannot read a same-project customer assigned to counselor F'
);
select is_empty(
  $$ select id from public.customer where id = '50000000-0000-4000-8000-000000000011' $$,
  'counselor A cannot read an unassigned same-project customer'
);
select is_empty(
  $$ select id from public.consultation where id = '60000000-0000-4000-8000-0000000000f1' $$,
  'counselor A cannot read counselor F consultation'
);

-- IDOR against project two
select is_empty(
  $$ select id from public.organization where id = '10000000-0000-4000-8000-000000000002' $$,
  'counselor A cannot IDOR organization two'
);
select is_empty(
  $$ select id from public.project where id = '20000000-0000-4000-8000-000000000002' $$,
  'counselor A cannot IDOR project two'
);
select is_empty(
  $$ select id from public.project_member where id = '40000000-0000-4000-8000-00000000000b' $$,
  'counselor A cannot IDOR project-two membership'
);
select is_empty(
  $$ select id from public.customer where id = '50000000-0000-4000-8000-0000000000b1' $$,
  'counselor A cannot IDOR project-two customer'
);
select is_empty(
  $$ select id from public.consultation where id = '60000000-0000-4000-8000-0000000000b1' $$,
  'counselor A cannot IDOR project-two consultation'
);
select is_empty(
  $$ select id from public.customer_status_log where id = '70000000-0000-4000-8000-0000000000b1' $$,
  'counselor A cannot IDOR project-two status log'
);

select throws_ok(
  $$ insert into public.customer (project_id, name, phone, phone_normalized)
     values (
       '20000000-0000-4000-8000-000000000001',
       'Forged',
       '01000000000',
       '01000000000'
     ) $$,
  '42501',
  'permission denied for table customer',
  'counselor cannot insert customer directly'
);
select throws_ok(
  $$ update public.customer
     set grade = 'A'
     where id = '50000000-0000-4000-8000-0000000000a1' $$,
  '42501',
  'permission denied for table customer',
  'counselor cannot update customer grade directly'
);
select throws_ok(
  $$ insert into public.consultation (
       project_id, customer_id, counselor_id, consulted_at, content, created_by
     ) values (
       '20000000-0000-4000-8000-000000000001',
       '50000000-0000-4000-8000-0000000000a1',
       '40000000-0000-4000-8000-00000000000a',
       now(),
       'forged',
       '40000000-0000-4000-8000-00000000000a'
     ) $$,
  '42501',
  'permission denied for table consultation',
  'counselor cannot insert consultation directly'
);
select throws_ok(
  $$ delete from public.customer where id = '50000000-0000-4000-8000-0000000000a1' $$,
  '42501',
  'permission denied for table customer',
  'counselor cannot delete customer'
);

-- Admin P1: same project, not project two
select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c1');

select results_eq(
  $$ select id from public.organization order by id $$,
  $$ values ('10000000-0000-4000-8000-000000000001'::uuid) $$,
  'admin P1 sees organization one'
);
select results_eq(
  $$ select id from public.project order by id $$,
  $$ values ('20000000-0000-4000-8000-000000000001'::uuid) $$,
  'admin P1 sees project one'
);
select results_eq(
  $$ select id from public.customer order by id $$,
  $$ values
    ('50000000-0000-4000-8000-000000000011'::uuid),
    ('50000000-0000-4000-8000-0000000000a1'::uuid),
    ('50000000-0000-4000-8000-0000000000d1'::uuid),
    ('50000000-0000-4000-8000-0000000000f1'::uuid)
  $$,
  'admin P1 sees every project-one customer'
);
select isnt_empty(
  $$ select id from public.project_member where project_id = '20000000-0000-4000-8000-000000000001' $$,
  'admin P1 can list same-project members'
);
select is_empty(
  $$ select id from public.project where id = '20000000-0000-4000-8000-000000000002' $$,
  'admin P1 cannot see project two'
);
select is_empty(
  $$ select id from public.customer where id = '50000000-0000-4000-8000-0000000000b1' $$,
  'admin P1 cannot IDOR project-two customer'
);
select is_empty(
  $$ select id from public.consultation where id = '60000000-0000-4000-8000-0000000000b1' $$,
  'admin P1 cannot IDOR project-two consultation'
);
select is_empty(
  $$ select id from public.customer_status_log where id = '70000000-0000-4000-8000-0000000000b1' $$,
  'admin P1 cannot IDOR project-two status log'
);
select is_empty(
  $$ select id from public.project_member where id = '40000000-0000-4000-8000-00000000000b' $$,
  'admin P1 cannot IDOR project-two membership'
);
select throws_ok(
  $$ update public.customer
     set assigned_counselor_id = '40000000-0000-4000-8000-00000000000a'
     where id = '50000000-0000-4000-8000-000000000011' $$,
  '42501',
  'permission denied for table customer',
  'admin cannot assign counselor by direct update'
);
select throws_ok(
  $$ insert into public.consultation (
       project_id, customer_id, counselor_id, consulted_at, content, created_by
     ) values (
       '20000000-0000-4000-8000-000000000001',
       '50000000-0000-4000-8000-0000000000a1',
       '40000000-0000-4000-8000-0000000000c1',
       now(),
       'admin forged',
       '40000000-0000-4000-8000-0000000000c1'
     ) $$,
  '42501',
  'permission denied for table consultation',
  'admin cannot insert consultation in Phase 1'
);
select throws_ok(
  $$ insert into public.customer_status_log (
       project_id, customer_id, grade_after, changed_by
     ) values (
       '20000000-0000-4000-8000-000000000001',
       '50000000-0000-4000-8000-0000000000a1',
       'A',
       '40000000-0000-4000-8000-0000000000c1'
     ) $$,
  '42501',
  'permission denied for table customer_status_log',
  'admin cannot insert status log directly'
);

-- Counselor B / admin P2: project two only
select pg_temp.impersonate('30000000-0000-4000-8000-00000000000b');
select results_eq(
  $$ select id from public.customer order by id $$,
  $$ values ('50000000-0000-4000-8000-0000000000b1'::uuid) $$,
  'counselor B sees only project-two assigned customer'
);
select is_empty(
  $$ select id from public.customer where id = '50000000-0000-4000-8000-0000000000a1' $$,
  'counselor B cannot IDOR project-one customer'
);

select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c2');
select results_eq(
  $$ select id from public.project order by id $$,
  $$ values ('20000000-0000-4000-8000-000000000002'::uuid) $$,
  'admin P2 sees only project two'
);
select is_empty(
  $$ select id from public.customer where id = '50000000-0000-4000-8000-0000000000a1' $$,
  'admin P2 cannot IDOR project-one customer'
);

-- TEAM_LEAD denial
select pg_temp.impersonate('30000000-0000-4000-8000-00000000000e');
select is_empty($$ select id from public.organization $$, 'TEAM_LEAD sees no organizations');
select is_empty($$ select id from public.project $$, 'TEAM_LEAD sees no projects');
select is_empty($$ select id from public.project_member $$, 'TEAM_LEAD sees no memberships');
select is_empty($$ select id from public.customer $$, 'TEAM_LEAD sees no customers');
select is_empty($$ select id from public.consultation $$, 'TEAM_LEAD sees no consultations');
select is_empty($$ select id from public.customer_status_log $$, 'TEAM_LEAD sees no status logs');

reset role;
select pg_temp.impersonate('30000000-0000-4000-8000-00000000000e');
select is(
  private.has_project_role(
    '20000000-0000-4000-8000-000000000001',
    array['COUNSELOR', 'PROJECT_ADMIN']::public.project_member_role[]
  ),
  false,
  'TEAM_LEAD is not authorized by has_project_role for Phase 1 roles'
);
select is(
  private.has_project_role(
    '20000000-0000-4000-8000-000000000001',
    array['TEAM_LEAD']::public.project_member_role[]
  ),
  false,
  'has_project_role never authorizes TEAM_LEAD even if requested'
);

-- Inactive member denial
set local role authenticated;
select pg_temp.impersonate('30000000-0000-4000-8000-00000000000d');
select is_empty($$ select id from public.project $$, 'inactive member sees no projects');
select is_empty($$ select id from public.project_member $$, 'inactive member sees no memberships');
select is_empty(
  $$ select id from public.customer where id = '50000000-0000-4000-8000-0000000000d1' $$,
  'inactive member cannot read a customer assigned to the inactive membership'
);
select is_empty($$ select id from public.consultation $$, 'inactive member sees no consultations');

reset role;
select pg_temp.clear_auth();

select * from finish();
rollback;
