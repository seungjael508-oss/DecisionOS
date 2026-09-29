# Move-in Tracking Task 1–6 — Production Runbook

## Execution boundary

This document is a runbook only. It does not authorize a Production migration
push, seed, or Vercel deployment. Approvals must remain separate: migration
apply, seed, smoke verification, then deployment.

## Approved migration identity

Only these three clean-rebuild migrations plus the approved additive Operational Intent migration are execution targets:

| Order | Migration | SHA-256 |
| --- | --- | --- |
| 1 | `20260929060600_move_in_tracking_core.sql` | `53ac14fee2620208dd23d7fd6ee997243088a0ae6d2054be8c1048b4630e8806` |
| 2 | `20260929060802_move_in_consultation_schedule.sql` | `225c637191bd9ca47a9be47e800c1d413e0af48f3e7fe2bdbde9554ca0e186c5` |
| 3 | `20260929060803_move_in_today_queue.sql` | `fc6f3fc402ad32bf7c10726bb003cde4b0985498fd9ba3db53a62a7254ed7e8f` |
| 4 | `20260929093215_move_in_operational_intent.sql` | `b7427c552b18a6ca92d9099def9ebbe34cb6d109440c4b3bc066df8f7762a919` |

`20260916070623_customer_phone_quality.sql` is already in Production history.
It must be Local/Remote aligned and is not an apply target.

## Gate 1 — Preflight

1. Fetch the remote lineage and verify the approved base/branch.
2. Confirm the execution worktree has no unrelated staged changes.
3. Run `supabase migration list --linked`. `20260916070623` must be
   Local/Remote aligned and there must be no history mismatch.
4. Run `supabase db push --linked --dry-run`.
5. Continue only when the pending list contains exactly the four migrations
   above, in order. Stop for every other pending migration or mismatch.

The required accepted pre-production evidence is:

- pgTAP: 33 files / 1,722 assertions passed.
- Authenticator: 2/2 assertions passed.
- Vitest: 67 files / 524 tests passed.
- Synthetic Queue fixture: 321 rows / 321 unique units.
- `EXPLAIN (ANALYZE, BUFFERS)`: 251.479 ms.
- Prior-holder contamination: 0.
- Browser hydration errors: 0.
- No C/D/absence tracking-policy seed.

## Gate 2 — Migration apply and verification

After separate migration approval, apply the four migrations in table order.
Verify each before proceeding.

1. Tracking core: `legacy_grade` and `legacy_grade_as_of` exist; tracking
   policy/disposition/exclusion objects exist with RLS enabled; privileged
   functions have no `PUBLIC` or `anon` execute grant.
2. Consultation/schedule: backward-compatible consultation invocation,
   schedule supersession, next-contact handling, and the narrow
   COMPLETE/SNOOZE RPC exist with the approved execute boundary.
3. Today Queue: `get_move_in_today_queue` is `STABLE SECURITY INVOKER`, returns
   no more than one row per current-holder unit, and exposes no customer name,
   phone number, or consultation content.
4. Operational Intent: the enum has exactly seven values; current status defaults
   to `UNDECIDED`; `operational_intent_as_of` stays nullable; the history
   allowlist includes `operational_intent`; and the consultation RPC accepts its
   new final optional parameter while the legacy invocation remains valid.
   Direct DML remains denied, and TERMINATION/ABANDONMENT do not change contract,
   holder, payment, or tracking lifecycle.

Stop on an object, RLS, grant, or migration error. Do not continue a partial
sequence.

## Gate 3 — Master legacy-grade seed

The seed is separately approved and uses a regenerated new-schema preview. The
former preview checksum is source evidence only and must not be reused as a new
manifest approval value.

The temporary seed source uses this verified key:

```text
project_id
unit_id
active_contract_id
legacy_grade
source_row_no
source_hash
```

`project_id + unit_id + active_contract_id` is the seed key. Building/unit
numbers are audit evidence and must not resolve a different current contract.

Immediately before the transaction, stop unless all conditions hold:

- Active units, contracts, and current holders: 851 each.
- Preview rows and unique unit IDs: 851.
- Duplicate unit IDs, duplicate active-contract IDs, null keys, unmatched rows,
  prior-holder contamination, and inactive/cancelled contamination: all 0.
- Valid grades only: A, B, C, D, 부재, 상담거절; total: 851.

In the one approved transaction, capture `transaction_timestamp()` once,
revalidate the manifest key against the current active contract state, update
exactly 851 occupancy-status rows, and write that same timestamp to every
`legacy_grade_as_of`. Never backdate from the workbook or consultations. Do
not seed C/D/absence tracking-policy rows.

Post-commit, verify grade and timestamp not-null counts of 851, exactly one
distinct `legacy_grade_as_of`, the approved A/B/C/D/부재/상담거절 distribution,
and no change to customer master, consultation, contract, unit-deal, payment,
market, or attendance data.

## Gate 4 — Smoke tests and rollback

Run the Today Queue with fixed `p_now`: one row per unit, no prior holder,
expected reason arrays, and no stale C/D/absence reason without an approved
policy. Verify CLIENT_MANAGER field-operation writes are allowed while master,
contract, payment-ledger, role/invitation, and attendance-correction writes
remain denied.

Data rollback is limited to the 851 `legacy_grade` and `legacy_grade_as_of`
values and requires its own approved transaction. Migration rollback is reverse
dependency order: Today Queue, consultation/schedule, tracking core. If later
work depends on an applied migration, prefer a separately approved forward fix.

Stop for any extra pending migration, 851-mapping mismatch, holder mismatch,
invalid grade, seed count other than 851, timestamp distinct count other than
one, forbidden CLIENT_MANAGER write success, or duplicate Queue unit.

## Gate 5 — Deployment

Vercel Production deployment requires a separate approval after every DB gate
passes. Smoke only login, Dashboard, Units, Today Queue, consultation save and
returnTo, and CLIENT_MANAGER access. Database apply and deployment are never a
single step.
