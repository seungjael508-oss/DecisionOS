import 'server-only';
import { MANAGEMENT_SOURCE } from '@/lib/move-in/ledger-management-data.server';
import { createManagementSourceLookup,type ManagementContinuity } from '@/lib/move-in/ledger-management-source';
import { problemReasonText } from '@/lib/move-in/problem-household';
import type { LedgerSummaryRow } from '@/lib/move-in/ledger-types';

// Immutable artifact indexed once per server module, no per-unit DB or Excel reads.
const lookup = createManagementSourceLookup(MANAGEMENT_SOURCE);
export function attachLedgerManagement(row: LedgerSummaryRow,evidence?:ManagementContinuity): LedgerSummaryRow {
  const management = lookup(row,evidence);
  // DB 지정은 유지한다. 원천 결속 미확인을 비대상이나 채무 없음으로 바꾸지 않는다.
  if (row.problemFlags.length) return {...row,management:{...management,problemHousehold:'TARGET',
    managementReasons:[problemReasonText(row.problemFlags),...(row.problemLockReleased?['관리자 해제승인']:[]),...(row.problemNote?[row.problemNote]:[])]}};
  return {...row,management};
}
