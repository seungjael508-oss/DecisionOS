# November 11 Reservation Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reflect exactly the 321 booked household coordinates from 예약현황_2026_11_11_10_53_51.xlsx in both ledger and floorplan.

**Architecture:** Preserve the existing server-file reservation source and identity guards. Both views consume the same complete reservation snapshot, including explicit absence for released bookings. Add source time display through existing types and badges only where required.

**Tech Stack:** Next.js, TypeScript, ExcelJS, Supabase (read-only verification), Vercel.

**Spec:** User's November 11 work order; source audit in `outputs/reservation-20261111/source-audit.json`.

## Global Constraints

- 851 households; 321 unique booked households, exactly matching source coordinates.
- No production DB writes, migrations, new tables, RPCs, external services, or source-history deletion.
- Preserve payments, balance-paid status, contracts, counseling, actual occupancy, grades, independent tags and 851 detail links.
- Preserve floorplan pages 101–104 and 105–108.
- Candidate deploy uses `--prod --skip-domain`; retain existing live deployment until every gate passes.
- Existing workspace contains many uncommitted changes; do not include these wholesale in a reservation-only deployment.

## Review Focus

- Released household cannot fall back to an older BOOKED management source.
- A failed attempt does not cancel another valid booking; conflicting successful histories fail validation.
- Identity mismatches fail closed and are reported, never matched by name.
- Reservation date/time cannot modify actual move-in or financial fields.
- Both screens must expose identical household sets even when paid status and reservations coexist.

### Task 1: Establish immutable baseline and source comparison

**Files:** `tmp/audit-reservations-20261111.cjs`; `outputs/reservation-20261111/*`.

**Interfaces:** Input: both original workbooks, current production source, read-only authorized current household identities. Output: source hash, exact sets, differences and conflict list.

- [x] Verify 488 rows: BOOKED 321, user cancelled 159, admin cancelled 1, failed 7.
- [x] Compare local 282-booking artifact by coordinates: added 42, retained 279, released 3, date changed 4, date/time changed 7.
- [x] Verify zero duplicate bookings, no later nonfailed superseding rows, no missing coordinates in historical 851-unit fixture.
- [x] Resolve stayj.co.kr alias to current deployment ID using authorized Vercel tools; record team, project, Git source and exact production files.
- [x] Verify 851 current household identities read-only; report contract/holder mismatches without changing DB.
- [x] Prepare isolated release source based on the verified current deployment, preserving existing workspace edits.

### Task 2: Refresh shared reservation source and minimal display propagation

**Files:** `src/lib/move-in/floorplan-reservations.server.ts`; `ledger-management.server.ts`; `ledger-management-source.ts`; affected reservation date/time types and badge callers in ledger and floorplan (exact additional paths determined from verified production baseline).

**Interfaces:** Existing `floorplanReservationFor(identity: ManagementIdentity)` returns a guarded source status, date and original time. Both ledger and floorplan use the same reservation overlay after authorization.

- [x] Add meaningful regression coverage: exact 321-coordinate equality, 3 released units absent, new/date/time changes, cross-project/identity rejection, reservation independent of occupancy/payments.
- [x] Run the new regression checks and confirm the current 282-source/shared-path deficiencies are detected.
- [x] Generate the immutable source from Excel coordinates and current authorized identities, retaining source hash and timestamp; never invent date/time.
- [x] Route ledger reservation status through the shared source, ensuring missing snapshot coordinates clear stale reservations without erasing other management fields.
- [x] Carry source time through existing data types and display with the blue reservation badge; preserve grade, paid background and independent tags.
- [x] Run focused regression checks and compare exact household/date/time tuples in both rendered views; verify 851 links across the two floorplan pages.

### Task 3: Validate and stage a candidate

**Files:** `outputs/reservation-20261111/*` and isolated release source only.

**Interfaces:** Input: reviewed scoped patch and exact tuple reconciliation. Output: candidate deployment ID/URL, test evidence, unchanged production alias and DB-write status.

- [x] Run `npx tsc --noEmit`, `npm run lint`, `npm run test -- --run`, `npm run build` in the isolated release. Record existing failures separately; do not mark incomplete gates PASS.
- [x] Review patch against current production source for reservation-only scope.
- [x] Verify installed Vercel CLI flags, deploy production candidate with `--skip-domain`, and record deployment ID and URL.
- [ ] Inspect authenticated candidate administrator ledger and both floorplan pages; exact source tuple equality and preserved business state are required.
- [x] Record production alias before/after. No domain switch is authorized by the current work order, regardless of verification results.
- [x] Deliver all 10 requested report fields, including actual rendered counts, changed files and verification limitations.

## Current status

Implementation and isolated production-candidate deployment complete. See `outputs/reservation-20261111/report.json` and `progress.md`. Live read-only identities: 851 valid; local real-component exact reservation tuples: 321; detail links: 851; TypeScript/build pass; ESLint zero errors with one existing warning; 296 regression tests pass. Candidate `dpl_9GYQXC3QF4FYbgSDCQ4GmBnWFnkH` is READY with no aliases; all 270 deployed source/config hashes match. Production alias remains `dpl_7dE2m548SoMn1AHmeKojurF9fYQU`. Authenticated candidate UI and visual layout remain UNVERIFIED because browser host unavailable and native app approval timed out. Release gate HOLD. No production DB writes, merges or domain switches performed.
