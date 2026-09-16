import {
  hasBalancePaid,
  hasMovedIn,
  hasPlannedMoveIn,
} from "@/lib/move-in/kpis";
import type { FundingStatus, MoveInStatus, OccupancyIntent } from "@/lib/move-in/labels";
import { isInstantInDay, type WorklogDayRange } from "@/lib/worklog/day-range";
import { VALID_HOLDER_CONTRACT_STATUSES } from "@/lib/move-in/labels";
import { isLegacyGrade, LEGACY_GRADE_VALUES, type LegacyGrade } from "@/lib/move-in/consultation";
import { selectLatestMarketRow, type MarketRow } from "@/lib/market/select-latest";
import { monthDelta } from "@/lib/market/metrics";

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
  unitId?: string | null;
  legacyGrade?: string | null;
  purpose?: string | null;
  nextActionAt?: string | null;
};

export const WORKLOG_PURPOSES = ["성향파악", "입주안내", "잔금독촉", "매칭안내", "기타"] as const;
export type WorklogPurpose = (typeof WORKLOG_PURPOSES)[number];
export type WorklogContractRow = { unitId: string; status: "ACTIVE" | "COMPLETED" | "CANCELLED"; contractedAt: string };
export type WorklogV2Sources = { contracts?: WorklogContractRow[]; marketRows?: MarketRow[]; marketError?: boolean };
export type WorklogSalesCount = {
  supply: number; sold: number | null; unsold: number | null;
  grades: Record<LegacyGrade, number>; unclassified: number;
  consulted: number; notConsulted: number; progressPercent: number;
};
export type WorklogActivityCount = { call: number; visit: number; other: number; total: number };
export type WorklogListingCount = { sale: number | null; jeonse: number | null; monthlyRent: number | null; total: number | null };
export type WorklogDailySections = {
  version: 2;
  overview: { sourceBasis: "CURRENT_UNITS_AND_VALID_CONTRACTS"; throughExclusive: string };
  salesConsultation: {
    soldSource: "CURRENT_VALID_CONTRACTS" | "UNAVAILABLE";
    rows: Array<WorklogSalesCount & { unitType: string }>;
    total: WorklogSalesCount;
    gradeRatios: Record<LegacyGrade, number>;
    absenceExcludedDenominator: number;
    absenceExcludedRatios: Record<LegacyGrade, number | null>;
  };
  managementTargets: { status: "BLOCKED"; reason: "DELINQUENCY_SOURCE_MAPPING_REQUIRED" };
  consultationActivity: {
    today: WorklogActivityCount; cumulative: WorklogActivityCount;
    rows: Array<{ purpose: WorklogPurpose; today: WorklogActivityCount; cumulative: WorklogActivityCount }>;
  };
  marketSummary: {
    status: "READY" | "EMPTY" | "ERROR";
    rows: Array<{ groupKey: string; scope: MarketRow["dataScope"]; complexName: string | null;
      collectedAt: string | null; previousCollectedAt: string | null; carriedForward: boolean;
      current: WorklogListingCount; delta: WorklogListingCount }>;
  };
  otherActivities: {
    automatic: { absenceRecontacts: number; refusalRecontacts: number; staleCDRecontacts: number; visits: number; messages: number; nextContactSettings: number };
    manualMemo: { status: "BLOCKED"; reason: "MANUAL_MEMO_STORAGE_REQUIRED" };
  };
};

export type MoveInWorklogSnapshot = Partial<WorklogDailySections> & {
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
  sources: WorklogV2Sources = {},
): MoveInWorklogSnapshot {
  // Source joins must not inflate unit counts. Keep the existing public builder.
  units = [...new Map(units.map(row => [row.unitId, row])).values()];
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
    ...dailySections(units, consultations, range, sources),
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
  // A detached, aggregate-only copy; report rendering never reloads live sources.
  return JSON.parse(JSON.stringify({
    date: snapshot.date,
    timeZone: snapshot.timeZone,
    summary: snapshot.summary,
    intent: snapshot.intent,
    funding: snapshot.funding,
    contact: snapshot.contact,
    consultations: snapshot.consultations,
    byBuilding: snapshot.byBuilding,
    byUnitType: snapshot.byUnitType,
    ...(snapshot.version === 2 ? {
      version: 2, overview: snapshot.overview,
      salesConsultation: snapshot.salesConsultation,
      managementTargets: snapshot.managementTargets,
      consultationActivity: snapshot.consultationActivity,
      marketSummary: snapshot.marketSummary,
      otherActivities: snapshot.otherActivities,
    } : {}),
  })) as MoveInWorklogSnapshot;
}

