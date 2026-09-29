begin;

select no_plan();

select has_enum(
  'public'::name,
  'operational_intent'::name,
  'operational_intent enum exists'
);
select enum_has_labels(
  'public'::name,
  'operational_intent'::name,
  array[
    'MOVE_IN',
    'CONSIDERING_MOVE_IN',
    'SALE_TRANSFER',
    'RENT',
    'TERMINATION',
    'ABANDONMENT',
    'UNDECIDED'
  ]::text[],
  'operational_intent has the approved labels'
);

select has_column(
  'public'::name,
  'unit_occupancy_status'::name,
  'operational_intent'::name,
  'current operational_intent exists'
);
select col_type_is(
  'public'::name,
  'unit_occupancy_status'::name,
  'operational_intent'::name,
  'operational_intent'::name
);
select col_not_null(
  'public'::name,
  'unit_occupancy_status'::name,
  'operational_intent'::name,
  'current operational_intent is required'
);
select col_default_is(
  'public'::name,
  'unit_occupancy_status'::name,
  'operational_intent'::name,
  'UNDECIDED',
  'current operational_intent defaults to UNDECIDED'
);
select has_column(
  'public'::name,
  'unit_occupancy_status'::name,
  'operational_intent_as_of'::name,
  'operational_intent_as_of exists'
);
select col_is_null(
  'public'::name,
  'unit_occupancy_status'::name,
  'operational_intent_as_of'::name,
  'operational_intent_as_of is nullable until an explicit selection'
);
select has_index(
  'public'::name,
  'unit_occupancy_status'::name,
  'idx_uos_project_operational_intent'::name,
  array['project_id', 'operational_intent']::name[],
  'operational intent has a project-scoped filter index'
);

insert into public.project_unit (unit_id, project_id, building_no, unit_no)
values (
  '7f000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '999',
  '901'
);

insert into public.customer (
  id, project_id, name, phone, phone_normalized, assigned_counselor_id
) values (
  '5f000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'Operational Intent Test Customer',
  '01099999901',
  '01099999901',
  '40000000-0000-4000-8000-00000000000a'
);

insert into public.contract (
  contract_id, project_id, customer_id, unit_id, contract_status
) values (
  '9f000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '5f000000-0000-4000-8000-000000000001',
  '7f000000-0000-4000-8000-000000000001',
  'ACTIVE'
);

select lives_ok(
  $$
    insert into public.unit_occupancy_status (
      project_id, unit_id, contract_id
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '7f000000-0000-4000-8000-000000000001',
      '9f000000-0000-4000-8000-000000000001'
    );
  $$,
  'current occupancy snapshot can use the operational-intent default'
);
select results_eq(
  $$
    select coalesce(to_jsonb(u) ->> 'operational_intent', 'MISSING')
    from public.unit_occupancy_status u
    where contract_id = '9f000000-0000-4000-8000-000000000001'
  $$,
  $$ values ('UNDECIDED') $$,
  'new occupancy snapshot persists UNDECIDED without an explicit selection'
);

