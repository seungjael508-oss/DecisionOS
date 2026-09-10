import { describe, expect, it } from "vitest";
import { computeMoveInKpis, computeProgressPercent } from "@/lib/move-in/kpis";
import {
  filterTodayRows,
  filterUnits,
  sortUnits,
  todayReasons,
  type UnitListRow,
} from "@/lib/move-in/filters";
import { formatUnitLabel } from "@/lib/move-in/labels";
import { isProtectedPath } from "@/lib/auth/paths";

function row(partial: Partial<UnitListRow> & Pick<UnitListRow, "unitId">): UnitListRow {
  return {
    buildingNo: "101",
    unitNo: "1001",
    customerName: "홍길동",
    occupancyIntent: "SELF_MOVE_IN",
    fundingStatus: "NORMAL",
    moveInStatus: "CONTACTED",
    balancePaidAt: null,
    actualMoveInDate: null,
    plannedMoveInDate: null,
    lastContactAt: null,
    nextContactAt: null,
    ...partial,
  };
}

describe("move-in labels", () => {
  it("formats 동호수 as the primary label", () => {
    expect(formatUnitLabel("101", "1001")).toBe("101동 1001호");
  });
});

describe("move-in kpis", () => {
  it("counts occupancy axes from visible rows without invented statuses", () => {
    const kpis = computeMoveInKpis(3, [
      {
        occupancyIntent: "SALE",
        fundingStatus: "FUNDING_SHORTAGE",
        moveInStatus: "BALANCE_PAID",
        balancePaidAt: "2026-09-01T00:00:00.000Z",
      },
      {
        occupancyIntent: "UNDECIDED",
        fundingStatus: "UNKNOWN",
        moveInStatus: "NOT_CONTACTED",
      },
      {
        occupancyIntent: "JEONSE",
        fundingStatus: "NORMAL",
        moveInStatus: "MOVED_IN",
        actualMoveInDate: "2026-09-02T00:00:00.000Z",
      },
    ]);
    expect(kpis).toEqual({
      totalUnits: 3,
      balancePaid: 1,
      movedIn: 1,
      planned: 0,
      fundingIssue: 1,
      sellOrRent: 2,
      undecided: 1,
      notContacted: 1,
    });
    expect(computeProgressPercent(kpis)).toBe(33);
  });

  it("counts 잔금완납 from balance_paid_at, including MOVED_IN", () => {
    expect(
      computeMoveInKpis(1, [
        {
          occupancyIntent: "SELF_MOVE_IN",
          fundingStatus: "NORMAL",
          moveInStatus: "BALANCE_PAID",
          balancePaidAt: "2026-09-01T00:00:00.000Z",
        },
      ]).balancePaid,
    ).toBe(1);
    expect(
      computeMoveInKpis(1, [
        {
          occupancyIntent: "SELF_MOVE_IN",
          fundingStatus: "NORMAL",
          moveInStatus: "MOVED_IN",
          balancePaidAt: "2026-09-01T00:00:00.000Z",
          actualMoveInDate: "2026-09-10T00:00:00.000Z",
        },
      ]).balancePaid,
    ).toBe(1);
    expect(
      computeMoveInKpis(1, [
        {
          occupancyIntent: "SELF_MOVE_IN",
          fundingStatus: "NORMAL",
          moveInStatus: "BALANCE_PAID",
          balancePaidAt: null,
        },
      ]).balancePaid,
    ).toBe(0);
  });

  it("counts 입주완료 from actual_move_in_date regardless of status", () => {
    expect(
      computeMoveInKpis(1, [
        {
          occupancyIntent: "SELF_MOVE_IN",
          fundingStatus: "NORMAL",
          moveInStatus: "CONTACTED",
          actualMoveInDate: "2026-09-10T00:00:00.000Z",
        },
      ]).movedIn,
    ).toBe(1);
    expect(
      computeMoveInKpis(1, [
        {
          occupancyIntent: "SELF_MOVE_IN",
          fundingStatus: "NORMAL",
          moveInStatus: "MOVED_IN",
          actualMoveInDate: null,
        },
      ]).movedIn,
    ).toBe(0);
  });

  it("counts 입주예정 from planned date only when actual is empty", () => {
    expect(
      computeMoveInKpis(1, [
        {
          occupancyIntent: "SELF_MOVE_IN",
          fundingStatus: "NORMAL",
          moveInStatus: "CONTACTED",
          plannedMoveInDate: "2026-10-01",
          actualMoveInDate: null,
        },
      ]).planned,
    ).toBe(1);
    expect(
      computeMoveInKpis(1, [
        {
          occupancyIntent: "SELF_MOVE_IN",
          fundingStatus: "NORMAL",
          moveInStatus: "MOVED_IN",
          plannedMoveInDate: "2026-10-01",
          actualMoveInDate: "2026-09-10T00:00:00.000Z",
        },
      ]).planned,
    ).toBe(0);
    expect(
      computeMoveInKpis(1, [
        {
          occupancyIntent: "SELF_MOVE_IN",
          fundingStatus: "NORMAL",
          moveInStatus: "PLANNED",
          plannedMoveInDate: null,
        },
      ]).planned,
    ).toBe(0);
  });

  it("computes 잔금완납 진행률 without double-counting 입주완료", () => {
    const base = {
      planned: 0,
      fundingIssue: 0,
      sellOrRent: 0,
      undecided: 0,
      notContacted: 0,
    };
    expect(
      computeProgressPercent({
        ...base,
        totalUnits: 850,
        balancePaid: 0,
        movedIn: 0,
      }),
    ).toBe(0);
    expect(
      computeProgressPercent({
        ...base,
        totalUnits: 850,
        balancePaid: 425,
        movedIn: 0,
      }),
    ).toBe(50);
    expect(
      computeProgressPercent({
        ...base,
        totalUnits: 850,
        balancePaid: 595,
        movedIn: 0,
      }),
    ).toBe(70);
    expect(
      computeProgressPercent({
        ...base,
        totalUnits: 850,
        balancePaid: 850,
        movedIn: 0,
      }),
    ).toBe(100);
    expect(computeProgressPercent(computeMoveInKpis(0, []))).toBe(0);
    expect(
      computeProgressPercent({
        ...base,
        totalUnits: 850,
        balancePaid: 425,
        movedIn: 800,
      }),
    ).toBe(50);
    expect(() =>
      computeProgressPercent({
        ...base,
        totalUnits: 850,
        balancePaid: 851,
        movedIn: 0,
      }),
    ).toThrow("계산 버그: 잔금완납이 총 대상세대를 초과합니다.");

    const bothDates = computeMoveInKpis(1, [
      {
        occupancyIntent: "SELF_MOVE_IN",
        fundingStatus: "NORMAL",
        moveInStatus: "MOVED_IN",
        balancePaidAt: "2026-09-01T00:00:00.000Z",
        actualMoveInDate: "2026-09-10T00:00:00.000Z",
      },
    ]);
    expect(bothDates.balancePaid).toBe(1);
    expect(bothDates.movedIn).toBe(1);
    expect(computeProgressPercent(bothDates)).toBe(100);
  });
});

