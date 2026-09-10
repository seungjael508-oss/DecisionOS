import {
  hasBalancePaid,
  hasMovedIn,
  hasPlannedMoveIn,
} from "@/lib/move-in/kpis";
import type { FundingStatus, MoveInStatus, OccupancyIntent } from "@/lib/move-in/labels";
import { isInstantInDay, type WorklogDayRange } from "@/lib/worklog/day-range";

export const WORKLOG_CONTACT_TYPES = [
  "CALL",
  "CONSULTATION",
  "MESSAGE",
  "VISIT",
] as const;

export type WorklogContactType = (typeof WORKLOG_CONTACT_TYPES)[number];

export type WorklogUnitRow = {
  unitId: string;
  buildingNo: string;
  unitType: string | null;
};

export type WorklogOccupancyRow = {
  unitId: string;
  occupancyIntent: OccupancyIntent;
  fundingStatus: FundingStatus;
  moveInStatus: MoveInStatus;
  balancePaidAt: string | null;
  actualMoveInDate: string | null;
  plannedMoveInDate: string | null;
  nextContactAt: string | null;
};

export type WorklogConsultationRow = {
  id: string;
  consultedAt: string;
  contactType: string | null;
};

export type MoveInWorklogSnapshot = {
  date: string;
  timeZone: string;
  summary: {
    totalUnits: number;
    balancePaid: number;
    balancePaidToday: number;
    movedIn: number;
    movedInToday: number;
    planned: number;
    notMovedIn: number;
  };
  intent: {
    selfMoveIn: number;
    sale: number;
    jeonse: number;
    monthlyRent: number;
    undecided: number;
  };
  funding: {
    fundingShortage: number;
    existingHomeUnsold: number;
  };
  contact: {
    notContacted: number;
  };
  consultations: {
    totalToday: number;
    nextContactDue: number;
    byType: Record<WorklogContactType, number>;
  };
  byBuilding: Array<{
    buildingNo: string;
    totalUnits: number;
    balancePaid: number;
    movedIn: number;
    planned: number;
  }>;
  byUnitType: Array<{
    unitType: string;
    totalUnits: number;
    balancePaid: number;
    movedIn: number;
  }>;
};

