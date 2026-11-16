# November 16 reservation refresh

> Execute inline with superpowers:executing-plans. User approved source refresh, commit and existing PR update.

**Goal:** Reflect the 339 unique completed bookings in the November 16 workbook consistently in ledger and floorplan.

**Architecture:** Keep the authorized server projection and six-field identity guard. Generate a complete 851-unit snapshot from read-only current identities; absent bookings explicitly return NONE. Preserve original reservation dates and times. No database writes. User subsequently authorized production deployment.

**Tech stack:** TypeScript, Next.js, Vitest; XLSX XML extraction with PowerShell.

**Spec:** Approved conversation request and `예약현황_2026_11_16_14_31_33.xlsx`.

## Constraints and review focus

- Do not include names, phones, workbook or scratch artifacts in the commit.
- Reject duplicate completed coordinates, malformed dates/times, unmatched coordinates and superseded completions.
- Preserve project/unit/contract/customer/coordinate guards and fail closed on identity mismatch.
- Clear stale reservations in the ledger while preserving other management fields.
- Preserve grades, source tags, payment state, actual occupancy and detail links.
- Work on the existing PR branch; preserve unrelated local changes.

## Tasks

- [x] Audit workbook and compare source snapshots; verify current identities read-only.
- [x] Add failing regression tests for exact date/time tuples in both screens, released bookings and identity rejection.
- [x] Generate complete source and minimally propagate time and shared reservation overlay.
- [x] Run focused tests, full suite, TypeScript and scoped ESLint; inspect rendered components.
- [ ] Stage production build, verify source hashes and HTTP behavior, then promote and verify the production domain.
- [ ] Review complete patch, commit, push and verify PR head; update description when permissions permit.

## Execution record

- Baseline from preceding task: 343 tests passed, 2 environment-dependent tests skipped; TypeScript passed. Existing local changes: `.gitignore` and `src/proxy.ts`, excluded.
- Ruling: continue on the user-selected PR branch without creating a worktree. The task is a source refresh on that branch and staging will use explicit paths.
- Workbook SHA256: `1a81ae3709598eb6dea0542f55f85590596b49a232ef545ee8b10e49f7f7327e`. 516 history rows, 339 unique completed bookings; 851 live current identities, no unmatched or superseding records.
- Versus November 11: 19 added, 1 released, 4 date changes, 4 time changes. The other 512 units explicitly return NONE/null/null.
- RED: new tests failed for missing time, outdated bookings and mismatch response. GREEN: all three exact-tuple/rendering/identity tests passed.
- Root suite: 346 passed, 2 environment-dependent tests skipped. Root TypeScript and scoped ESLint passed.
- Production baseline: `dpl_9GYQXC3QF4FYbgSDCQ4GmBnWFnkH`; verified all 270 deployed source hashes against the local baseline. Candidate changes only `src/lib/move-in/floorplan-reservations-data.server.ts` and preserves the deployed wrapper and other source files.
- Candidate suite: 296 tests passed, including the new 339-booking coverage. The older 282/321 snapshot tests are superseded and excluded from this candidate run. Candidate route type generation, TypeScript and scoped ESLint passed.
- Independent reviewer: no critical or important findings; verified all 851 identities and all 339 date/time tuples, the one-file production patch and no payment/occupancy mutations.
- Browser host failed to initialize; authenticated visual browser verification is unavailable. Component-rendering reconciliation and deployed HTTP/source verification provide the available evidence.
