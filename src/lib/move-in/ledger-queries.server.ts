import 'server-only';
import { readAuthorizedCurrentProjection } from '@/lib/move-in/current-unit-snapshot.server';
import type { LedgerSummaryRow, ProjectionResult } from '@/lib/move-in/ledger-types';

/** All current state comes from the shared core; contact metadata cannot override it. */
export async function loadOperationalLedgerRows(projectId: string, now = new Date()): Promise<ProjectionResult<LedgerSummaryRow>> {
  return readAuthorizedCurrentProjection(projectId, now, true) as Promise<ProjectionResult<LedgerSummaryRow>>;
}