select lives_ok(
  $$
    insert into public.contract_status_history (
      project_id, contract_id, unit_id, field_changed, changed_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '9f000000-0000-4000-8000-000000000001',
      '7f000000-0000-4000-8000-000000000001',
      'occupancy_intent',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  'existing occupancy_intent history remains valid'
);
select lives_ok(
  $$
    insert into public.contract_status_history (
      project_id, contract_id, unit_id, field_changed, changed_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '9f000000-0000-4000-8000-000000000001',
      '7f000000-0000-4000-8000-000000000001',
      'funding_status',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  'existing funding_status history remains valid'
);
select lives_ok(
  $$
    insert into public.contract_status_history (
      project_id, contract_id, unit_id, field_changed, changed_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '9f000000-0000-4000-8000-000000000001',
      '7f000000-0000-4000-8000-000000000001',
      'move_in_status',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  'existing move_in_status history remains valid'
);
select lives_ok(
  $$
    insert into public.contract_status_history (
      project_id, contract_id, unit_id, field_changed, changed_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '9f000000-0000-4000-8000-000000000001',
      '7f000000-0000-4000-8000-000000000001',
      'operational_intent',
      '40000000-0000-4000-8000-00000000000a'
    );
  $$,
  'operational_intent history is accepted additively'
);


-- Task 2: final operational intent is changed only by an explicit RPC argument.
create function pg_temp.impersonate(p_user_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', p_user_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
end;
$$;

insert into public.customer (id, project_id, name, phone, phone_normalized)
values (
  '5f000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000001',
  'Operational Intent Mismatch Customer',
  '01099999902',
  '01099999902'
);

insert into public.project_unit (unit_id, project_id, building_no, unit_no)
values
  ('7f000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '999', '902'),
  ('7f000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', '999', '903'),
  ('7f000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', '999', '904'),
  ('7f000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000001', '999', '905'),
  ('7f000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000001', '999', '906'),
  ('7f000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000001', '999', '907'),
  ('7f000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000001', '999', '908'),
  ('7f000000-0000-4000-8000-000000000009', '20000000-0000-4000-8000-000000000002', '999', '909');

insert into public.contract (
  contract_id, project_id, customer_id, unit_id, contract_status
) values
  ('9f000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '5f000000-0000-4000-8000-000000000001', '7f000000-0000-4000-8000-000000000002', 'ACTIVE'),
  ('9f000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', '5f000000-0000-4000-8000-000000000001', '7f000000-0000-4000-8000-000000000003', 'ACTIVE'),
  ('9f000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', '5f000000-0000-4000-8000-000000000001', '7f000000-0000-4000-8000-000000000004', 'ACTIVE'),
  ('9f000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000001', '5f000000-0000-4000-8000-000000000001', '7f000000-0000-4000-8000-000000000005', 'ACTIVE'),
  ('9f000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000001', '5f000000-0000-4000-8000-000000000001', '7f000000-0000-4000-8000-000000000006', 'ACTIVE'),
  ('9f000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000001', '5f000000-0000-4000-8000-000000000001', '7f000000-0000-4000-8000-000000000007', 'ACTIVE'),
  ('9f000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000001', '5f000000-0000-4000-8000-000000000001', '7f000000-0000-4000-8000-000000000008', 'ACTIVE');

insert into public.unit_occupancy_status (project_id, unit_id, contract_id)
values
  ('20000000-0000-4000-8000-000000000001', '7f000000-0000-4000-8000-000000000002', '9f000000-0000-4000-8000-000000000002'),
  ('20000000-0000-4000-8000-000000000001', '7f000000-0000-4000-8000-000000000003', '9f000000-0000-4000-8000-000000000003'),
  ('20000000-0000-4000-8000-000000000001', '7f000000-0000-4000-8000-000000000004', '9f000000-0000-4000-8000-000000000004'),
  ('20000000-0000-4000-8000-000000000001', '7f000000-0000-4000-8000-000000000005', '9f000000-0000-4000-8000-000000000005'),
  ('20000000-0000-4000-8000-000000000001', '7f000000-0000-4000-8000-000000000006', '9f000000-0000-4000-8000-000000000006'),
  ('20000000-0000-4000-8000-000000000001', '7f000000-0000-4000-8000-000000000007', '9f000000-0000-4000-8000-000000000007'),
  ('20000000-0000-4000-8000-000000000001', '7f000000-0000-4000-8000-000000000008', '9f000000-0000-4000-8000-000000000008');

-- A no-selection call must preserve both a non-default current value and its
-- authoritative as-of timestamp; free text must not infer a replacement.
update public.unit_occupancy_status
set operational_intent = 'RENT',
    operational_intent_as_of = '2020-01-01T00:00:00Z'::timestamptz
where unit_id = '7f000000-0000-4000-8000-000000000007';

select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c1');
set local role authenticated;

select lives_ok(
  $$ select public.create_move_in_consultation(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_unit_id := '7f000000-0000-4000-8000-000000000002',
       p_customer_id := '5f000000-0000-4000-8000-000000000001',
       p_consultation_type := 'OUTBOUND',
       p_content := 'C explicit considering move in',
       p_legacy_grade := 'C',
       p_operational_intent := 'CONSIDERING_MOVE_IN'
     ) $$,
  'PROJECT_ADMIN records C + CONSIDERING_MOVE_IN'
);
select is(
  (
    select operational_intent::text
    from public.unit_occupancy_status
    where unit_id = '7f000000-0000-4000-8000-000000000002'
  ),
  'CONSIDERING_MOVE_IN',
  'explicit C consultation updates the current operational intent'
);
select ok(
  (select count(*) from public.contract_status_history h
   where h.unit_id = '7f000000-0000-4000-8000-000000000002'
     and h.field_changed = 'operational_intent') = 1
  and exists (
    select 1
    from public.contract_status_history h
    join public.consultation c on c.id = h.contact_id
    where h.unit_id = '7f000000-0000-4000-8000-000000000002'
      and h.field_changed = 'operational_intent'
      and h.previous_value = 'UNDECIDED'
      and h.new_value = 'CONSIDERING_MOVE_IN'
      and h.changed_by = '40000000-0000-4000-8000-0000000000c1'
      and h.changed_at = c.consulted_at
      and (select operational_intent_as_of from public.unit_occupancy_status where unit_id = h.unit_id) = c.consulted_at
  ),
  'changed intent has one linked, timestamp-authoritative history row'
);

select lives_ok(
  $$ select public.create_move_in_consultation(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_unit_id := '7f000000-0000-4000-8000-000000000003',
       p_customer_id := '5f000000-0000-4000-8000-000000000001',
       p_consultation_type := 'OUTBOUND',
       p_content := 'D explicit sale transfer',
       p_legacy_grade := 'D',
       p_operational_intent := 'SALE_TRANSFER'
     ) $$,
  'PROJECT_ADMIN records D + SALE_TRANSFER'
);
select is(
  (
    select operational_intent::text
    from public.unit_occupancy_status
    where unit_id = '7f000000-0000-4000-8000-000000000003'
  ),
  'SALE_TRANSFER',
  'explicit D consultation updates the current operational intent'
);

select lives_ok(
  $$ select public.create_move_in_consultation(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_unit_id := '7f000000-0000-4000-8000-000000000004',
       p_customer_id := '5f000000-0000-4000-8000-000000000001',
       p_consultation_type := 'OUTBOUND',
       p_content := 'TERMINATION is explicit only',
       p_operational_intent := 'TERMINATION'
     ) $$,
  'explicit TERMINATION is stored without lifecycle automation'
);
select ok(
  (select operational_intent::text from public.unit_occupancy_status where unit_id = '7f000000-0000-4000-8000-000000000004') = 'TERMINATION'
  and (select contract_status::text from public.contract where contract_id = '9f000000-0000-4000-8000-000000000004') = 'ACTIVE'
  and (select customer_id from public.contract where contract_id = '9f000000-0000-4000-8000-000000000004') = '5f000000-0000-4000-8000-000000000001'
  and (select count(*) from public.move_in_tracking_disposition where unit_id = '7f000000-0000-4000-8000-000000000004') = 0
  and (select count(*) from public.move_in_tracking_exclusion where unit_id = '7f000000-0000-4000-8000-000000000004') = 0,
  'TERMINATION changes no contract, holder, disposition, or exclusion state'
);

select lives_ok(
  $$ select public.create_move_in_consultation(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_unit_id := '7f000000-0000-4000-8000-000000000005',
       p_customer_id := '5f000000-0000-4000-8000-000000000001',
       p_consultation_type := 'OUTBOUND',
       p_content := 'ABANDONMENT is explicit only',
       p_operational_intent := 'ABANDONMENT'
     ) $$,
  'explicit ABANDONMENT is stored without lifecycle automation'
);
select ok(
  (select operational_intent::text from public.unit_occupancy_status where unit_id = '7f000000-0000-4000-8000-000000000005') = 'ABANDONMENT'
  and (select contract_status::text from public.contract where contract_id = '9f000000-0000-4000-8000-000000000005') = 'ACTIVE'
  and (select customer_id from public.contract where contract_id = '9f000000-0000-4000-8000-000000000005') = '5f000000-0000-4000-8000-000000000001'
  and (select count(*) from public.move_in_tracking_disposition where unit_id = '7f000000-0000-4000-8000-000000000005') = 0
  and (select count(*) from public.move_in_tracking_exclusion where unit_id = '7f000000-0000-4000-8000-000000000005') = 0,
  'ABANDONMENT changes no contract, holder, disposition, or exclusion state'
);

select lives_ok(
  $$ select public.create_move_in_consultation(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_unit_id := '7f000000-0000-4000-8000-000000000006',
       p_customer_id := '5f000000-0000-4000-8000-000000000001',
       p_consultation_type := 'OUTBOUND',
       p_content := 'explicit undecided',
       p_operational_intent := 'UNDECIDED'
     ) $$,
  'explicit UNDECIDED is accepted'
);
select ok(
  (select operational_intent::text from public.unit_occupancy_status where unit_id = '7f000000-0000-4000-8000-000000000006') = 'UNDECIDED'
  and (select operational_intent_as_of from public.unit_occupancy_status where unit_id = '7f000000-0000-4000-8000-000000000006') = (
    select consulted_at from public.consultation where unit_id = '7f000000-0000-4000-8000-000000000006' order by consulted_at desc limit 1
  )
  and (select count(*) from public.contract_status_history where unit_id = '7f000000-0000-4000-8000-000000000006' and field_changed = 'operational_intent') = 0,
  'explicit unchanged UNDECIDED updates as_of without creating history'
);

select lives_ok(
  $$ select public.create_move_in_consultation(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_unit_id := '7f000000-0000-4000-8000-000000000007',
       p_customer_id := '5f000000-0000-4000-8000-000000000001',
       p_consultation_type := 'OUTBOUND',
       p_content := '해지 전매 포기 문구만 있는 상담'
     ) $$,
  'free text without an explicit final intent is accepted'
);
select ok(
  (select operational_intent::text from public.unit_occupancy_status where unit_id = '7f000000-0000-4000-8000-000000000007') = 'RENT'
  and (select operational_intent_as_of from public.unit_occupancy_status where unit_id = '7f000000-0000-4000-8000-000000000007') = '2020-01-01T00:00:00Z'::timestamptz
  and (select count(*) from public.contract_status_history where unit_id = '7f000000-0000-4000-8000-000000000007' and field_changed = 'operational_intent') = 0,
  'no selection and free text preserve the current operational intent and as-of'
);

select lives_ok(
  $$ select public.create_move_in_consultation(
       '20000000-0000-4000-8000-000000000001'::uuid,
       '7f000000-0000-4000-8000-000000000008'::uuid,
       '5f000000-0000-4000-8000-000000000001'::uuid,
       'OUTBOUND'::text,
       'legacy 16 argument invocation'::text,
       null::text,
       null::timestamptz,
       null::public.occupancy_intent,
       null::public.funding_status,
       null::public.move_in_status,
       null::date,
       null::timestamptz,
       null::timestamptz,
       null::text,
       null::text,
       false
     ) $$,
  'existing 16-argument consultation invocation remains valid'
);

select pg_temp.impersonate('30000000-0000-4000-8000-00000000000a');
select lives_ok(
  $$ select public.create_move_in_consultation(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_unit_id := '7f000000-0000-4000-8000-000000000008',
       p_customer_id := '5f000000-0000-4000-8000-000000000001',
       p_consultation_type := 'OUTBOUND',
       p_content := 'COUNSELOR explicit rent',
       p_operational_intent := 'RENT'
     ) $$,
  'assigned COUNSELOR may record an explicit operational intent'
);
select is(
  (
    select operational_intent::text
    from public.unit_occupancy_status
    where unit_id = '7f000000-0000-4000-8000-000000000008'
  ),
  'RENT',
  'assigned COUNSELOR operational intent is applied through the consultation RPC'
);
select pg_temp.impersonate('30000000-0000-4000-8000-0000000000c1');

select throws_ok(
  $$ select public.create_move_in_consultation(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_unit_id := '7f000000-0000-4000-8000-000000000002',
       p_customer_id := '5f000000-0000-4000-8000-000000000002',
       p_consultation_type := 'OUTBOUND',
       p_content := 'current holder mismatch',
       p_operational_intent := 'MOVE_IN'
     ) $$,
  '23514',
  null,
  'current-holder mismatch is rejected before intent write'
);
select throws_ok(
  $$ select public.create_move_in_consultation(
       p_project_id := '20000000-0000-4000-8000-000000000001',
       p_unit_id := '7f000000-0000-4000-8000-000000000009',
       p_customer_id := '5f000000-0000-4000-8000-000000000001',
       p_consultation_type := 'OUTBOUND',
       p_content := 'cross project unit',
       p_operational_intent := 'MOVE_IN'
     ) $$,
  '23514',
  null,
  'cross-project unit is rejected before intent write'
);

select throws_ok(
  $$ update public.unit_occupancy_status
     set operational_intent = 'MOVE_IN'
     where unit_id = '7f000000-0000-4000-8000-000000000002' $$,
  '42501',
  null,
  'direct operational-intent snapshot DML remains denied'
);
select ok(
  to_regclass('public.payment_transaction') is null
  or not has_table_privilege('authenticated', 'public.payment_transaction', 'INSERT,UPDATE,DELETE'),
  'authenticated has no payment-ledger DML privilege'
);

reset role;

select * from finish();
rollback;
