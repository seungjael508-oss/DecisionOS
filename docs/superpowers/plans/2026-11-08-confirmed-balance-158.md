# Confirmed balance display: 2026-11-06

Implement the user's approved 158-unit policy using the existing Next.js read projections. Preserve all DB values and the date-required RPC. Add a separate optional field-confirmed display flag for the eight verified unit IDs, scoped to the Hwayang project and effective from 2026-11-06. Never populate balancePaidAt from this policy.

1. Add regression coverage against the 851-unit read-only snapshot: 150 dated units plus eight undated confirmations, 102-203 retained, exact 158 green tiles, 851 links, unchanged tags, and type totals.
2. Add one shared paid predicate and a server-side project/unit confirmation manifest with source hash and date provenance. Attach the flag only after existing access and identity checks.
3. Carry the flag through ledger/floorplan DTOs. Use the shared predicate for ledger chapter, row styling, floorplan count and coloring. Show two-decimal payment rate. Preserve dates and raw amounts.
4. Attach confirmations to authorized worklog reads only for report dates on/after the policy date. Section 2 uses the same predicate; actual dated daily payment events remain unchanged.
5. Run targeted regressions, complete suite, TypeScript, lint of touched files and production build. Recheck live DB totals. Save exact display/type counts and limits. No production domain switch as part of this unverified work.

No new tables, migrations, writes, RPC changes, contract ID changes, payment edits or audit-history edits. This is a versioned display confirmation, not a dated DB payment registration. Future cancellation/contract transfers of these confirmations require explicit reconciliation of the manifest; do not silently treat a display flag as permission to write.
