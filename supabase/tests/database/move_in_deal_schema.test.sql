begin;

select no_plan();

select has_table('public'::name, 'brokerage_office'::name);
select has_table('public'::name, 'brokerage_contact'::name);
select has_table('public'::name, 'unit_deal'::name);
select has_table('public'::name, 'unit_deal_brokerage'::name);

select col_is_pk('public'::name, 'brokerage_office'::name, 'id'::name);
select col_is_pk('public'::name, 'brokerage_contact'::name, 'id'::name);
select col_is_pk('public'::name, 'unit_deal'::name, 'id'::name);
select col_is_pk(
  'public'::name,
  'unit_deal_brokerage'::name,
  array['unit_deal_id'::name, 'brokerage_office_id'::name]
);

select hasnt_column('public'::name, 'unit_deal'::name, 'occupancy_intent'::name);

select col_not_null('public'::name, 'brokerage_office'::name, 'project_id'::name);
select col_not_null('public'::name, 'brokerage_office'::name, 'name'::name);
select col_not_null('public'::name, 'brokerage_office'::name, 'active'::name);
select col_is_null('public'::name, 'brokerage_office'::name, 'address'::name);
select col_is_null('public'::name, 'brokerage_office'::name, 'main_phone'::name);

select col_not_null('public'::name, 'brokerage_contact'::name, 'project_id'::name);
select col_not_null('public'::name, 'brokerage_contact'::name, 'brokerage_office_id'::name);
select col_not_null('public'::name, 'brokerage_contact'::name, 'role'::name);
select col_not_null('public'::name, 'brokerage_contact'::name, 'name'::name);

select col_not_null('public'::name, 'unit_deal'::name, 'project_id'::name);
select col_not_null('public'::name, 'unit_deal'::name, 'unit_id'::name);
select col_not_null('public'::name, 'unit_deal'::name, 'contract_id'::name);
select col_not_null('public'::name, 'unit_deal'::name, 'customer_id'::name);
select col_not_null('public'::name, 'unit_deal'::name, 'consent_status'::name);
select col_not_null('public'::name, 'unit_deal'::name, 'deal_status'::name);
select col_not_null('public'::name, 'unit_deal'::name, 'updated_by_project_member_id'::name);

select ok(
  exists (
    select 1 from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public' and rel.relname = 'unit_deal'
      and c.contype = 'u'
      and pg_get_constraintdef(c.oid) = 'UNIQUE (project_id, unit_id)'
  ),
  'UNIQUE (project_id, unit_id) on unit_deal'
);

select ok(
  exists (
    select 1 from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public' and rel.relname = 'unit_deal'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%CONSENTED%'
      and pg_get_constraintdef(c.oid) ilike '%NOT_CONSENTED%'
  ),
  'unit_deal consent_status CHECK'
);

select ok(
  exists (
    select 1 from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public' and rel.relname = 'unit_deal'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%IN_PROGRESS%'
      and pg_get_constraintdef(c.oid) ilike '%COMPLETED%'
  ),
  'unit_deal deal_status CHECK'
);

select ok(
  exists (
    select 1 from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public' and rel.relname = 'brokerage_contact'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%REP%'
      and pg_get_constraintdef(c.oid) ilike '%MANAGER1%'
      and pg_get_constraintdef(c.oid) ilike '%MANAGER2%'
  ),
  'brokerage_contact role CHECK'
);

select ok(
  (
    select bool_and(c.relrowsecurity)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in (
        'brokerage_office','brokerage_contact','unit_deal','unit_deal_brokerage'
      )
  ),
  'RLS enabled on 4 deal tables'
);

select is_empty(
  $$
    select c.relname || '.' || p.polname
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in (
        'brokerage_office','brokerage_contact','unit_deal','unit_deal_brokerage'
      )
      and p.polcmd <> 'r'
  $$,
  'no direct write policies on deal tables'
);

select finish();
rollback;
