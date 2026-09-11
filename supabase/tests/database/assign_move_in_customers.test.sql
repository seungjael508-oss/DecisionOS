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

create function pg_temp.impersonate(p_user_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', p_user_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
end;
$$;

insert into public.customer (
  id, project_id, name, phone, phone_normalized, assigned_counselor_id
) values
  (
    '5a000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'Assign Two',
    '01096001001',
    '01096001001',
    null
  ),
  (
    '5a000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    'Assign Three',
    '01096001002',
    '01096001002',
    null
  );

select has_function('public'::name, 'assign_move_in_customers'::name);

select ok(
  (
    select bool_and(has_function_privilege('authenticated', p.oid, 'EXECUTE'))
      and bool_and(not has_function_privilege('anon', p.oid, 'EXECUTE'))
      and bool_and(not has_function_privilege('public', p.oid, 'EXECUTE'))
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'assign_move_in_customers'
  ),
  'PUBLIC/anon EXECUTE 없음, authenticated EXECUTE'
);

select ok(
  (
    select p.prosecdef
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'assign_move_in_customers'
  ),
  'SECURITY DEFINER'
);

select ok(
  exists (
    select 1
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    cross join unnest(coalesce(p.proconfig, array[]::text[])) as cfg
    where n.nspname = 'public'
      and p.proname = 'assign_move_in_customers'
      and cfg in ('search_path=""', 'search_path=''''')
  ),
  'search_path empty'
);

select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c1');
set local role authenticated;

select throws_ok(
  $$ select public.assign_move_in_customers(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_customer_ids := array[
         '50000000-0000-4000-8000-0000000000a1'::uuid,
         '50000000-0000-4000-8000-0000000000b1'::uuid
       ],
       p_assignee_project_member_id := '40000000-0000-4000-8000-00000000000a'
     ) $$,
  '23514',
  NULL,
  'cross-project customer injection → 전체 rollback'
);

select is(
  (
    select assigned_counselor_id::text
    from public.customer
    where id = '50000000-0000-4000-8000-0000000000a1'
  ),
  '40000000-0000-4000-8000-00000000000a',
  '실패 후 기존 assignment 불변'
);

select is(
  public.assign_move_in_customers(
    p_project_id := '20000000-0000-4000-8000-000000000001',
    p_customer_ids := array['50000000-0000-4000-8000-000000000011'::uuid],
    p_assignee_project_member_id := '40000000-0000-4000-8000-00000000000a'
  ),
  1,
  'PROJECT_ADMIN 1건 배정 성공'
);

select is(
  (
    select assigned_counselor_id::text
    from public.customer
    where id = '50000000-0000-4000-8000-000000000011'
  ),
  '40000000-0000-4000-8000-00000000000a'
);

select is(
  public.assign_move_in_customers(
    p_project_id := '20000000-0000-4000-8000-000000000001',
    p_customer_ids := array[
      '5a000000-0000-4000-8000-000000000001'::uuid,
      '5a000000-0000-4000-8000-000000000001'::uuid,
      '5a000000-0000-4000-8000-000000000002'::uuid
    ],
    p_assignee_project_member_id := '40000000-0000-4000-8000-00000000000f'
  ),
  2,
  'PROJECT_ADMIN 다건 배정 성공 / duplicate customer ids → 안전 처리'
);

select is(
  (
    select count(*)::integer
    from public.customer
    where id in (
      '5a000000-0000-4000-8000-000000000001',
      '5a000000-0000-4000-8000-000000000002'
    )
      and assigned_counselor_id = '40000000-0000-4000-8000-00000000000f'
  ),
  2
);

select is(
  public.assign_move_in_customers(
    p_project_id := '20000000-0000-4000-8000-000000000001',
    p_customer_ids := array['50000000-0000-4000-8000-0000000000a1'::uuid],
    p_assignee_project_member_id := '40000000-0000-4000-8000-00000000000f'
  ),
  1,
  '기존 상담사 → 다른 상담사 재배정'
);

select is(
  (
    select assigned_counselor_id::text
    from public.customer
    where id = '50000000-0000-4000-8000-0000000000a1'
  ),
  '40000000-0000-4000-8000-00000000000f'
);

select is(
  (
    select counselor_id::text
    from public.consultation
    where id = '60000000-0000-4000-8000-0000000000a1'
  ),
  '40000000-0000-4000-8000-00000000000a',
  '과거 consultation counselor 불변'
);

select pg_temp.impersonate('30000000-0000-4000-8000-00000000000a');

select throws_ok(
  $$ select public.assign_move_in_customers(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_customer_ids := array['50000000-0000-4000-8000-0000000000f1'::uuid],
       p_assignee_project_member_id := '40000000-0000-4000-8000-00000000000a'
     ) $$,
  '42501',
  NULL,
  'COUNSELOR 호출 → 42501'
);

select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c1');

select throws_ok(
  $$ select public.assign_move_in_customers(
       p_project_id := '20000000-0000-4000-8000-000000000002',
       p_customer_ids := array['50000000-0000-4000-8000-0000000000b1'::uuid],
       p_assignee_project_member_id := '40000000-0000-4000-8000-00000000000b'
     ) $$,
  '42501',
  NULL,
  'cross-project actor → 거부'
);

select is(
  (
    select assigned_counselor_id::text
    from public.customer
    where id = '50000000-0000-4000-8000-0000000000f1'
  ),
  '40000000-0000-4000-8000-00000000000f',
  'COUNSELOR/cross-project 실패 후 F1 불변'
);

select throws_ok(
  $$ select public.assign_move_in_customers(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_customer_ids := array['50000000-0000-4000-8000-0000000000f1'::uuid],
       p_assignee_project_member_id := '40000000-0000-4000-8000-00000000000b'
     ) $$,
  '23514',
  NULL,
  'cross-project assignee → 거부'
);

select throws_ok(
  $$ select public.assign_move_in_customers(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_customer_ids := array['50000000-0000-4000-8000-0000000000f1'::uuid],
       p_assignee_project_member_id := '40000000-0000-4000-8000-00000000000d'
     ) $$,
  '23514',
  NULL,
  'inactive assignee → 거부'
);

select throws_ok(
  $$ select public.assign_move_in_customers(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_customer_ids := array['50000000-0000-4000-8000-0000000000f1'::uuid],
       p_assignee_project_member_id := '40000000-0000-4000-8000-0000000000c1'
     ) $$,
  '23514',
  NULL,
  'PROJECT_ADMIN role assignee → 거부'
);

select throws_ok(
  $$ select public.assign_move_in_customers(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_customer_ids := array[]::uuid[],
       p_assignee_project_member_id := '40000000-0000-4000-8000-00000000000a'
     ) $$,
  '23514',
  NULL,
  '빈 customer array → 거부'
);

select is(
  (
    select assigned_counselor_id::text
    from public.customer
    where id = '50000000-0000-4000-8000-0000000000f1'
  ),
  '40000000-0000-4000-8000-00000000000f',
  '잘못된 assignee/빈 배열 실패 후 기존 assignment 불변'
);

select finish();

rollback;
