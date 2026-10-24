import 'server-only';
import { MANAGEMENT_SOURCE } from '@/lib/move-in/ledger-management-data.server';
import { createManagementSourceLookup } from '@/lib/move-in/ledger-management-source';
import { problemReasonText } from '@/lib/move-in/problem-household';
import type { LedgerSummaryRow } from '@/lib/move-in/ledger-types';

// Immutable artifact indexed once per server module, no per-unit DB or Excel reads.
const lookup = createManagementSourceLookup(MANAGEMENT_SOURCE);
export function attachLedgerManagement(row: LedgerSummaryRow): LedgerSummaryRow {
  const management = lookup(row);
  // 문제세대는 관리자가 DB에 지정한 값(A14)이 기준. 지정이 없으면 원천 대상만 유지하고 미확인은 비대상으로 본다
  if (row.problemFlags.length) return {...row,management:{...management,problemHousehold:'TARGET',
    managementReasons:[problemReasonText(row.problemFlags),...(row.problemLockReleased?['관리자 해제승인']:[]),...(row.problemNote?[row.problemNote]:[])]}};
  return {...row,management:management.problemHousehold==='UNKNOWN'?{...management,problemHousehold:'NOT_TARGET'}:management};
}
