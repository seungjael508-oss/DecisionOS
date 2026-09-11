import { filterCallRows, type CallListRow } from "@/lib/move-in/calls";
import type { LegacyGrade } from "@/lib/move-in/consultation";

export type AssignListFilters = {
  q: string;
  counselorId: string;
  legacyGrade: LegacyGrade | "";
  unassignedOnly: boolean;
};

export function uniqueCustomerIds(ids: string[]) {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const id of ids) {
    const trimmed = id.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    unique.push(trimmed);
  }
  return unique;
}

export function canSubmitAssignment(customerIds: string[], assigneeId: string) {
  return uniqueCustomerIds(customerIds).length > 0 && assigneeId.trim().length > 0;
}

export function filterAssignRows(rows: CallListRow[], filters: AssignListFilters) {
  return filterCallRows(rows, {
    q: filters.q,
    counselorId: filters.unassignedOnly ? "" : filters.counselorId,
    legacyGrade: filters.legacyGrade,
    occupancyIntent: "",
    fundingStatus: "",
    moveInStatus: "",
    nextContactDue: false,
  }).filter((row) => {
    if (filters.unassignedOnly && row.assignedCounselorId) return false;
    return true;
  });
}

export function counselorOptionLabel(memberId: string) {
  return `상담사 ${memberId.slice(-4)}`;
}
