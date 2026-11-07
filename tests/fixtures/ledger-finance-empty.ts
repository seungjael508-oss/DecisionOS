/** Synthetic resolution target for Vitest mocks. Never imported by production. */
import type { LedgerFinanceSource } from '@/lib/move-in/ledger-finance.server';

export const LEDGER_FINANCE_MANIFEST = {
  accountSourceSha256: 'synthetic-test-only',
  balconySourceSha256: 'synthetic-test-only',
  optionSourceSha256: 'synthetic-test-only',
};
export const LEDGER_FINANCE_SOURCE: Record<string, LedgerFinanceSource> = {};
