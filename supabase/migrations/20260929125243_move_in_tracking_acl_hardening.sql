-- Correct inherited/default table ACLs without changing tracking schema, RLS,
-- or RPC behavior. Field-operation writes remain SECURITY DEFINER RPC-only.
revoke all privileges on table
  public.move_in_tracking_policy,
  public.move_in_tracking_disposition,
  public.move_in_tracking_exclusion
from public, anon, authenticated;

grant select on table
  public.move_in_tracking_policy,
  public.move_in_tracking_disposition,
  public.move_in_tracking_exclusion
to authenticated;
