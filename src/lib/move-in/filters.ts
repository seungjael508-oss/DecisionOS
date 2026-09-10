import type { FundingStatus, MoveInStatus, OccupancyIntent } from "@/lib/move-in/labels";

export type UnitListRow = {
  unitId: string;
  buildingNo: string;
  unitNo: string;
  customerName: string | null;
  occupancyIntent: OccupancyIntent | null;
  fundingStatus: FundingStatus | null;
  moveInStatus: MoveInStatus | null;
  balancePaidAt: string | null;
  actualMoveInDate: string | null;
  plannedMoveInDate: string | null;
  lastContactAt: string | null;
  nextContactAt: string | null;
};

export type UnitListFilters = {
  buildingNo: string;
  unitNo: string;
  customerName: string;
  occupancyIntent: OccupancyIntent | "";
  fundingStatus: FundingStatus | "";
  moveInStatus: MoveInStatus | "";
};

export function sortUnits(rows: UnitListRow[]) {
  return [...rows].sort((a, b) => {
    const building = a.buildingNo.localeCompare(b.buildingNo, "ko");
    if (building !== 0) return building;
    return a.unitNo.localeCompare(b.unitNo, "ko");
  });
}

export function filterUnits(rows: UnitListRow[], filters: UnitListFilters) {
  const building = filters.buildingNo.trim();
  const unit = filters.unitNo.trim();
  const name = filters.customerName.trim();

  return rows.filter((row) => {
    if (building && !row.buildingNo.includes(building)) return false;
    if (unit && !row.unitNo.includes(unit)) return false;
    if (name && !(row.customerName ?? "").includes(name)) return false;
    if (filters.occupancyIntent && row.occupancyIntent !== filters.occupancyIntent) {
      return false;
    }
    if (filters.fundingStatus && row.fundingStatus !== filters.fundingStatus) {
      return false;
    }
    if (filters.moveInStatus && row.moveInStatus !== filters.moveInStatus) {
      return false;
    }
    return true;
  });
}

export type TodayReason =
  | "NEXT_CONTACT"
  | "DELAYED"
  | "FUNDING_SHORTAGE"
  | "EXISTING_HOME_UNSOLD";

export function todayReasons(
  row: Pick<
    UnitListRow,
    "nextContactAt" | "moveInStatus" | "fundingStatus"
  >,
  now = new Date(),
): TodayReason[] {
  const reasons: TodayReason[] = [];
  if (row.nextContactAt) {
    const next = new Date(row.nextContactAt);
    if (!Number.isNaN(next.getTime()) && next.getTime() <= now.getTime()) {
      reasons.push("NEXT_CONTACT");
    }
  }
  if (row.moveInStatus === "DELAYED") reasons.push("DELAYED");
  if (row.fundingStatus === "FUNDING_SHORTAGE") {
    reasons.push("FUNDING_SHORTAGE");
  }
  if (row.fundingStatus === "EXISTING_HOME_UNSOLD") {
    reasons.push("EXISTING_HOME_UNSOLD");
  }
  return reasons;
}

export const TODAY_REASON_LABELS: Record<TodayReason, string> = {
  NEXT_CONTACT: "오늘 재콜",
  DELAYED: "입주 지연",
  FUNDING_SHORTAGE: "자금부족",
  EXISTING_HOME_UNSOLD: "기존주택 미처분",
};

export type TodayFilter = "all" | "next_contact" | "delayed" | "funding";

export function filterTodayRows(
  rows: UnitListRow[],
  filter: TodayFilter,
  now = new Date(),
) {
  return rows.filter((row) => {
    const reasons = todayReasons(row, now);
    if (reasons.length === 0) return false;
    if (filter === "next_contact") return reasons.includes("NEXT_CONTACT");
    if (filter === "delayed") return reasons.includes("DELAYED");
    if (filter === "funding") {
      return (
        reasons.includes("FUNDING_SHORTAGE") ||
        reasons.includes("EXISTING_HOME_UNSOLD")
      );
    }
    return true;
  });
}