describe("unit list filters", () => {
  const rows = [
    row({ unitId: "b", buildingNo: "102", unitNo: "804", customerName: "김철수" }),
    row({
      unitId: "a",
      buildingNo: "101",
      unitNo: "1001",
      occupancyIntent: "UNDECIDED",
      fundingStatus: "FUNDING_SHORTAGE",
      moveInStatus: "DELAYED",
    }),
  ];

  it("sorts by building_no then unit_no", () => {
    expect(sortUnits(rows).map((item) => item.unitId)).toEqual(["a", "b"]);
  });

  it("filters by 동/호/계약자 and the three occupancy axes", () => {
    expect(
      filterUnits(rows, {
        buildingNo: "101",
        unitNo: "",
        customerName: "",
        occupancyIntent: "",
        fundingStatus: "",
        moveInStatus: "",
      }).map((item) => item.unitId),
    ).toEqual(["a"]);

    expect(
      filterUnits(sortUnits(rows), {
        buildingNo: "",
        unitNo: "",
        customerName: "김",
        occupancyIntent: "",
        fundingStatus: "",
        moveInStatus: "",
      }).map((item) => item.unitId),
    ).toEqual(["b"]);

    expect(
      filterUnits(rows, {
        buildingNo: "",
        unitNo: "",
        customerName: "",
        occupancyIntent: "UNDECIDED",
        fundingStatus: "FUNDING_SHORTAGE",
        moveInStatus: "DELAYED",
      }).map((item) => item.unitId),
    ).toEqual(["a"]);
  });
});

describe("today queue", () => {
  const now = new Date("2026-09-09T00:00:00+09:00");

  it("includes next_contact_at on or before now", () => {
    const due = row({
      unitId: "due",
      nextContactAt: "2026-09-08T15:00:00.000Z",
    });
    const later = row({
      unitId: "later",
      nextContactAt: "2026-09-10T15:00:00.000Z",
    });
    expect(todayReasons(due, now)).toContain("NEXT_CONTACT");
    expect(todayReasons(later, now)).not.toContain("NEXT_CONTACT");
    expect(filterTodayRows([due, later], "next_contact", now).map((item) => item.unitId)).toEqual([
      "due",
    ]);
  });

  it("filters delayed and funding risk independently", () => {
    const delayed = row({ unitId: "d", moveInStatus: "DELAYED" });
    const shortage = row({
      unitId: "s",
      fundingStatus: "FUNDING_SHORTAGE",
    });
    const unsold = row({
      unitId: "u",
      fundingStatus: "EXISTING_HOME_UNSOLD",
    });
    expect(filterTodayRows([delayed, shortage, unsold], "delayed", now).map((item) => item.unitId)).toEqual(
      ["d"],
    );
    expect(
      filterTodayRows([delayed, shortage, unsold], "funding", now).map((item) => item.unitId),
    ).toEqual(["s", "u"]);
  });
});

describe("auth path protection", () => {
  it("protects project routes and the home project picker", () => {
    expect(isProtectedPath("/")).toBe(true);
    expect(isProtectedPath("/projects/abc/move-in")).toBe(true);
    expect(isProtectedPath("/login")).toBe(false);
  });
});
