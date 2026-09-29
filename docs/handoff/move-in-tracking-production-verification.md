# Move-in Tracking Task 1–6 — Production Verification Checklist

This checklist records evidence required before each separately approved
Production gate. Checking an item does not authorize the next gate.

## Migration identity

- [ ] `20260916070623_customer_phone_quality.sql` is Local/Remote aligned.
- [ ] Only these four migrations are pending in `supabase db push --linked --dry-run`:
  - [ ] `20260929060600_move_in_tracking_core.sql`
  - [ ] `20260929060802_move_in_consultation_schedule.sql`
  - [ ] `20260929060803_move_in_today_queue.sql`
  - [ ] `20260929093215_move_in_operational_intent.sql`
- [ ] No additional pending migration or migration-history mismatch exists.
- [ ] SHA-256 values match the approved execution record:
  - [ ] `53ac14fee2620208dd23d7fd6ee997243088a0ae6d2054be8c1048b4630e8806`
  - [ ] `225c637191bd9ca47a9be47e800c1d413e0af48f3e7fe2bdbde9554ca0e186c5`
  - [ ] `fc6f3fc402ad32bf7c10726bb003cde4b0985498fd9ba3db53a62a7254ed7e8f`
  - [ ] `b7427c552b18a6ca92d9099def9ebbe34cb6d109440c4b3bc066df8f7762a919`

## Accepted pre-production evidence

- [ ] pgTAP: 33 files / 1,722 assertions passed.
- [ ] Authenticator: 2/2 assertions passed.
- [ ] Vitest: 67 files / 524 tests passed.
- [ ] Synthetic Queue fixture: 321 rows / 321 unique units.
- [ ] `EXPLAIN (ANALYZE, BUFFERS)` execution time: 251.479 ms.
- [ ] Queue plan has no unit-by-unit N+1 or correlated per-unit consultation lookup.
- [ ] Prior-holder contamination: 0.
- [ ] Browser hydration errors: 0.
- [ ] No C/D/absence tracking policy seed is included.

## Operational Intent verification

- [ ] The enum contains the approved seven values and current rows default to `UNDECIDED`.
- [ ] `operational_intent_as_of` is nullable; no Operational Intent seed exists.
- [ ] `contract_status_history` accepts `operational_intent` while its earlier allowlist remains valid.
- [ ] The consultation RPC accepts the optional intent parameter and its legacy caller remains compatible.
- [ ] Direct status DML stays denied; TERMINATION and ABANDONMENT do not mutate contract, holder, payment, or tracking lifecycle.
- [ ] The Operational Intent seed is separate from the approved 851-row legacy-grade seed.

## New-schema seed-preview readiness

- [ ] A new preview is generated after the three clean-rebuild migrations pass linked preflight; the former preview manifest checksum is not reused.
- [ ] Preview uses `project_id + unit_id + active_contract_id` as its key.
- [ ] Preview has 851 rows and zero null/duplicate keys.
- [ ] Current active contract, unit relationship, and current-holder boundary are revalidated for every preview row.
- [ ] The source evidence remains the approved workbook and its verified grade distribution: A 245, B 156, C 381, D 39, 부재 19, 상담거절 11.
- [ ] Seed timestamp will be a single transaction-scoped `transaction_timestamp()` value for all 851 rows; it will not be backdated.

## Migration and seed gates

- [ ] Migration approval received separately.
- [ ] Each migration object/RLS/grant check passed before the next migration.
- [ ] Seed approval received separately.
- [ ] Active unit/contract/current-holder counts are all 851 immediately before seed.
- [ ] Post-seed grades and `legacy_grade_as_of` are non-null for 851 rows.
- [ ] Post-seed `legacy_grade_as_of` distinct count is 1.
- [ ] No unrelated customer, contract, consultation, payment, market, or attendance records changed.

## Smoke and deployment gates

- [ ] Queue has at most one row per active current-holder unit.
- [ ] CLIENT_MANAGER approved field-operation writes succeed and forbidden master/financial/security writes remain denied.
- [ ] Vercel deployment approval received separately after DB gates pass.
- [ ] Post-deploy login, units, Today Queue, consultation returnTo, and CLIENT_MANAGER smoke tests pass.

## Stop conditions

- [ ] Execution stopped if any identity, mapping, count, grant, queue, or seed condition above failed.
- [ ] Production migration push, seed, and Vercel deployment remain unstarted until their own approval gates are explicitly granted.