export function buildMoveInWorklogSnapshot(
  units: WorklogUnitRow[],
  occupancies: WorklogOccupancyRow[],
  consultations: WorklogConsultationRow[],
  range: WorklogDayRange,
): MoveInWorklogSnapshot {
  const occupancyByUnit = new Map<string, WorklogOccupancyRow>();
  for (const row of occupancies) {
    if (!occupancyByUnit.has(row.unitId)) {
      occupancyByUnit.set(row.unitId, row);
    }
  }

  let balancePaid = 0;
  let balancePaidToday = 0;
  let movedIn = 0;
  let movedInToday = 0;
  let planned = 0;
  let notContacted = 0;
  let selfMoveIn = 0;
  let sale = 0;
  let jeonse = 0;
  let monthlyRent = 0;
  let undecided = 0;
  let fundingShortage = 0;
  let existingHomeUnsold = 0;
  let nextContactDue = 0;

  const buildingMap = new Map<
    string,
    { totalUnits: number; balancePaid: number; movedIn: number; planned: number }
  >();
  const typeMap = new Map<
    string,
    { totalUnits: number; balancePaid: number; movedIn: number }
  >();

  for (const unit of units) {
    const occupancy = occupancyByUnit.get(unit.unitId);
    const paid = hasBalancePaid(occupancy?.balancePaidAt);
    const moved = hasMovedIn(occupancy?.actualMoveInDate);
    const isPlanned = hasPlannedMoveIn(
      occupancy?.plannedMoveInDate,
      occupancy?.actualMoveInDate,
    );

    if (paid) balancePaid += 1;
    if (moved) movedIn += 1;
    if (isPlanned) planned += 1;
    if (occupancy?.balancePaidAt && isInstantInDay(occupancy.balancePaidAt, range)) {
      balancePaidToday += 1;
    }
    if (
      occupancy?.actualMoveInDate &&
      isInstantInDay(occupancy.actualMoveInDate, range)
    ) {
      movedInToday += 1;
    }
    if (occupancy?.moveInStatus === "NOT_CONTACTED") notContacted += 1;
    if (occupancy?.occupancyIntent === "SELF_MOVE_IN") selfMoveIn += 1;
    if (occupancy?.occupancyIntent === "SALE") sale += 1;
    if (occupancy?.occupancyIntent === "JEONSE") jeonse += 1;
    if (occupancy?.occupancyIntent === "MONTHLY_RENT") monthlyRent += 1;
    if (occupancy?.occupancyIntent === "UNDECIDED") undecided += 1;
    if (occupancy?.fundingStatus === "FUNDING_SHORTAGE") fundingShortage += 1;
    if (occupancy?.fundingStatus === "EXISTING_HOME_UNSOLD") {
      existingHomeUnsold += 1;
    }
    if (occupancy?.nextContactAt && isInstantInDay(occupancy.nextContactAt, range)) {
      nextContactDue += 1;
    }

    const building = buildingMap.get(unit.buildingNo) ?? {
      totalUnits: 0,
      balancePaid: 0,
      movedIn: 0,
      planned: 0,
    };
    building.totalUnits += 1;
    if (paid) building.balancePaid += 1;
    if (moved) building.movedIn += 1;
    if (isPlanned) building.planned += 1;
    buildingMap.set(unit.buildingNo, building);

    const typeKey = unit.unitType ?? "미지정";
    const typeRow = typeMap.get(typeKey) ?? {
      totalUnits: 0,
      balancePaid: 0,
      movedIn: 0,
    };
    typeRow.totalUnits += 1;
    if (paid) typeRow.balancePaid += 1;
    if (moved) typeRow.movedIn += 1;
    typeMap.set(typeKey, typeRow);
  }

  const notMovedIn = units.length - movedIn;
  if (notMovedIn < 0) {
    throw new Error("계산 버그: 미입주가 음수입니다.");
  }

  const byType: Record<WorklogContactType, number> = {
    CALL: 0,
    CONSULTATION: 0,
    MESSAGE: 0,
    VISIT: 0,
  };
  const consultationsToday = consultations.filter((row) =>
    isInstantInDay(row.consultedAt, range),
  );
  for (const row of consultationsToday) {
    if (!isWorklogContactType(row.contactType)) continue;
    byType[row.contactType] += 1;
  }

  return {
    date: range.dateYmd,
    timeZone: range.timeZone,
    summary: {
      totalUnits: units.length,
      balancePaid,
      balancePaidToday,
      movedIn,
      movedInToday,
      planned,
      notMovedIn,
    },
    intent: {
      selfMoveIn,
      sale,
      jeonse,
      monthlyRent,
      undecided,
    },
    funding: {
      fundingShortage,
      existingHomeUnsold,
    },
    contact: { notContacted },
    consultations: {
      totalToday: consultationsToday.length,
      nextContactDue,
      byType,
    },
    byBuilding: [...buildingMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b, "ko"))
      .map(([buildingNo, counts]) => ({ buildingNo, ...counts })),
    byUnitType: [...typeMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b, "ko"))
      .map(([unitType, counts]) => ({ unitType, ...counts })),
  };
}

export function worklogGeneratedData(snapshot: MoveInWorklogSnapshot) {
  return {
    date: snapshot.date,
    timeZone: snapshot.timeZone,
    summary: snapshot.summary,
    intent: snapshot.intent,
    funding: snapshot.funding,
    contact: snapshot.contact,
    consultations: snapshot.consultations,
    byBuilding: snapshot.byBuilding,
    byUnitType: snapshot.byUnitType,
  };
}

function isWorklogContactType(value: string | null): value is WorklogContactType {
  return (
    value === "CALL" ||
    value === "CONSULTATION" ||
    value === "MESSAGE" ||
    value === "VISIT"
  );
}