function percentage(value: number, denominator: number) {
  return denominator > 0 ? value / denominator * 100 : 0;
}

function dailySections(units: WorklogUnitRow[], consultations: WorklogConsultationRow[], range: WorklogDayRange, sources: WorklogV2Sources): WorklogDailySections {
  const beforeEnd = (value: string) => Number.isFinite(Date.parse(value)) && Date.parse(value) < range.end.getTime();
  const unitIds = new Set(units.map(u => u.unitId));
  const history = consultations.filter(c => beforeEnd(c.consultedAt)).sort((a, b) => Date.parse(a.consultedAt) - Date.parse(b.consultedAt) || a.id.localeCompare(b.id));
  const grades = new Map<string, LegacyGrade>();
  for (const c of history) if (c.unitId && unitIds.has(c.unitId) && c.legacyGrade && isLegacyGrade(c.legacyGrade)) grades.set(c.unitId, c.legacyGrade);
  const sold = sources.contracts ? new Set(sources.contracts.filter(c => (VALID_HOLDER_CONTRACT_STATUSES as readonly string[]).includes(c.status) && beforeEnd(c.contractedAt)).map(c => c.unitId)) : null;
  const count = (group: WorklogUnitRow[]): WorklogSalesCount => {
    const distribution = { A: 0, B: 0, C: 0, D: 0, 부재: 0, 상담거절: 0 };
    for (const u of group) { const grade = grades.get(u.unitId); if (grade) distribution[grade]++; }
    const consulted = Object.values(distribution).reduce((a, b) => a + b, 0);
    const soldCount = sold ? group.filter(u => sold.has(u.unitId)).length : null;
    return { supply: group.length, sold: soldCount, unsold: soldCount === null ? null : group.length - soldCount, grades: distribution,
      unclassified: group.length - consulted, consulted, notConsulted: group.length - consulted, progressPercent: percentage(consulted, group.length) };
  };
  const byType = new Map<string, WorklogUnitRow[]>();
  for (const u of units) { const type = u.unitType?.trim() || "미지정"; const group = byType.get(type) ?? []; group.push(u); byType.set(type, group); }
  const total = count(units);
  const withoutAbsence = total.consulted - total.grades.부재;
  const gradeRatios = Object.fromEntries(LEGACY_GRADE_VALUES.map(g => [g, percentage(total.grades[g], total.consulted)])) as Record<LegacyGrade, number>;
  const absenceExcludedRatios = Object.fromEntries(LEGACY_GRADE_VALUES.map(g => [g, g === "부재" ? null : percentage(total.grades[g], withoutAbsence)])) as Record<LegacyGrade, number | null>;
  const emptyActivity = (): WorklogActivityCount => ({ call: 0, visit: 0, other: 0, total: 0 });
  const activityRows = WORKLOG_PURPOSES.map(purpose => ({ purpose, today: emptyActivity(), cumulative: emptyActivity() }));
  const today = emptyActivity(), cumulative = emptyActivity();
  const addActivity = (target: WorklogActivityCount, c: WorklogConsultationRow) => {
    target.total++;
    if (c.contactType === "CALL") target.call++;
    else if (c.contactType === "VISIT") target.visit++;
    else target.other++;
  };
  const automatic = { absenceRecontacts: 0, refusalRecontacts: 0, staleCDRecontacts: 0, visits: 0, messages: 0, nextContactSettings: 0 };
  const priorByUnit = new Map<string, { lastContactAt: number; grade: LegacyGrade | null }>();
  for (const c of history) {
    const p = c.purpose?.replace(/\s+/g, "") ?? "";
    const purpose = (WORKLOG_PURPOSES as readonly string[]).includes(p) ? p : "기타";
    const purposeRow = activityRows.find(r => r.purpose === purpose)!;
    addActivity(cumulative, c); addActivity(purposeRow.cumulative, c);
    const inDay = isInstantInDay(c.consultedAt, range);
    if (inDay) {
      addActivity(today, c); addActivity(purposeRow.today, c);
      if (c.contactType === "VISIT") automatic.visits++;
      if (c.contactType === "MESSAGE") automatic.messages++;
      if (c.nextActionAt && Number.isFinite(Date.parse(c.nextActionAt))) automatic.nextContactSettings++;
    }
    if (!c.unitId || !unitIds.has(c.unitId)) continue;
    const previous = priorByUnit.get(c.unitId);
    const time = Date.parse(c.consultedAt);
    if (inDay && previous && previous.lastContactAt < time) {
      if (previous.grade === "부재") automatic.absenceRecontacts++;
      if (previous.grade === "상담거절") automatic.refusalRecontacts++;
      if ((previous.grade === "C" || previous.grade === "D") && time - previous.lastContactAt >= 30 * 86400000) automatic.staleCDRecontacts++;
    }
    priorByUnit.set(c.unitId, { lastContactAt: time, grade: c.legacyGrade && isLegacyGrade(c.legacyGrade) ? c.legacyGrade : previous?.grade ?? null });
  }

  const marketGroups = new Map<string, MarketRow[]>();
  for (const row of sources.marketRows ?? []) {
    if (!beforeEnd(row.collectedAt) || row.period > range.dateYmd) continue;
    const k = JSON.stringify([row.projectId, row.dataScope, row.complexName]);
    const normalized = { ...row, collectedAt: new Date(row.collectedAt).toISOString() };
    const group = marketGroups.get(k) ?? [];
    group.push(normalized);
    marketGroups.set(k, group);
  }
  const listings = (row: MarketRow | null): WorklogListingCount => {
    const sale = row?.saleListingCount ?? null, jeonse = row?.jeonseListingCount ?? null, monthlyRent = row?.monthlyRentListingCount ?? null;
    return { sale, jeonse, monthlyRent, total: sale === null || jeonse === null || monthlyRent === null ? null : sale + jeonse + monthlyRent };
  };
  const marketRows = [...marketGroups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, group], i) => {
    const totals = group.filter(r => r.unitType === null);
    const currentRow = selectLatestMarketRow(totals);
    const previousRow = selectLatestMarketRow(totals.filter(r => Date.parse(r.collectedAt) < range.start.getTime()));
    const current = listings(currentRow), previous = listings(previousRow);
    const carriedForward = Boolean(currentRow && !isInstantInDay(currentRow.collectedAt, range));
    const delta = (field: keyof WorklogListingCount) => carriedForward ? null : monthDelta(current[field], previous[field]);
    // Group ID is an ordinal, not a project/customer identifier in generated_data.
    return { groupKey: `market-${i}`, scope: group[0].dataScope, complexName: group[0].complexName,
      collectedAt: currentRow?.collectedAt ?? null, previousCollectedAt: previousRow?.collectedAt ?? null, carriedForward,
      current, delta: { sale: delta("sale"), jeonse: delta("jeonse"), monthlyRent: delta("monthlyRent"), total: delta("total") } };
  });

  return {
    version: 2,
    overview: { sourceBasis: "CURRENT_UNITS_AND_VALID_CONTRACTS", throughExclusive: range.endIso },
    salesConsultation: { soldSource: sold ? "CURRENT_VALID_CONTRACTS" : "UNAVAILABLE", rows: [...byType].sort(([a], [b]) => a.localeCompare(b, "ko")).map(([unitType, group]) => ({ unitType, ...count(group) })), total, gradeRatios, absenceExcludedDenominator: withoutAbsence, absenceExcludedRatios },
    managementTargets: { status: "BLOCKED", reason: "DELINQUENCY_SOURCE_MAPPING_REQUIRED" },
    consultationActivity: { today, cumulative, rows: activityRows },
    marketSummary: { status: sources.marketError ? "ERROR" : marketRows.length ? "READY" : "EMPTY", rows: marketRows },
    otherActivities: { automatic, manualMemo: { status: "BLOCKED", reason: "MANUAL_MEMO_STORAGE_REQUIRED" } },
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
