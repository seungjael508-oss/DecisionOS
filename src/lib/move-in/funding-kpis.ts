import type { WorklogDayRange } from "@/lib/worklog/day-range";

export type CurrentFundingSnapshotRow = {
  unitId: string;
  contractId: string;
  customerId: string;
  fundingStatus: string | null;
};

export type FundingHistoryRow = {
  unitId: string;
  contractId: string;
  customerId?: string | null;
  changedAt: string;
  previousValue?: string | null;
  newValue: string | null;
  fieldChanged?: string | null;
};

export type FundingKpiSnapshot = {
  current: {
    loanNeeded: number;
    loanConsulting: number;
    loanApproved: number;
    loanLimitShortage: number;
    fundingUnknown: number;
  };
  selectedDay: { newLoanNeeded: number };
};

/**
 * Computes the current funding snapshot and the selected-day LOAN_NEEDED event
 * count from already-authorized projections. It deliberately returns only
 * aggregate counts so generated worklogs never carry holder PII or raw text.
 */
export function computeFundingKpiSnapshot(
  currentRows: CurrentFundingSnapshotRow[],
  historyRows: FundingHistoryRow[],
  range: WorklogDayRange,
  throughExclusive = range.endIso,
): FundingKpiSnapshot {
  const byUnit = new Map<string, CurrentFundingSnapshotRow>();
  const invalidUnits = new Set<string>();
  for (const row of currentRows) {
    if (byUnit.has(row.unitId)) invalidUnits.add(row.unitId);
    else byUnit.set(row.unitId, row);
  }
  for (const unitId of invalidUnits) byUnit.delete(unitId);

  const current = {
    loanNeeded: 0,
    loanConsulting: 0,
    loanApproved: 0,
    loanLimitShortage: 0,
    fundingUnknown: 0,
  };
  for (const row of byUnit.values()) {
    if (row.fundingStatus === "LOAN_NEEDED") current.loanNeeded += 1;
    else if (row.fundingStatus === "LOAN_CONSULTING") current.loanConsulting += 1;
    else if (row.fundingStatus === "LOAN_APPROVED") current.loanApproved += 1;
    else if (row.fundingStatus === "LOAN_LIMIT_SHORTAGE") current.loanLimitShortage += 1;
    else if (row.fundingStatus === "UNKNOWN") current.fundingUnknown += 1;
  }

  const seenUnits = new Set<string>();
  for (const row of historyRows) {
    const currentRow = byUnit.get(row.unitId);
    const changedAt = Date.parse(row.changedAt);
    if (!currentRow || !Number.isFinite(changedAt)) continue;
    if (row.contractId !== currentRow.contractId || row.customerId != null && row.customerId !== currentRow.customerId) continue;
    if (row.fieldChanged != null && row.fieldChanged !== "funding_status") continue;
    if (row.newValue !== "LOAN_NEEDED" || row.previousValue === "LOAN_NEEDED") continue;
    if (changedAt < range.start.getTime() || changedAt >= Date.parse(throughExclusive)) continue;
    seenUnits.add(row.unitId);
  }
  return { current, selectedDay: { newLoanNeeded: seenUnits.size } };
}
