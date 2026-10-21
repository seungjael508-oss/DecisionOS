import 'server-only';
import { readAuthorizedCurrentProjection } from '@/lib/move-in/current-unit-snapshot.server';
import type { LedgerSummaryRow, ProjectionResult } from '@/lib/move-in/ledger-types';

/** All current state comes from the shared core; contact metadata cannot override it. */
export async function loadOperationalLedgerRows(projectId: string, now = new Date()): Promise<ProjectionResult<LedgerSummaryRow>> {
  return readAuthorizedCurrentProjection(projectId, now, true) as Promise<ProjectionResult<LedgerSummaryRow>>;
}

/** 지정 세대만(오늘 관리대상 등). 원장과 같은 행·같은 판정·같은 세션 RLS */
export async function loadLedgerRowsForUnits(projectId: string, unitIds: readonly string[], now = new Date()): Promise<ProjectionResult<LedgerSummaryRow>> {
  return readAuthorizedCurrentProjection(projectId, now, true, unitIds) as Promise<ProjectionResult<LedgerSummaryRow>>;
}
