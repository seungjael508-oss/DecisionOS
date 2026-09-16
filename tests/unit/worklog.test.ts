import { describe, expect, it } from "vitest";
import { computeMoveInKpis } from "@/lib/move-in/kpis";
import {
  formatWorklogDateLabel,
  isInstantInDay,
  resolveWorklogTimeZone,
  todayYmd,
  worklogDayRange,
  WORKLOG_DEFAULT_TIME_ZONE,
} from "@/lib/worklog/day-range";
import { worklogSourceFilter } from "@/lib/worklog/queries";
import {
  buildMoveInWorklogSnapshot,
  worklogGeneratedData,
  type WorklogConsultationRow,
  type WorklogOccupancyRow,
  type WorklogUnitRow,
} from "@/lib/worklog/snapshot";

const RANGE = worklogDayRange("2026-09-10", "Asia/Seoul");

function unit(
  partial: Partial<WorklogUnitRow> & Pick<WorklogUnitRow, "unitId">,
): WorklogUnitRow {
  return {
    buildingNo: "101",
    unitType: "84A",
    ...partial,
  };
}

function occupancy(
  partial: Partial<WorklogOccupancyRow> & Pick<WorklogOccupancyRow, "unitId">,
): WorklogOccupancyRow {
  return {
    occupancyIntent: "UNDECIDED",
    fundingStatus: "NORMAL",
    moveInStatus: "CONTACTED",
    balancePaidAt: null,
    actualMoveInDate: null,
    plannedMoveInDate: null,
    nextContactAt: null,
    ...partial,
  };
}

describe("worklog day range (KST)", () => {
  it("uses Asia/Seoul when project timezone is empty", () => {
    expect(resolveWorklogTimeZone(null)).toBe(WORKLOG_DEFAULT_TIME_ZONE);
    expect(resolveWorklogTimeZone("")).toBe("Asia/Seoul");
    expect(resolveWorklogTimeZone("Asia/Seoul")).toBe("Asia/Seoul");
  });

  it("bounds 2026-09-10 KST as [00:00, next 00:00)", () => {
    expect(RANGE.startIso).toBe("2026-09-09T15:00:00.000Z");
    expect(RANGE.endIso).toBe("2026-09-10T15:00:00.000Z");
  });

  it("includes local midnight and 23:59, excludes next midnight UTC", () => {
    expect(isInstantInDay("2026-09-09T15:00:00.000Z", RANGE)).toBe(true);
    expect(isInstantInDay("2026-09-10T14:59:59.999Z", RANGE)).toBe(true);
    expect(isInstantInDay("2026-09-10T15:00:00.000Z", RANGE)).toBe(false);
    expect(isInstantInDay("2026-09-09T14:59:59.999Z", RANGE)).toBe(false);
  });

  it("treats date-only values as the selected calendar day", () => {
    expect(isInstantInDay("2026-09-10", RANGE)).toBe(true);
    expect(isInstantInDay("2026-09-09", RANGE)).toBe(false);
  });

  it("formats the header date", () => {
    expect(formatWorklogDateLabel("2026-09-10")).toBe("2026.09.10");
  });

  it("computes today in the project timezone", () => {
    const now = new Date("2026-09-09T15:30:00.000Z");
    expect(todayYmd("Asia/Seoul", now)).toBe("2026-09-10");
    expect(todayYmd("UTC", now)).toBe("2026-09-09");
  });
});

