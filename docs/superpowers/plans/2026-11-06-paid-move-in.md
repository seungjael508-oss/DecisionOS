# Paid and actual move-in separation implementation plan

**Goal:** Apply the user's approved date-based policy without changing schema or accounting source data.
**Architecture:** Keep balance_paid_at and actual_move_in_date independent. Reuse existing cards, ledger cells and the two existing RPC signatures.
**Spec:** User's 2026-11-06 scope and transition policy in this conversation.

- [ ] Add failing four-state UI/amount regression tests, then minimally update ledger/detail date-based presentation.
- [ ] Run the existing 67 tests plus new cases, type check, lint changed files and production build.
- [ ] Validate the existing two-RPC guard against ordinary transitions, paid-date preservation, authorization, CAS and audit, and independently review the candidate.
- [ ] Back up live definitions/ACL and data digests; apply only the two approved definitions after checks pass. Validate in rollback-only transactions and recheck baseline.
- [ ] Stage existing Vercel project with unchanged production configuration, inspect deployed responses/logs, then promote only if release gates pass.

No new RPC/table/column, bulk paid-date updates, or accounting source changes. Stop release on failed authorization, bypass, regression, build or integrity gates.
