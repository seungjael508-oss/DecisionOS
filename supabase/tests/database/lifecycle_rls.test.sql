begin;

select no_plan();

-- TODO(M10): create_contract, cancel_contract, transfer_contract_holder,
-- update_unit_occupancy_status, generate_report, CS create/update RPCs.
-- Org-wide report_template direct write has no policy until an org admin role exists.
-- TEAM_LEAD/HEAD are not write/select authorized by Phase 1 helpers.
-- Do not deploy M9 without M10.

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

create function pg_temp.clear_auth()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', '', true);
end;
$$;

insert into public.project (id, organization_id, name, status)
values (
  '20000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000001',
  'Project One B',
  'ACTIVE'
);

insert into public.project_unit (unit_id, project_id, building_no, unit_no)
values
  ('79000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '901', '101'),
  ('79000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '901', '102'),
  ('79000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', '901', '101'),
  ('79000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', '901', '103');

insert into public.customer (
  id, project_id, name, phone, phone_normalized, assigned_counselor_id
) values
  (
    '59000000-0000-4000-8000-0000000000a1',
    '20000000-0000-4000-8000-000000000001',
    'RLS Customer A',
    '01091000001',
    '01091000001',
    '40000000-0000-4000-8000-00000000000a'
  ),
  (
    '59000000-0000-4000-8000-0000000000f1',
    '20000000-0000-4000-8000-000000000001',
    'RLS Customer F',
    '01091000002',
    '01091000002',
    '40000000-0000-4000-8000-00000000000f'
  ),
  (
    '59000000-0000-4000-8000-0000000000b1',
    '20000000-0000-4000-8000-000000000002',
    'RLS Customer B',
    '01091000003',
    '01091000003',
    '40000000-0000-4000-8000-00000000000b'
  );

insert into public.customer_unit_interest (
  interest_id, project_id, customer_id, unit_id
) values
  (
    '89000000-0000-4000-8000-0000000000a1',
    '20000000-0000-4000-8000-000000000001',
    '59000000-0000-4000-8000-0000000000a1',
    '79000000-0000-4000-8000-000000000001'
  ),
  (
    '89000000-0000-4000-8000-0000000000f1',
    '20000000-0000-4000-8000-000000000001',
    '59000000-0000-4000-8000-0000000000f1',
    '79000000-0000-4000-8000-000000000002'
  ),
  (
    '89000000-0000-4000-8000-0000000000b1',
    '20000000-0000-4000-8000-000000000002',
    '59000000-0000-4000-8000-0000000000b1',
    '79000000-0000-4000-8000-000000000003'
  );

insert into public.subscription (
  subscription_id, project_id, customer_id, subscription_round
) values
  (
    '86000000-0000-4000-8000-0000000000a1',
    '20000000-0000-4000-8000-000000000001',
    '59000000-0000-4000-8000-0000000000a1',
    '1'
  ),
  (
    '86000000-0000-4000-8000-0000000000b1',
    '20000000-0000-4000-8000-000000000002',
    '59000000-0000-4000-8000-0000000000b1',
    '1'
  );

insert into public.contract (
  contract_id, project_id, customer_id, unit_id, contract_status
) values
  (
    '96000000-0000-4000-8000-0000000000a1',
    '20000000-0000-4000-8000-000000000001',
    '59000000-0000-4000-8000-0000000000a1',
    '79000000-0000-4000-8000-000000000001',
    'ACTIVE'
  ),
  (
    '96000000-0000-4000-8000-0000000000b1',
    '20000000-0000-4000-8000-000000000002',
    '59000000-0000-4000-8000-0000000000b1',
    '79000000-0000-4000-8000-000000000003',
    'ACTIVE'
  );

insert into public.unit_occupancy_status (
  occupancy_status_id, project_id, unit_id, contract_id
) values
  (
    '97000000-0000-4000-8000-0000000000a1',
    '20000000-0000-4000-8000-000000000001',
    '79000000-0000-4000-8000-000000000001',
    '96000000-0000-4000-8000-0000000000a1'
  ),
  (
    '97000000-0000-4000-8000-0000000000b1',
    '20000000-0000-4000-8000-000000000002',
    '79000000-0000-4000-8000-000000000003',
    '96000000-0000-4000-8000-0000000000b1'
  );

insert into public.contract_status_history (
  history_id, project_id, contract_id, unit_id,
  field_changed, previous_value, new_value, changed_by
) values
  (
    '98000000-0000-4000-8000-0000000000a1',
    '20000000-0000-4000-8000-000000000001',
    '96000000-0000-4000-8000-0000000000a1',
    '79000000-0000-4000-8000-000000000001',
    'occupancy_intent',
    'UNDECIDED',
    'SELF_MOVE_IN',
    '40000000-0000-4000-8000-00000000000a'
  ),
  (
    '98000000-0000-4000-8000-0000000000b1',
    '20000000-0000-4000-8000-000000000002',
    '96000000-0000-4000-8000-0000000000b1',
    '79000000-0000-4000-8000-000000000003',
    'occupancy_intent',
    'UNDECIDED',
    'SALE',
    '40000000-0000-4000-8000-00000000000b'
  );

insert into public.market_data (market_data_id, project_id, data_scope, period)
values
  (
    '99000000-0000-4000-8000-0000000000a1',
    '20000000-0000-4000-8000-000000000001',
    'INTERNAL',
    '2026-09-01'
  ),
  (
    '99000000-0000-4000-8000-0000000000b1',
    '20000000-0000-4000-8000-000000000002',
    'INTERNAL',
    '2026-09-01'
  );

insert into public.report_template (
  template_id, organization_id, project_id, report_phase, report_type,
  name, template_definition, mapping_definition, source_type
) values
  (
    'a5000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    null,
    'MOVE_IN',
    'DAILY',
    'Org1 shared',
    '{}'::jsonb,
    '{}'::jsonb,
    'MANUAL'
  ),
  (
    'a5000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'MOVE_IN',
    'DAILY',
    'P1 dedicated',
    '{}'::jsonb,
    '{}'::jsonb,
    'MANUAL'
  ),
  (
    'a5000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000003',
    'MOVE_IN',
    'DAILY',
    'P3 dedicated',
    '{}'::jsonb,
    '{}'::jsonb,
    'MANUAL'
  ),
  (
    'a5000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000002',
    null,
    'MOVE_IN',
    'DAILY',
    'Org2 shared',
    '{}'::jsonb,
    '{}'::jsonb,
    'MANUAL'
  );

insert into public.report (
  report_id, project_id, report_phase, report_type, report_date,
  generated_data, generated_by
) values
  (
    'a6000000-0000-4000-8000-0000000000a1',
    '20000000-0000-4000-8000-000000000001',
    'MOVE_IN',
    'DAILY',
    '2026-09-08',
    '{}'::jsonb,
    '40000000-0000-4000-8000-00000000000a'
  ),
  (
    'a6000000-0000-4000-8000-0000000000b1',
    '20000000-0000-4000-8000-000000000002',
    'MOVE_IN',
    'DAILY',
    '2026-09-08',
    '{}'::jsonb,
    '40000000-0000-4000-8000-00000000000b'
  );

insert into public.cs_ticket (
  ticket_id, project_id, contract_id, unit_id, customer_id,
  category, title, description, created_by
) values
  (
    'c2000000-0000-4000-8000-0000000000a1',
    '20000000-0000-4000-8000-000000000001',
    '96000000-0000-4000-8000-0000000000a1',
    '79000000-0000-4000-8000-000000000001',
    '59000000-0000-4000-8000-0000000000a1',
    '누수',
    'P1 ticket',
    '설명',
    '40000000-0000-4000-8000-00000000000a'
  ),
  (
    'c2000000-0000-4000-8000-0000000000b1',
    '20000000-0000-4000-8000-000000000002',
    '96000000-0000-4000-8000-0000000000b1',
    '79000000-0000-4000-8000-000000000003',
    '59000000-0000-4000-8000-0000000000b1',
    '누수',
    'P2 ticket',
    '설명',
    '40000000-0000-4000-8000-00000000000b'
  );

select ok(
  not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'project_member_role' and e.enumlabel = 'HEAD'
  ),
  'HEAD is not a canonical project_member_role'
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

select ok(
  (
    select prosecdef and proconfig::text like '%search_path=%'
    from pg_proc
    where proname = 'has_project_role'
      and pronamespace = 'private'::regnamespace
  ),
  'has_project_role is SECURITY DEFINER with fixed search_path'
);

select ok(
  not has_function_privilege(
    'anon',
    'private.has_project_role(uuid,public.project_member_role[])',
    'EXECUTE'
  ),
  'anon cannot execute has_project_role'
);

select ok(
  (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'project_unit'
  ),
  'project_unit RLS enabled'
);
select ok(
  (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'market_data'
  ),
  'market_data RLS enabled'
);
select ok(
  (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'cs_ticket'
  ),
  'cs_ticket RLS enabled'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and cmd = 'DELETE'
      and tablename in (
        'project_unit',
        'customer_unit_interest',
        'subscription',
        'contract',
        'unit_occupancy_status',
        'contract_status_history',
        'market_data',
        'report_template',
        'report',
        'cs_ticket'
      )
  ),
  0,
  'no DELETE policies on lifecycle tables'
);

select ok(not has_table_privilege('anon', 'public.project_unit', 'SELECT'), 'anon cannot select project_unit');
select ok(not has_table_privilege('authenticated', 'public.contract', 'INSERT'), 'authenticated cannot insert contract');
select ok(not has_table_privilege('authenticated', 'public.report', 'UPDATE'), 'authenticated cannot update report');
select ok(not has_table_privilege('authenticated', 'public.cs_ticket', 'DELETE'), 'authenticated cannot delete cs_ticket');
select ok(not has_table_privilege('authenticated', 'public.project_unit', 'DELETE'), 'authenticated cannot delete project_unit');

select pg_temp.clear_auth();
set local role anon;

select throws_ok($$ select unit_id from public.project_unit $$, '42501');
select throws_ok($$ select contract_id from public.contract $$, '42501');
select throws_ok($$ select report_id from public.report $$, '42501');
select throws_ok($$ select ticket_id from public.cs_ticket $$, '42501');

reset role;
select pg_temp.clear_auth();
set local role authenticated;

select is_empty($$ select unit_id from public.project_unit $$, 'unauthenticated authenticated sees no units');
select is_empty($$ select contract_id from public.contract $$, 'unauthenticated authenticated sees no contracts');
select is_empty($$ select report_id from public.report $$, 'unauthenticated authenticated sees no reports');

-- Counselor A
select pg_temp.impersonate('30000000-0000-4000-8000-00000000000a');

select isnt_empty(
  $$ select unit_id from public.project_unit
     where unit_id = '79000000-0000-4000-8000-000000000001' $$,
  'counselor A selects same-project unit'
);
select is_empty(
  $$ select unit_id from public.project_unit
     where unit_id = '79000000-0000-4000-8000-000000000003' $$,
  'counselor A cannot select project-two unit'
);
select throws_ok(
  $$ insert into public.project_unit (project_id, building_no, unit_no)
     values ('20000000-0000-4000-8000-000000000001', '902', '201') $$,
  '42501'
);

select isnt_empty(
  $$ select interest_id from public.customer_unit_interest
     where interest_id = '89000000-0000-4000-8000-0000000000a1' $$,
  'counselor A selects own-customer interest'
);
select lives_ok(
  $$ insert into public.customer_unit_interest (
       project_id, customer_id, unit_id
     ) values (
       '20000000-0000-4000-8000-000000000001',
       '59000000-0000-4000-8000-0000000000a1',
       '79000000-0000-4000-8000-000000000004'
     ) $$,
  'counselor A inserts interest for assigned customer'
);
select lives_ok(
  $$ update public.customer_unit_interest
     set current_status = 'HOLD'
     where interest_id = '89000000-0000-4000-8000-0000000000a1' $$,
  'counselor A updates assigned-customer interest'
);
select throws_ok(
  $$ insert into public.customer_unit_interest (
       project_id, customer_id, unit_id
     ) values (
       '20000000-0000-4000-8000-000000000001',
       '59000000-0000-4000-8000-0000000000f1',
       '79000000-0000-4000-8000-000000000004'
     ) $$,
  '42501'
);
select lives_ok(
  $$ update public.customer_unit_interest
     set current_status = 'LOST'
     where interest_id = '89000000-0000-4000-8000-0000000000f1' $$,
  'counselor A update of other-counselor interest is a no-op'
);
select is(
  (
    select current_status::text
    from public.customer_unit_interest
    where interest_id = '89000000-0000-4000-8000-0000000000f1'
  ),
  'ACTIVE',
  'other-counselor interest remains unchanged'
);
select is_empty(
  $$ select interest_id from public.customer_unit_interest
     where interest_id = '89000000-0000-4000-8000-0000000000b1' $$,
  'counselor A cannot select project-two interest'
);
select throws_ok(
  $$ delete from public.customer_unit_interest
     where interest_id = '89000000-0000-4000-8000-0000000000a1' $$,
  '42501'
);

select lives_ok(
  $$ insert into public.subscription (
       project_id, customer_id, subscription_round
     ) values (
       '20000000-0000-4000-8000-000000000001',
       '59000000-0000-4000-8000-0000000000a1',
       '2'
     ) $$,
  'counselor A inserts subscription for assigned customer'
);
select throws_ok(
  $$ insert into public.subscription (
       project_id, customer_id, subscription_round
     ) values (
       '20000000-0000-4000-8000-000000000001',
       '59000000-0000-4000-8000-0000000000f1',
       '2'
     ) $$,
  '42501'
);
select is_empty(
  $$ select subscription_id from public.subscription
     where subscription_id = '86000000-0000-4000-8000-0000000000b1' $$,
  'counselor A cannot select project-two subscription'
);
select throws_ok(
  $$ delete from public.subscription
     where subscription_id = '86000000-0000-4000-8000-0000000000a1' $$,
  '42501'
);

select isnt_empty(
  $$ select contract_id from public.contract
     where contract_id = '96000000-0000-4000-8000-0000000000a1' $$,
  'counselor A selects same-project contract'
);
select is_empty(
  $$ select contract_id from public.contract
     where contract_id = '96000000-0000-4000-8000-0000000000b1' $$,
  'counselor A cannot select project-two contract'
);
select throws_ok(
  $$ insert into public.contract (
       project_id, customer_id, unit_id, contract_status
     ) values (
       '20000000-0000-4000-8000-000000000001',
       '59000000-0000-4000-8000-0000000000a1',
       '79000000-0000-4000-8000-000000000002',
       'ACTIVE'
     ) $$,
  '42501'
);
select throws_ok(
  $$ update public.contract set contract_status = 'COMPLETED'
     where contract_id = '96000000-0000-4000-8000-0000000000a1' $$,
  '42501'
);
select throws_ok(
  $$ delete from public.contract
     where contract_id = '96000000-0000-4000-8000-0000000000a1' $$,
  '42501'
);

select isnt_empty(
  $$ select occupancy_status_id from public.unit_occupancy_status
     where occupancy_status_id = '97000000-0000-4000-8000-0000000000a1' $$,
  'counselor A selects same-project occupancy'
);
select is_empty(
  $$ select occupancy_status_id from public.unit_occupancy_status
     where occupancy_status_id = '97000000-0000-4000-8000-0000000000b1' $$,
  'counselor A cannot select project-two occupancy'
);
select throws_ok(
  $$ insert into public.unit_occupancy_status (
       project_id, unit_id, contract_id
     ) values (
       '20000000-0000-4000-8000-000000000001',
       '79000000-0000-4000-8000-000000000002',
       '96000000-0000-4000-8000-0000000000a1'
     ) $$,
  '42501'
);
select throws_ok(
  $$ update public.unit_occupancy_status
     set occupancy_intent = 'SALE'
     where occupancy_status_id = '97000000-0000-4000-8000-0000000000a1' $$,
  '42501'
);
select throws_ok(
  $$ delete from public.unit_occupancy_status
     where occupancy_status_id = '97000000-0000-4000-8000-0000000000a1' $$,
  '42501'
);

select isnt_empty(
  $$ select history_id from public.contract_status_history
     where history_id = '98000000-0000-4000-8000-0000000000a1' $$,
  'counselor A selects same-project history'
);
select is_empty(
  $$ select history_id from public.contract_status_history
     where history_id = '98000000-0000-4000-8000-0000000000b1' $$,
  'counselor A cannot select project-two history'
);
select throws_ok(
  $$ insert into public.contract_status_history (
       project_id, contract_id, unit_id, field_changed, changed_by
     ) values (
       '20000000-0000-4000-8000-000000000001',
       '96000000-0000-4000-8000-0000000000a1',
       '79000000-0000-4000-8000-000000000001',
       'funding_status',
       '40000000-0000-4000-8000-00000000000a'
     ) $$,
  '42501'
);

select isnt_empty(
  $$ select market_data_id from public.market_data
     where market_data_id = '99000000-0000-4000-8000-0000000000a1' $$,
  'counselor A selects same-project market_data'
);
select is_empty(
  $$ select market_data_id from public.market_data
     where market_data_id = '99000000-0000-4000-8000-0000000000b1' $$,
  'counselor A cannot select project-two market_data'
);
select throws_ok(
  $$ insert into public.market_data (project_id, data_scope, period)
     values (
       '20000000-0000-4000-8000-000000000001',
       'INTERNAL',
       '2026-10-01'
     ) $$,
  '42501'
);
select lives_ok(
  $$ update public.market_data set source = 'hack'
     where market_data_id = '99000000-0000-4000-8000-0000000000a1' $$,
  'counselor market_data update is a no-op'
);
select is(
  (
    select source from public.market_data
    where market_data_id = '99000000-0000-4000-8000-0000000000a1'
  ),
  null,
  'counselor cannot change market_data'
);

select isnt_empty(
  $$ select template_id from public.report_template
     where template_id = 'a5000000-0000-4000-8000-000000000001' $$,
  'counselor A selects org-shared template'
);
select isnt_empty(
  $$ select template_id from public.report_template
     where template_id = 'a5000000-0000-4000-8000-000000000002' $$,
  'counselor A selects own-project template'
);
select is_empty(
  $$ select template_id from public.report_template
     where template_id = 'a5000000-0000-4000-8000-000000000003' $$,
  'counselor A cannot select other-project dedicated template'
);
select is_empty(
  $$ select template_id from public.report_template
     where template_id = 'a5000000-0000-4000-8000-000000000004' $$,
  'counselor A cannot select other-organization template'
);

select isnt_empty(
  $$ select report_id from public.report
     where report_id = 'a6000000-0000-4000-8000-0000000000a1' $$,
  'counselor A selects same-project report'
);
select is_empty(
  $$ select report_id from public.report
     where report_id = 'a6000000-0000-4000-8000-0000000000b1' $$,
  'counselor A cannot select project-two report'
);
select throws_ok(
  $$ insert into public.report (
       project_id, report_phase, report_type, report_date,
       generated_data, generated_by
     ) values (
       '20000000-0000-4000-8000-000000000001',
       'MOVE_IN',
       'DAILY',
       '2026-09-09',
       '{}'::jsonb,
       '40000000-0000-4000-8000-00000000000a'
     ) $$,
  '42501'
);
select throws_ok(
  $$ update public.report set generated_data = '{"x":1}'::jsonb
     where report_id = 'a6000000-0000-4000-8000-0000000000a1' $$,
  '42501'
);
select throws_ok(
  $$ delete from public.report
     where report_id = 'a6000000-0000-4000-8000-0000000000a1' $$,
  '42501'
);

select isnt_empty(
  $$ select ticket_id from public.cs_ticket
     where ticket_id = 'c2000000-0000-4000-8000-0000000000a1' $$,
  'counselor A selects same-project cs_ticket'
);
select is_empty(
  $$ select ticket_id from public.cs_ticket
     where ticket_id = 'c2000000-0000-4000-8000-0000000000b1' $$,
  'counselor A cannot select project-two cs_ticket'
);
select throws_ok(
  $$ insert into public.cs_ticket (
       project_id, contract_id, unit_id, customer_id,
       category, title, description, created_by
     ) values (
       '20000000-0000-4000-8000-000000000001',
       '96000000-0000-4000-8000-0000000000a1',
       '79000000-0000-4000-8000-000000000001',
       '59000000-0000-4000-8000-0000000000a1',
       '누수',
       'forged',
       '설명',
       '40000000-0000-4000-8000-00000000000a'
     ) $$,
  '42501'
);
select throws_ok(
  $$ update public.cs_ticket set status = 'CLOSED'
     where ticket_id = 'c2000000-0000-4000-8000-0000000000a1' $$,
  '42501'
);
select throws_ok(
  $$ delete from public.cs_ticket
     where ticket_id = 'c2000000-0000-4000-8000-0000000000a1' $$,
  '42501'
);

-- Consultation Phase 1 regression
select results_eq(
  $$ select id from public.consultation order by id $$,
  $$ values ('60000000-0000-4000-8000-0000000000a1'::uuid) $$,
  'counselor A still sees only assigned-customer consultations'
);

-- TEAM_LEAD
select pg_temp.impersonate('30000000-0000-4000-8000-00000000000e');
select is_empty($$ select unit_id from public.project_unit $$, 'TEAM_LEAD sees no units');
select throws_ok(
  $$ insert into public.project_unit (project_id, building_no, unit_no)
     values ('20000000-0000-4000-8000-000000000001', '903', '301') $$,
  '42501'
);
select throws_ok(
  $$ insert into public.customer_unit_interest (
       project_id, customer_id, unit_id
     ) values (
       '20000000-0000-4000-8000-000000000001',
       '59000000-0000-4000-8000-0000000000a1',
       '79000000-0000-4000-8000-000000000002'
     ) $$,
  '42501'
);

-- Counselor B IDOR
select pg_temp.impersonate('30000000-0000-4000-8000-00000000000b');
select is_empty(
  $$ select unit_id from public.project_unit
     where unit_id = '79000000-0000-4000-8000-000000000001' $$,
  'counselor B cannot select project-one unit'
);
select is_empty(
  $$ select contract_id from public.contract
     where contract_id = '96000000-0000-4000-8000-0000000000a1' $$,
  'counselor B cannot select project-one contract'
);
select is_empty(
  $$ select report_id from public.report
     where report_id = 'a6000000-0000-4000-8000-0000000000a1' $$,
  'counselor B cannot select project-one report'
);
select isnt_empty(
  $$ select template_id from public.report_template
     where template_id = 'a5000000-0000-4000-8000-000000000004' $$,
  'counselor B selects org2 shared template'
);

-- PROJECT_ADMIN P1
select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c1');

select lives_ok(
  $$ insert into public.project_unit (unit_id, project_id, building_no, unit_no)
     values (
       '79000000-0000-4000-8000-0000000000aa',
       '20000000-0000-4000-8000-000000000001',
       '904',
       '401'
     ) $$,
  'PROJECT_ADMIN inserts project_unit'
);
select lives_ok(
  $$ update public.project_unit set unit_type = '84A'
     where unit_id = '79000000-0000-4000-8000-0000000000aa' $$,
  'PROJECT_ADMIN updates project_unit'
);
select throws_ok(
  $$ delete from public.project_unit
     where unit_id = '79000000-0000-4000-8000-0000000000aa' $$,
  '42501'
);

select lives_ok(
  $$ insert into public.customer_unit_interest (
       project_id, customer_id, unit_id
     ) values (
       '20000000-0000-4000-8000-000000000001',
       '59000000-0000-4000-8000-0000000000f1',
       '79000000-0000-4000-8000-0000000000aa'
     ) $$,
  'PROJECT_ADMIN inserts any-project-customer interest'
);
select lives_ok(
  $$ insert into public.subscription (
       project_id, customer_id, subscription_round
     ) values (
       '20000000-0000-4000-8000-000000000001',
       '59000000-0000-4000-8000-0000000000f1',
       '9'
     ) $$,
  'PROJECT_ADMIN inserts any-project-customer subscription'
);

select throws_ok(
  $$ insert into public.contract (
       project_id, customer_id, unit_id, contract_status
     ) values (
       '20000000-0000-4000-8000-000000000001',
       '59000000-0000-4000-8000-0000000000a1',
       '79000000-0000-4000-8000-000000000002',
       'ACTIVE'
     ) $$,
  '42501'
);
select throws_ok(
  $$ update public.contract set contract_status = 'CANCELLED',
     cancellation_reason = 'x'
     where contract_id = '96000000-0000-4000-8000-0000000000a1' $$,
  '42501'
);
select throws_ok(
  $$ delete from public.contract
     where contract_id = '96000000-0000-4000-8000-0000000000a1' $$,
  '42501'
);

select throws_ok(
  $$ update public.unit_occupancy_status
     set occupancy_intent = 'JEONSE'
     where occupancy_status_id = '97000000-0000-4000-8000-0000000000a1' $$,
  '42501'
);
select throws_ok(
  $$ insert into public.contract_status_history (
       project_id, contract_id, unit_id, field_changed, changed_by
     ) values (
       '20000000-0000-4000-8000-000000000001',
       '96000000-0000-4000-8000-0000000000a1',
       '79000000-0000-4000-8000-000000000001',
       'move_in_status',
       '40000000-0000-4000-8000-0000000000c1'
     ) $$,
  '42501'
);

select lives_ok(
  $$ insert into public.market_data (project_id, data_scope, period)
     values (
       '20000000-0000-4000-8000-000000000001',
       'INTERNAL',
       '2026-11-01'
     ) $$,
  'PROJECT_ADMIN inserts market_data'
);
select lives_ok(
  $$ update public.market_data set source = 'admin'
     where market_data_id = '99000000-0000-4000-8000-0000000000a1' $$,
  'PROJECT_ADMIN updates market_data'
);
select throws_ok(
  $$ delete from public.market_data
     where market_data_id = '99000000-0000-4000-8000-0000000000a1' $$,
  '42501'
);

select lives_ok(
  $$ insert into public.report_template (
       organization_id, project_id, report_phase, report_type,
       name, template_definition, mapping_definition, source_type
     ) values (
       '10000000-0000-4000-8000-000000000001',
       '20000000-0000-4000-8000-000000000001',
       'MOVE_IN',
       'WEEKLY',
       'P1 admin template',
       '{}'::jsonb,
       '{}'::jsonb,
       'MANUAL'
     ) $$,
  'PROJECT_ADMIN inserts project-specific template'
);
select throws_ok(
  $$ insert into public.report_template (
       organization_id, project_id, report_phase, report_type,
       name, template_definition, mapping_definition, source_type
     ) values (
       '10000000-0000-4000-8000-000000000001',
       null,
       'MOVE_IN',
       'MONTHLY',
       'org write denied',
       '{}'::jsonb,
       '{}'::jsonb,
       'MANUAL'
     ) $$,
  '42501'
);
select throws_ok(
  $$ delete from public.report_template
     where template_id = 'a5000000-0000-4000-8000-000000000002' $$,
  '42501'
);

select throws_ok(
  $$ insert into public.report (
       project_id, report_phase, report_type, report_date,
       generated_data, generated_by
     ) values (
       '20000000-0000-4000-8000-000000000001',
       'MOVE_IN',
       'DAILY',
       '2026-09-10',
       '{}'::jsonb,
       '40000000-0000-4000-8000-0000000000c1'
     ) $$,
  '42501'
);
select throws_ok(
  $$ update public.report set version = 9
     where report_id = 'a6000000-0000-4000-8000-0000000000a1' $$,
  '42501'
);
select throws_ok(
  $$ delete from public.report
     where report_id = 'a6000000-0000-4000-8000-0000000000a1' $$,
  '42501'
);

select throws_ok(
  $$ insert into public.cs_ticket (
       project_id, contract_id, unit_id, customer_id,
       category, title, description, created_by
     ) values (
       '20000000-0000-4000-8000-000000000001',
       '96000000-0000-4000-8000-0000000000a1',
       '79000000-0000-4000-8000-000000000001',
       '59000000-0000-4000-8000-0000000000a1',
       '누수',
       'admin forged',
       '설명',
       '40000000-0000-4000-8000-0000000000c1'
     ) $$,
  '42501'
);
select is_empty(
  $$ select contract_id from public.contract
     where contract_id = '96000000-0000-4000-8000-0000000000b1' $$,
  'PROJECT_ADMIN P1 cannot select project-two contract'
);

-- consultation admin regression
select isnt_empty(
  $$ select id from public.consultation
     where id = '60000000-0000-4000-8000-0000000000f1' $$,
  'PROJECT_ADMIN sees same-project consultations'
);
select is_empty(
  $$ select id from public.consultation
     where id = '60000000-0000-4000-8000-0000000000b1' $$,
  'PROJECT_ADMIN cannot IDOR project-two consultation'
);

reset role;
select pg_temp.clear_auth();

select * from finish();
rollback;