describe("buildMoveInWorklogSnapshot", () => {
  const units: WorklogUnitRow[] = [
    unit({ unitId: "u1", buildingNo: "101", unitType: "84A" }),
    unit({ unitId: "u2", buildingNo: "101", unitType: "84A" }),
    unit({ unitId: "u3", buildingNo: "102", unitType: null }),
    unit({ unitId: "u4", buildingNo: "102", unitType: "59B" }),
    unit({ unitId: "u5", buildingNo: "102", unitType: "59B" }),
  ];

  const occupancies: WorklogOccupancyRow[] = [
    occupancy({
      unitId: "u1",
      occupancyIntent: "SELF_MOVE_IN",
      fundingStatus: "NORMAL",
      moveInStatus: "MOVED_IN",
      balancePaidAt: "2026-09-01T00:00:00.000Z",
      actualMoveInDate: "2026-09-09T15:00:00.000Z",
    }),
    occupancy({
      unitId: "u2",
      occupancyIntent: "SALE",
      fundingStatus: "FUNDING_SHORTAGE",
      moveInStatus: "BALANCE_PAID",
      balancePaidAt: "2026-09-10T14:59:59.999Z",
      plannedMoveInDate: "2026-10-01",
    }),
    occupancy({
      unitId: "u3",
      occupancyIntent: "JEONSE",
      fundingStatus: "EXISTING_HOME_UNSOLD",
      moveInStatus: "PLANNED",
      plannedMoveInDate: "2026-09-20",
    }),
    occupancy({
      unitId: "u4",
      occupancyIntent: "MONTHLY_RENT",
      fundingStatus: "LOAN_NEEDED",
      moveInStatus: "NOT_CONTACTED",
    }),
    occupancy({
      unitId: "u5",
      occupancyIntent: "UNDECIDED",
      fundingStatus: "NORMAL",
      moveInStatus: "CONTACTED",
      nextContactAt: "2026-09-10T05:00:00.000Z",
    }),
  ];

  const consultations: WorklogConsultationRow[] = [
    { id: "c1", consultedAt: "2026-09-09T15:00:00.000Z", contactType: "CALL" },
    { id: "c2", consultedAt: "2026-09-10T14:59:59.999Z", contactType: "VISIT" },
    { id: "c3", consultedAt: "2026-09-10T10:00:00.000Z", contactType: null },
    { id: "c4", consultedAt: "2026-09-10T15:00:00.000Z", contactType: "MESSAGE" },
    { id: "c5", consultedAt: "2026-09-09T15:01:00.000Z", contactType: "CONSULTATION" },
  ];

  const snapshot = buildMoveInWorklogSnapshot(
    units,
    occupancies,
    consultations,
    RANGE,
  );

  it("counts total units from project_unit", () => {
    expect(snapshot.summary.totalUnits).toBe(5);
  });

  it("counts balance paid from balance_paid_at, including MOVED_IN", () => {
    expect(snapshot.summary.balancePaid).toBe(2);
  });

  it("does not treat BALANCE_PAID status without timestamp as paid", () => {
    const result = buildMoveInWorklogSnapshot(
      [unit({ unitId: "x" })],
      [
        occupancy({
          unitId: "x",
          moveInStatus: "BALANCE_PAID",
          balancePaidAt: null,
        }),
      ],
      [],
      RANGE,
    );
    expect(result.summary.balancePaid).toBe(0);
  });

  it("counts today's balance paid inside the KST window", () => {
    expect(snapshot.summary.balancePaidToday).toBe(1);
  });

  it("counts moved in from actual_move_in_date", () => {
    expect(snapshot.summary.movedIn).toBe(1);
    expect(snapshot.summary.movedInToday).toBe(1);
  });

  it("counts planned as planned date with no actual move-in", () => {
    expect(snapshot.summary.planned).toBe(2);
  });

  it("computes not moved in as total minus actual move-in", () => {
    expect(snapshot.summary.notMovedIn).toBe(4);
    expect(snapshot.summary.notMovedIn).toBe(
      snapshot.summary.totalUnits - snapshot.summary.movedIn,
    );
  });

  it("counts five occupancy intents", () => {
    expect(snapshot.intent).toEqual({
      selfMoveIn: 1,
      sale: 1,
      jeonse: 1,
      monthlyRent: 1,
      undecided: 1,
    });
  });

  it("counts funding shortage and existing home unsold separately", () => {
    expect(snapshot.funding.fundingShortage).toBe(1);
    expect(snapshot.funding.existingHomeUnsold).toBe(1);
  });

  it("maps NOT_CONTACTED to 미접촉", () => {
    expect(snapshot.contact.notContacted).toBe(1);
  });

  it("counts daily consultations without inflating unit KPIs", () => {
    expect(snapshot.consultations.totalToday).toBe(4);
    expect(snapshot.consultations.byType).toEqual({
      CALL: 1,
      CONSULTATION: 1,
      MESSAGE: 0,
      VISIT: 1,
    });
    expect(snapshot.summary.totalUnits).toBe(5);
    expect(snapshot.consultations.nextContactDue).toBe(1);
  });

  it("does not double-count occupancy when duplicate rows exist", () => {
    const result = buildMoveInWorklogSnapshot(
      [unit({ unitId: "dup" })],
      [
        occupancy({
          unitId: "dup",
          occupancyIntent: "SELF_MOVE_IN",
          moveInStatus: "MOVED_IN",
          balancePaidAt: "2026-09-01T00:00:00.000Z",
          actualMoveInDate: "2026-09-09T15:00:00.000Z",
        }),
        occupancy({
          unitId: "dup",
          occupancyIntent: "SALE",
          moveInStatus: "MOVED_IN",
          balancePaidAt: "2026-09-01T00:00:00.000Z",
          actualMoveInDate: "2026-09-09T15:00:00.000Z",
        }),
      ],
      [
        { id: "a", consultedAt: "2026-09-10T00:00:00+09:00", contactType: "CALL" },
        { id: "b", consultedAt: "2026-09-10T12:00:00+09:00", contactType: "CALL" },
      ],
      RANGE,
    );
    expect(result.summary.totalUnits).toBe(1);
    expect(result.summary.movedIn).toBe(1);
    expect(result.summary.balancePaid).toBe(1);
    expect(result.intent.selfMoveIn).toBe(1);
    expect(result.intent.sale).toBe(0);
    expect(result.consultations.totalToday).toBe(2);
  });

  it("groups building and unit type tables", () => {
    expect(snapshot.byBuilding).toEqual([
      {
        buildingNo: "101",
        totalUnits: 2,
        balancePaid: 2,
        movedIn: 1,
        planned: 1,
      },
      {
        buildingNo: "102",
        totalUnits: 3,
        balancePaid: 0,
        movedIn: 0,
        planned: 1,
      },
    ]);
    expect(snapshot.byUnitType.find((row) => row.unitType === "미지정")).toEqual({
      unitType: "미지정",
      totalUnits: 1,
      balancePaid: 0,
      movedIn: 0,
    });
  });

  it("uses the same snapshot for generated_data", () => {
    expect(worklogGeneratedData(snapshot)).toEqual({
      date: snapshot.date,
      timeZone: snapshot.timeZone,
      summary: snapshot.summary,
      intent: snapshot.intent,
      funding: snapshot.funding,
      contact: snapshot.contact,
      consultations: snapshot.consultations,
      byBuilding: snapshot.byBuilding,
      byUnitType: snapshot.byUnitType,
      version: snapshot.version,
      overview: snapshot.overview,
      salesConsultation: snapshot.salesConsultation,
      managementTargets: snapshot.managementTargets,
      consultationActivity: snapshot.consultationActivity,
      marketSummary: snapshot.marketSummary,
      otherActivities: snapshot.otherActivities,
    });
  });

  it("matches dashboard KPI for 잔금완납 / 입주완료 / 입주예정", () => {
    const kpis = computeMoveInKpis(
      units.length,
      occupancies.map((row) => ({
        occupancyIntent: row.occupancyIntent,
        fundingStatus: row.fundingStatus,
        moveInStatus: row.moveInStatus,
        balancePaidAt: row.balancePaidAt,
        actualMoveInDate: row.actualMoveInDate,
        plannedMoveInDate: row.plannedMoveInDate,
      })),
    );
    expect(kpis.balancePaid).toBe(snapshot.summary.balancePaid);
    expect(kpis.movedIn).toBe(snapshot.summary.movedIn);
    expect(kpis.planned).toBe(snapshot.summary.planned);
  });
});

