import { describe, expect, it } from "vitest";
import {
  DEFAULT_UNIT_LIST_FILTERS,
  describeActiveFilters,
  filterUnits,
  gradeCounts,
  sortUnitRows,
  type UnitListRow,
} from "@/lib/move-in/filters";

function row(partial: Partial<UnitListRow> & Pick<UnitListRow, "unitId">): UnitListRow {
  return {
    buildingNo: "101",
    unitNo: "1001",
    customerName: "홍길동",
    latestGrade: null,
    customerPhone: null,
    occupancyIntent: null,
    fundingStatus: null,
    moveInStatus: null,
    balancePaidAt: null,
    actualMoveInDate: null,
    plannedMoveInDate: null,
    lastContactAt: null,
    nextContactAt: null,
    ...partial,
  };
}

describe("unit list grade filter", () => {
  const rows = [
    row({ unitId: "a", buildingNo: "101", unitNo: "201", latestGrade: "A" }),
    row({ unitId: "b", buildingNo: "105", unitNo: "301", latestGrade: "C" }),
    row({ unitId: "c", buildingNo: "105", unitNo: "302", latestGrade: "C" }),
    row({ unitId: "d", buildingNo: "106", unitNo: "401", latestGrade: "D" }),
    row({ unitId: "e", buildingNo: "107", unitNo: "501", latestGrade: "부재" }),
    row({ unitId: "f", buildingNo: "108", unitNo: "601", latestGrade: "상담거절" }),
    row({ unitId: "g", buildingNo: "109", unitNo: "701", latestGrade: null }),
  ];

  it("filters by grade alone", () => {
    expect(
      filterUnits(rows, { ...DEFAULT_UNIT_LIST_FILTERS, grade: "A" }).map((item) => item.unitId),
    ).toEqual(["a"]);
  });

  it("combines grade with building filter", () => {
    expect(
      filterUnits(rows, { ...DEFAULT_UNIT_LIST_FILTERS, grade: "C", buildingNo: "105" }).map(
        (item) => item.unitId,
      ),
    ).toEqual(["b", "c"]);
  });

  it("filters 부재 grade", () => {
    expect(
      filterUnits(rows, { ...DEFAULT_UNIT_LIST_FILTERS, grade: "부재" }).map((item) => item.unitId),
    ).toEqual(["e"]);
  });

  it("filters 상담거절 grade", () => {
    expect(
      filterUnits(rows, { ...DEFAULT_UNIT_LIST_FILTERS, grade: "상담거절" }).map((item) => item.unitId),
    ).toEqual(["f"]);
  });

  it("resets to the full list when filters are cleared", () => {
    expect(filterUnits(rows, DEFAULT_UNIT_LIST_FILTERS)).toHaveLength(rows.length);
  });

  it("counts each grade without inventing categories", () => {
    expect(gradeCounts(rows)).toEqual({
      A: 1,
      B: 0,
      C: 2,
      D: 1,
      부재: 1,
      상담거절: 1,
    });
  });
});

describe("unit list name/unit search", () => {
  const rows = [
    row({ unitId: "a", customerName: "김철수", buildingNo: "101", unitNo: "1001" }),
    row({ unitId: "b", customerName: "박영희", buildingNo: "102", unitNo: "804" }),
    row({ unitId: "c", customerName: null, buildingNo: "103", unitNo: "1204" }),
  ];

  it("partial-matches customer name", () => {
    expect(
      filterUnits(rows, { ...DEFAULT_UNIT_LIST_FILTERS, customerName: "철수" }).map((item) => item.unitId),
    ).toEqual(["a"]);
  });

  it("partial-matches unit number", () => {
    expect(
      filterUnits(rows, { ...DEFAULT_UNIT_LIST_FILTERS, unitNo: "04" }).map((item) => item.unitId),
    ).toEqual(["b", "c"]);
  });
});

describe("sortUnitRows", () => {
  it("sorts 동호수 numerically, not lexicographically", () => {
    const rows = [
      row({ unitId: "a", buildingNo: "101", unitNo: "1001" }),
      row({ unitId: "b", buildingNo: "101", unitNo: "202" }),
      row({ unitId: "c", buildingNo: "101", unitNo: "201" }),
      row({ unitId: "d", buildingNo: "102", unitNo: "201" }),
    ];
    expect(sortUnitRows(rows, "unit", "asc").map((item) => item.unitId)).toEqual([
      "c",
      "b",
      "a",
      "d",
    ]);
    expect(sortUnitRows(rows, "unit", "desc").map((item) => item.unitId)).toEqual([
      "d",
      "a",
      "b",
      "c",
    ]);
  });

  it("sorts 계약자명 가나다순 with null names always last", () => {
    const rows = [
      row({ unitId: "a", customerName: "홍길동" }),
      row({ unitId: "b", customerName: "김철수" }),
      row({ unitId: "c", customerName: null }),
    ];
    expect(sortUnitRows(rows, "name", "asc").map((item) => item.unitId)).toEqual(["b", "a", "c"]);
    expect(sortUnitRows(rows, "name", "desc").map((item) => item.unitId)).toEqual(["a", "b", "c"]);
  });

  it("sorts 등급 in business priority order both directions, with 미확인 fallback last", () => {
    const rows = [
      row({ unitId: "a", latestGrade: "D" }),
      row({ unitId: "b", latestGrade: "A" }),
      row({ unitId: "c", latestGrade: "상담거절" }),
      row({ unitId: "d", latestGrade: null }),
      row({ unitId: "e", latestGrade: "부재" }),
    ];
    expect(sortUnitRows(rows, "grade", "asc").map((item) => item.unitId)).toEqual([
      "b",
      "a",
      "e",
      "c",
      "d",
    ]);
    expect(sortUnitRows(rows, "grade", "desc").map((item) => item.unitId)).toEqual([
      "d",
      "c",
      "e",
      "a",
      "b",
    ]);
  });
});

describe("describeActiveFilters", () => {
  it("returns 전체 when no filter is active", () => {
    expect(describeActiveFilters(DEFAULT_UNIT_LIST_FILTERS)).toBe("전체");
  });

  it("summarizes active filters without leaking unrelated PII fields", () => {
    expect(
      describeActiveFilters({ ...DEFAULT_UNIT_LIST_FILTERS, grade: "C", buildingNo: "105" }),
    ).toBe("등급: C · 동: 105");
  });
});
