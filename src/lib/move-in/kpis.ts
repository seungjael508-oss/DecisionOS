import type { FundingStatus, MoveInStatus, OccupancyIntent } from "@/lib/move-in/labels";
import { isLegacyGrade, type LegacyGrade } from "@/lib/move-in/consultation";
import { todayYmd, worklogDayRange, isInstantInDay } from "@/lib/worklog/day-range";

export const HWAYANG_DASHBOARD_PROJECT = "1283e198-5043-4027-96d6-edcc7a6686c6";

/** Approved immutable aggregate, not live activity or a historical dated state.
 * Source: 평택푸르지오센터파인_입주관리_인계용.xlsx, 종합!P3:P853.
 * SHA256: 338096f348124a995a3e6ace5d38e8906267a4e3b318bf01c7a38a52f6346f07
 * No customer-level source data is included. Source asOf is unknown.
 */
export function legacyDashboardSnapshot(projectId: string, role: string) {
  if (projectId !== HWAYANG_DASHBOARD_PROJECT || role !== "PROJECT_ADMIN") return null;
  return { total: 851, grades: { A:245, B:156, C:381, D:39, "부재":19, "상담거절":11 } };
}

export type DashboardGrade = { unit_id: string; customer_id: string; legacy_grade: string | null };
export type DashboardEvent = DashboardGrade & {
  id: string; consulted_at: string; contact_type: string | null; channel: string | null; next_action_at: string | null;
};

export function buildDashboardActivity(events: DashboardEvent[], baseline: DashboardGrade[], nowIso: string) {
  const now = new Date(nowIso);
  const day = worklogDayRange(todayYmd("Asia/Seoul", now), "Asia/Seoul");
  const today = events.filter(e => isInstantInDay(e.consulted_at, day) && Date.parse(e.consulted_at) <= now.getTime())
    .sort((a,b) => Date.parse(a.consulted_at)-Date.parse(b.consulted_at) || a.id.localeCompare(b.id));
  const native = today.filter(e=>e.channel !== "LEGACY_IMPORT");
  const result = { total:native.length, units:new Set(native.map(e=>e.unit_id)).size,
    channels:{CALL:0,VISIT:0,MESSAGE:0,UNKNOWN:0}, previousC:0,previousD:0,absentRecontact:0,
    previousUnknown:0,nextRegistered:0,changes:{} as Record<string,number> };
  const previous = new Map<string,LegacyGrade>();
  const key = (e:DashboardGrade) => `${e.unit_id}:${e.customer_id}`;
  for (const e of baseline) if(e.legacy_grade && isLegacyGrade(e.legacy_grade)) previous.set(key(e),e.legacy_grade);
  for (const e of today) {
    if (e.channel === "LEGACY_IMPORT") {
      if(e.legacy_grade && isLegacyGrade(e.legacy_grade)) previous.set(key(e),e.legacy_grade);
      continue;
    }
    const channel = e.contact_type === "CALL" || e.contact_type === "OUTBOUND" || e.contact_type === "INBOUND" ? "CALL"
      : e.contact_type === "VISIT" ? "VISIT" : e.contact_type === "MESSAGE" ? "MESSAGE" : "UNKNOWN";
    result.channels[channel]++;
    const before = previous.get(key(e));
    if(before === "C") result.previousC++;
    if(before === "D") result.previousD++;
    if(before === "부재") result.absentRecontact++;
    if(!before) result.previousUnknown++;
    if(e.next_action_at) result.nextRegistered++;
    if(e.legacy_grade && isLegacyGrade(e.legacy_grade)) {
      if(before && before !== e.legacy_grade) {
        const change = `${before} → ${e.legacy_grade}`;
        result.changes[change] = (result.changes[change] ?? 0) + 1;
      }
      previous.set(key(e),e.legacy_grade);
    }
  }
  return result;
}

export type OccupancyCountsInput = {
  occupancyIntent: OccupancyIntent | null;
  fundingStatus: FundingStatus | null;
  moveInStatus: MoveInStatus | null;
  balancePaidAt?: string | null;
  actualMoveInDate?: string | null;
  plannedMoveInDate?: string | null;
};

export function hasBalancePaid(balancePaidAt: string | null | undefined) {
  return Boolean(balancePaidAt);
}

export function hasMovedIn(actualMoveInDate: string | null | undefined) {
  return Boolean(actualMoveInDate);
}

export function hasPlannedMoveIn(
  plannedMoveInDate: string | null | undefined,
  actualMoveInDate: string | null | undefined,
) {
  return Boolean(plannedMoveInDate) && !hasMovedIn(actualMoveInDate);
}

export type MoveInKpis = {
  totalUnits: number;
  balancePaid: number;
  movedIn: number;
  planned: number;
  fundingIssue: number;
  sellOrRent: number;
  undecided: number;
  notContacted: number;
};

export function computeMoveInKpis(
  totalUnits: number,
  occupancies: OccupancyCountsInput[],
): MoveInKpis {
  return {
    totalUnits,
    balancePaid: occupancies.filter((row) => hasBalancePaid(row.balancePaidAt))
      .length,
    movedIn: occupancies.filter((row) => hasMovedIn(row.actualMoveInDate)).length,
    planned: occupancies.filter((row) =>
      hasPlannedMoveIn(row.plannedMoveInDate, row.actualMoveInDate),
    ).length,
    fundingIssue: occupancies.filter(
      (row) => row.fundingStatus === "FUNDING_SHORTAGE",
    ).length,
    sellOrRent: occupancies.filter(
      (row) =>
        row.occupancyIntent === "SALE" ||
        row.occupancyIntent === "JEONSE" ||
        row.occupancyIntent === "MONTHLY_RENT",
    ).length,
    undecided: occupancies.filter((row) => row.occupancyIntent === "UNDECIDED")
      .length,
    notContacted: occupancies.filter(
      (row) => row.moveInStatus === "NOT_CONTACTED",
    ).length,
  };
}

export function computeProgressPercent(kpis: MoveInKpis) {
  if (kpis.totalUnits === 0) return 0;
  if (kpis.balancePaid > kpis.totalUnits) {
    throw new Error("계산 버그: 잔금완납이 총 대상세대를 초과합니다.");
  }
  return Math.round((kpis.balancePaid / kpis.totalUnits) * 100);
}
