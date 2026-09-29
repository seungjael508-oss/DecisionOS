begin;
select plan(31);

-- Tracking storage is read-only to authenticated callers. Field operations
-- write through SECURITY DEFINER RPCs, never through table privileges.
select ok(
  has_table_privilege('authenticated', 'public.move_in_tracking_policy', 'SELECT'),
  'authenticated retains approved SELECT on tracking policy'
);
select ok(
  has_table_privilege('authenticated', 'public.move_in_tracking_disposition', 'SELECT'),
  'authenticated retains approved SELECT on tracking disposition'
);
select ok(
  has_table_privilege('authenticated', 'public.move_in_tracking_exclusion', 'SELECT'),
  'authenticated retains approved SELECT on tracking exclusion'
);

select ok(not has_table_privilege('authenticated', 'public.move_in_tracking_policy', 'INSERT, UPDATE, DELETE'), 'authenticated has no policy DML');
select ok(not has_table_privilege('authenticated', 'public.move_in_tracking_disposition', 'INSERT, UPDATE, DELETE'), 'authenticated has no disposition DML');
select ok(not has_table_privilege('authenticated', 'public.move_in_tracking_exclusion', 'INSERT, UPDATE, DELETE'), 'authenticated has no exclusion DML');

select ok(not has_table_privilege('authenticated', 'public.move_in_tracking_policy', 'TRUNCATE'), 'authenticated cannot truncate tracking policy');
select ok(not has_table_privilege('authenticated', 'public.move_in_tracking_disposition', 'TRUNCATE'), 'authenticated cannot truncate tracking disposition');
select ok(not has_table_privilege('authenticated', 'public.move_in_tracking_exclusion', 'TRUNCATE'), 'authenticated cannot truncate tracking exclusion');

select ok(not has_table_privilege('authenticated', 'public.move_in_tracking_policy', 'REFERENCES'), 'authenticated has no policy references privilege');
select ok(not has_table_privilege('authenticated', 'public.move_in_tracking_disposition', 'REFERENCES'), 'authenticated has no disposition references privilege');
select ok(not has_table_privilege('authenticated', 'public.move_in_tracking_exclusion', 'REFERENCES'), 'authenticated has no exclusion references privilege');

select ok(not has_table_privilege('authenticated', 'public.move_in_tracking_policy', 'TRIGGER'), 'authenticated has no policy trigger privilege');
select ok(not has_table_privilege('authenticated', 'public.move_in_tracking_disposition', 'TRIGGER'), 'authenticated has no disposition trigger privilege');
select ok(not has_table_privilege('authenticated', 'public.move_in_tracking_exclusion', 'TRIGGER'), 'authenticated has no exclusion trigger privilege');

select ok(not has_table_privilege('authenticated', 'public.move_in_tracking_policy', 'MAINTAIN'), 'authenticated has no policy maintain privilege');
select ok(not has_table_privilege('authenticated', 'public.move_in_tracking_disposition', 'MAINTAIN'), 'authenticated has no disposition maintain privilege');
select ok(not has_table_privilege('authenticated', 'public.move_in_tracking_exclusion', 'MAINTAIN'), 'authenticated has no exclusion maintain privilege');

