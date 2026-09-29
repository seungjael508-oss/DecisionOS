-- Run this pgTAP file with a local Supabase `authenticator` DB connection.
-- SECURITY DEFINER EXECUTE is checked against session_user, so a postgres
-- session with SET ROLE anon is not a faithful anonymous request simulation.
begin;
set local role anon;
set local search_path = extensions, public;
select plan(2);
select throws_ok(
  $$select public.assign_move_in_customers(
    '1283e198-5043-4027-96d6-edcc7a6686c6'::uuid,
    array['00000000-0000-0000-0000-000000000001'::uuid],
    '00000000-0000-0000-0000-000000000002'::uuid
  )$$,
  '42501',
  null,
  'anon assignment RPC returns permission denied'
);

select lives_ok(
  'select 1',
  'database remains usable after anonymous permission denial'
);

select * from finish();
rollback;
