import type { FundingStatus, MoveInStatus, OccupancyIntent } from "@/lib/move-in/labels";

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