describe("dashboard and worklog KPI alignment", () => {
  it("counts the same 잔금완납 / 입주완료 / 입주예정 from one fixture", () => {
    const units: WorklogUnitRow[] = [
      unit({ unitId: "paid-status" }),
      unit({ unitId: "paid-moved" }),
      unit({ unitId: "paid-status-no-date" }),
      unit({ unitId: "moved-date" }),
      unit({ unitId: "moved-other-status" }),
      unit({ unitId: "planned-only" }),
      unit({ unitId: "planned-and-actual" }),
      unit({ unitId: "planned-status-no-date" }),
    ];
    const occupancies: WorklogOccupancyRow[] = [
      occupancy({
        unitId: "paid-status",
        moveInStatus: "BALANCE_PAID",
        balancePaidAt: "2026-09-01T00:00:00.000Z",
      }),
      occupancy({
        unitId: "paid-moved",
        moveInStatus: "MOVED_IN",
        balancePaidAt: "2026-09-01T00:00:00.000Z",
        actualMoveInDate: "2026-09-10T00:00:00.000Z",
      }),
      occupancy({
        unitId: "paid-status-no-date",
        moveInStatus: "BALANCE_PAID",
        balancePaidAt: null,
      }),
      occupancy({
        unitId: "moved-date",
        moveInStatus: "MOVED_IN",
        actualMoveInDate: "2026-09-10T00:00:00.000Z",
      }),
      occupancy({
        unitId: "moved-other-status",
        moveInStatus: "CONTACTED",
        actualMoveInDate: "2026-09-10T00:00:00.000Z",
      }),
      occupancy({
        unitId: "planned-only",
        moveInStatus: "CONTACTED",
        plannedMoveInDate: "2026-10-01",
      }),
      occupancy({
        unitId: "planned-and-actual",
        moveInStatus: "MOVED_IN",
        plannedMoveInDate: "2026-10-01",
        actualMoveInDate: "2026-09-10T00:00:00.000Z",
      }),
      occupancy({
        unitId: "planned-status-no-date",
        moveInStatus: "PLANNED",
        plannedMoveInDate: null,
      }),
    ];
    const aligned = buildMoveInWorklogSnapshot(units, occupancies, [], RANGE);
    const kpis = computeMoveInKpis(
      units.length,
      occupancies.map((row) => ({
        occupancyIntent: row.occupancyIntent,
        fundingStatus: row.fundingStatus,
        moveInStatus: row.moveInStatus,
        balancePaidAt: row.balancePaidAt,
        actualMoveInDate: row.actualMoveInDate,
        plannedMoveInDate: row.plannedMoveInDate,
      })),
    );
    expect(kpis.balancePaid).toBe(2);
    expect(kpis.movedIn).toBe(4);
    expect(kpis.planned).toBe(1);
    expect(kpis.balancePaid).toBe(aligned.summary.balancePaid);
    expect(kpis.movedIn).toBe(aligned.summary.movedIn);
    expect(kpis.planned).toBe(aligned.summary.planned);
  });
});

describe("worklog IDOR query contract", () => {
  it("scopes every worklog source to the route project_id", () => {
    const projectId = "20000000-0000-0000-0000-000000000001";
    const filter = worklogSourceFilter(projectId);
    expect(filter.project.eq.id).toBe(projectId);
    expect(filter.units.eq.project_id).toBe(projectId);
    expect(filter.occupancy.eq.project_id).toBe(projectId);
    expect(filter.consultations.eq.project_id).toBe(projectId);
  });
});
