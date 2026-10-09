import 'server-only';
import { MANAGEMENT_SOURCE } from '@/lib/move-in/ledger-management-data.server';
import { createManagementSourceLookup } from '@/lib/move-in/ledger-management-source';
import type { LedgerSummaryRow } from '@/lib/move-in/ledger-types';

// Immutable artifact indexed once per server module, no per-unit DB or Excel reads.
const lookup = createManagementSourceLookup(MANAGEMENT_SOURCE);
export function attachLedgerManagement(row: LedgerSummaryRow): LedgerSummaryRow {
  return {...row,management:lookup(row)};
}