select ok(not has_table_privilege('anon', 'public.move_in_tracking_policy', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER'), 'anon has no policy table privilege');
select ok(not has_table_privilege('anon', 'public.move_in_tracking_disposition', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER'), 'anon has no disposition table privilege');
select ok(not has_table_privilege('anon', 'public.move_in_tracking_exclusion', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER'), 'anon has no exclusion table privilege');

select ok(not has_table_privilege('public', 'public.move_in_tracking_policy', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER'), 'PUBLIC has no policy table privilege');
select ok(not has_table_privilege('public', 'public.move_in_tracking_disposition', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER'), 'PUBLIC has no disposition table privilege');
select ok(not has_table_privilege('public', 'public.move_in_tracking_exclusion', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER'), 'PUBLIC has no exclusion table privilege');

-- The narrow RPC boundary remains the only field-operation write path.
select ok(
  has_function_privilege('authenticated', 'public.complete_or_snooze_move_in_tracking(uuid,uuid,text,timestamptz,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.complete_or_snooze_move_in_tracking(uuid,uuid,text,timestamptz,text)', 'EXECUTE')
  and not has_function_privilege('public', 'public.complete_or_snooze_move_in_tracking(uuid,uuid,text,timestamptz,text)', 'EXECUTE'),
  'COMPLETE/SNOOZE RPC remains authenticated-only'
);
select ok(
  has_function_privilege('authenticated', 'public.set_move_in_tracking_exclusion(uuid,uuid,boolean,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.set_move_in_tracking_exclusion(uuid,uuid,boolean,text)', 'EXECUTE')
  and not has_function_privilege('public', 'public.set_move_in_tracking_exclusion(uuid,uuid,boolean,text)', 'EXECUTE'),
  'exclusion RPC remains authenticated-only and role-gated internally'
);
select ok(
  has_function_privilege('authenticated', 'public.get_move_in_today_queue(uuid,timestamptz)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.get_move_in_today_queue(uuid,timestamptz)', 'EXECUTE')
  and not has_function_privilege('public', 'public.get_move_in_today_queue(uuid,timestamptz)', 'EXECUTE'),
  'today Queue read RPC remains authenticated-only'
);
select ok(
  has_function_privilege('authenticated', 'public.create_move_in_consultation(uuid,uuid,uuid,text,text,text,timestamptz,public.occupancy_intent,public.funding_status,public.move_in_status,date,timestamptz,timestamptz,text,text,boolean,public.operational_intent)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.create_move_in_consultation(uuid,uuid,uuid,text,text,text,timestamptz,public.occupancy_intent,public.funding_status,public.move_in_status,date,timestamptz,timestamptz,text,text,boolean,public.operational_intent)', 'EXECUTE')
  and not has_function_privilege('public', 'public.create_move_in_consultation(uuid,uuid,uuid,text,text,text,timestamptz,public.occupancy_intent,public.funding_status,public.move_in_status,date,timestamptz,timestamptz,text,text,boolean,public.operational_intent)', 'EXECUTE'),
  'consultation field-write RPC remains authenticated-only'
);

-- ACL hardening must not break narrow field-operation RPCs. The seed already
-- supplies these two auth users; all fixture rows are rolled back below.
create function pg_temp.login(p_user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user_id::text, true)::void
$$;

insert into public.project (id, organization_id, name)
values ('1283e198-5043-4027-96d6-edcc7a6686c6', '10000000-0000-4000-8000-000000000001', 'ACL tracking fixture');
insert into public.project_member (id, project_id, user_id, role) values
  ('4183e198-5043-4027-96d6-edcc7a6686c6', '1283e198-5043-4027-96d6-edcc7a6686c6', '30000000-0000-4000-8000-0000000000c1', 'PROJECT_ADMIN'),
  ('4183e198-5043-4027-96d6-edcc7a6686c7', '1283e198-5043-4027-96d6-edcc7a6686c6', '30000000-0000-4000-8000-00000000000e', 'CLIENT_MANAGER');
insert into public.project_unit (unit_id, project_id, building_no, unit_no)
values ('5183e198-5043-4027-96d6-edcc7a6686c6', '1283e198-5043-4027-96d6-edcc7a6686c6', '101', '201');
insert into public.customer (id, project_id, name, phone, phone_normalized)
values ('6183e198-5043-4027-96d6-edcc7a6686c6', '1283e198-5043-4027-96d6-edcc7a6686c6', 'ACL fixture', '01090000001', '01090000001');
insert into public.contract (contract_id, project_id, unit_id, customer_id, contract_status)
values ('7183e198-5043-4027-96d6-edcc7a6686c6', '1283e198-5043-4027-96d6-edcc7a6686c6', '5183e198-5043-4027-96d6-edcc7a6686c6', '6183e198-5043-4027-96d6-edcc7a6686c6', 'ACTIVE');
insert into public.unit_occupancy_status (project_id, unit_id, contract_id, next_contact_at)
values ('1283e198-5043-4027-96d6-edcc7a6686c6', '5183e198-5043-4027-96d6-edcc7a6686c6', '7183e198-5043-4027-96d6-edcc7a6686c6', now() - interval '1 minute');

select pg_temp.login('30000000-0000-4000-8000-00000000000e');
set local role authenticated;
select lives_ok(
  $$select public.complete_or_snooze_move_in_tracking('1283e198-5043-4027-96d6-edcc7a6686c6', '5183e198-5043-4027-96d6-edcc7a6686c6', 'COMPLETE')$$,
  'CLIENT_MANAGER can COMPLETE through the narrow RPC after ACL hardening'
);
select throws_ok(
  $$select public.set_move_in_tracking_exclusion('1283e198-5043-4027-96d6-edcc7a6686c6', '5183e198-5043-4027-96d6-edcc7a6686c6', true, 'not authorized')$$,
  '42501', null,
  'CLIENT_MANAGER cannot set a tracking exclusion'
);

reset role;
select pg_temp.login('30000000-0000-4000-8000-0000000000c1');
set local role authenticated;
select lives_ok(
  $$select public.set_move_in_tracking_exclusion('1283e198-5043-4027-96d6-edcc7a6686c6', '5183e198-5043-4027-96d6-edcc7a6686c6', true, 'approved')$$,
  'PROJECT_ADMIN can set a tracking exclusion through the narrow RPC'
);
reset role;

select * from finish();
rollback;
