import { isLegacyGrade, type LegacyGrade } from "@/lib/move-in/consultation";
import { todayYmd, type WorklogDayRange } from "@/lib/worklog/day-range";

export type GradeHistoryRow = {
  id: string;
  unitId: string;
  customerId: string | null;
  consultedAt: string;
  legacyGrade: string | null;
};

export type CurrentGradeSnapshotRow = {
  unitId: string;
  contractId: string;
  customerId: string;
};

export type GradePromotionKpi = { cToAb: number; dToAbc: number; total: number };

/** Counts one net promotion per current-holder unit for the selected day. */
export function computeGradePromotionKpi(
  currentRows: CurrentGradeSnapshotRow[],
  historyRows: readonly GradeHistoryRow[],
  range: WorklogDayRange,
  now = new Date(),
  initialGrades: readonly GradeHistoryRow[] = [],
): GradePromotionKpi {
  const currentByUnit = new Map<string, CurrentGradeSnapshotRow>();
  const invalidUnits = new Set<string>();
  for (const row of currentRows) {
    if (currentByUnit.has(row.unitId)) invalidUnits.add(row.unitId);
    else currentByUnit.set(row.unitId, row);
  }
  for (const unitId of invalidUnits) currentByUnit.delete(unitId);

  const endMs = todayYmd(range.timeZone, now) === range.dateYmd
    ? Math.min(range.end.getTime(), now.getTime())
    : range.end.getTime();
  const rows = [...historyRows, ...initialGrades]
    .filter((row) => currentByUnit.get(row.unitId)?.customerId === row.customerId)
    .filter((row) => row.legacyGrade != null && isLegacyGrade(row.legacyGrade))
    .filter((row) => Number.isFinite(Date.parse(row.consultedAt)))
    .sort((a, b) => Date.parse(a.consultedAt) - Date.parse(b.consultedAt) || a.id.localeCompare(b.id));

  let cToAb = 0;
  let dToAbc = 0;
  for (const [unitId, current] of currentByUnit) {
    const holderRows = rows.filter((row) => row.unitId === unitId && row.customerId === current.customerId);
    const before = holderRows.filter((row) => Date.parse(row.consultedAt) < range.start.getTime()).at(-1);
    const inDay = holderRows.filter((row) => {
      const time = Date.parse(row.consultedAt);
      return time >= range.start.getTime() && time < endMs;
    });
    if (!before || inDay.length === 0) continue;
    const start = before.legacyGrade as LegacyGrade;
    const final = inDay.at(-1)!.legacyGrade as LegacyGrade;
    if (start === "C" && (final === "A" || final === "B")) cToAb += 1;
    if (start === "D" && (final === "A" || final === "B" || final === "C")) dToAbc += 1;
  }
  return { cToAb, dToAbc, total: cToAb + dToAbc };
}
