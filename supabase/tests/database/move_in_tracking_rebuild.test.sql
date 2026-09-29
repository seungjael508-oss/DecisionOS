begin;
select plan(19);

-- Task 2: current master snapshot and tracking storage are additive and secured.
select has_column(
  'public'::name,
  'unit_occupancy_status'::name,
  'legacy_grade'::name,
  'unit_occupancy_status.legacy_grade exists'
);
select has_column(
  'public'::name,
  'unit_occupancy_status'::name,
  'legacy_grade_as_of'::name,
  'unit_occupancy_status.legacy_grade_as_of exists'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.unit_occupancy_status'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%legacy_grade%'
  ),
  'legacy_grade has a database check constraint'
);

select has_table('public'::name, 'move_in_tracking_policy'::name);
select has_table('public'::name, 'move_in_tracking_disposition'::name);
select has_table('public'::name, 'move_in_tracking_exclusion'::name);
select ok((select relrowsecurity from pg_class where oid = 'public.move_in_tracking_policy'::regclass), 'policy RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.move_in_tracking_disposition'::regclass), 'disposition RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.move_in_tracking_exclusion'::regclass), 'exclusion RLS enabled');

-- Narrow RPCs are callable only by authenticated users; direct table DML is not granted.
select has_function('public'::name, 'complete_or_snooze_move_in_tracking'::name);
select has_function('public'::name, 'set_move_in_tracking_exclusion'::name);
select ok(
  not has_table_privilege('authenticated', 'public.move_in_tracking_disposition', 'INSERT,UPDATE,DELETE')
  and not has_table_privilege('anon', 'public.move_in_tracking_disposition', 'INSERT,UPDATE,DELETE'),
  'tracking disposition has no direct browser DML grant'
);
select ok(
  not has_function_privilege('anon', 'public.complete_or_snooze_move_in_tracking(uuid,uuid,text,timestamptz,text)', 'EXECUTE')
  and not has_function_privilege('public', 'public.complete_or_snooze_move_in_tracking(uuid,uuid,text,timestamptz,text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.complete_or_snooze_move_in_tracking(uuid,uuid,text,timestamptz,text)', 'EXECUTE'),
  'disposition RPC is authenticated-only and not PUBLIC/anon'
);

-- Task 3: the extended consultation signature retains old named-call compatibility.
select has_function('public'::name, 'create_move_in_consultation'::name);
select ok(
  exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'create_move_in_consultation'
      and 'p_clear_next_contact_at' = any(p.proargnames)
  ),
  'consultation RPC supports explicit next-contact clear'
);

-- Task 4: Queue is a security-invoker read model with no raw customer/contact fields.
select has_function('public'::name, 'get_move_in_today_queue'::name);
select ok(
  exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'get_move_in_today_queue'
      and p.provolatile = 's'::"char" and not p.prosecdef
  ),
  'today queue is STABLE SECURITY INVOKER'
);
select ok(
  not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join pg_type t on t.oid = p.prorettype
    join pg_attribute a on a.attrelid = t.typrelid and a.attnum > 0 and not a.attisdropped
    where n.nspname = 'public' and p.proname = 'get_move_in_today_queue'
      and a.attname in ('customer_name', 'phone', 'content')
  ),
  'today queue return type contains no customer name, phone, or consultation content'
);

select ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('move_in_tracking_policy', 'move_in_tracking_disposition', 'move_in_tracking_exclusion')
      and column_name in ('color', 'color_token', 'ui_color')
  ),
  'tracking storage does not persist UI color'
);

rollback;
