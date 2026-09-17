import { describe, expect, it } from "vitest";
import {
  filterCallRows,
  parseDongHoQuery,
  sortCallRows,
  sortConsultationsNewestFirst,
  type CallListRow,
} from "@/lib/move-in/calls";
import {
  buildCreateMoveInConsultationArgs,
  extractLegacyGrade,
} from "@/lib/move-in/consultation";

function row(partial: Partial<CallListRow> & Pick<CallListRow, "unitId">): CallListRow {
  return {
    buildingNo: "101",
    unitNo: "202",
    customerId: "c1",
    customerName: "이OO",
    customerPhone: "010-1234-5678",
    phoneNormalized: "01012345678",
    assignedCounselorId: "member-a",
    latestGrade: "C",
    occupancyIntent: "SALE",
    fundingStatus: "UNKNOWN",
    moveInStatus: "CONTACTED",
    lastConsultedAt: "2026-09-01T08:27:00.000Z",
    nextContactAt: "2026-09-20T00:00:00.000Z",
    ...partial,
  };
}

const emptyFilters = {
  q: "",
  counselorId: "",
  legacyGrade: "" as const,
  occupancyIntent: "" as const,
  fundingStatus: "" as const,
  moveInStatus: "" as const,
  nextContactDue: false,
};

describe("call search and filters", () => {
  it("parses 101-202", () => {
    expect(parseDongHoQuery("101-202")).toEqual({
      buildingNo: "101",
      unitNo: "202",
    });
  });

  it("searches by hyphen-insensitive phone digits", () => {
    const rows = [
      row({ unitId: "1", customerPhone: "010-1234-5678", phoneNormalized: "01012345678" }),
      row({ unitId: "2", customerPhone: "010-9999-0000", phoneNormalized: "01099990000", buildingNo: "102" }),
    ];
    expect(
      filterCallRows(rows, { ...emptyFilters, q: "01012345678" }).map((item) => item.unitId),
    ).toEqual(["1"]);
    expect(
      filterCallRows(rows, { ...emptyFilters, q: "010-1234-5678" }).map((item) => item.unitId),
    ).toEqual(["1"]);
  });

  it("searches by contractor name and 동호수 token", () => {
    const rows = [
      row({ unitId: "1", customerName: "이OO" }),
      row({ unitId: "2", buildingNo: "102", unitNo: "301", customerName: "김OO" }),
    ];
    expect(filterCallRows(rows, { ...emptyFilters, q: "이OO" })).toHaveLength(1);
    expect(filterCallRows(rows, { ...emptyFilters, q: "101-202" })).toHaveLength(1);
  });

  it("filters counselor, legacy grade, occupancy axes, and due next contact", () => {
    const rows = [
      row({ unitId: "1" }),
      row({
        unitId: "2",
        assignedCounselorId: "member-b",
        latestGrade: "A",
        occupancyIntent: "SELF_MOVE_IN",
        fundingStatus: "NORMAL",
        moveInStatus: "PLANNED",
        nextContactAt: "2099-01-01T00:00:00.000Z",
      }),
    ];
    expect(
      filterCallRows(rows, { ...emptyFilters, counselorId: "member-a" }).map((item) => item.unitId),
    ).toEqual(["1"]);
    expect(
      filterCallRows(rows, { ...emptyFilters, legacyGrade: "C" }).map((item) => item.unitId),
    ).toEqual(["1"]);
    expect(
      filterCallRows(rows, { ...emptyFilters, occupancyIntent: "SALE" }).map((item) => item.unitId),
    ).toEqual(["1"]);
    expect(
      filterCallRows(rows, {
        ...emptyFilters,
        nextContactDue: true,
      }, new Date("2026-09-21T00:00:00.000Z")).map((item) => item.unitId),
    ).toEqual(["1"]);
  });

  it("sorts by 동 then 호", () => {
    const sorted = sortCallRows([
      row({ unitId: "b", buildingNo: "102", unitNo: "101" }),
      row({ unitId: "a", buildingNo: "101", unitNo: "301" }),
    ]);
    expect(sorted.map((item) => item.unitId)).toEqual(["a", "b"]);
  });
});

describe("legacy grade and consultation args", () => {
  it("reads legacy_grade from structured_tags without requiring other keys", () => {
    expect(extractLegacyGrade({ price_sensitive: true, legacy_grade: "C" })).toBe("C");
    expect(extractLegacyGrade({ price_sensitive: true })).toBeNull();
  });

  it("omits occupancy args when optional status change is not selected", () => {
    const args = buildCreateMoveInConsultationArgs({
      projectId: "p1",
      unitId: "u1",
      customerId: "c1",
      consultationType: "OUTBOUND",
      purpose: "기타",
      content: "상황변동 없음",
    });
    expect(args).toMatchObject({
      p_project_id: "p1",
      p_content: "상황변동 없음",
      p_consultation_type: "OUTBOUND",
    });
    expect(args).not.toHaveProperty("p_occupancy_intent");
    expect(args).not.toHaveProperty("p_funding_status");
    expect(args).not.toHaveProperty("p_move_in_status");
  });

  it("rejects blank content", () => {
    expect(
      buildCreateMoveInConsultationArgs({
        projectId: "p1",
        unitId: "u1",
        customerId: "c1",
        consultationType: "OUTBOUND",
      purpose: "기타",
        content: "   ",
      }),
    ).toEqual({ error: "empty_content" });
  });
});

describe("consultation timeline", () => {
  it("orders newest first", () => {
    const sorted = sortConsultationsNewestFirst([
      { consultedAt: "2026-08-01T00:00:00.000Z", id: "old" },
      { consultedAt: "2026-09-01T17:27:00.000Z", id: "new" },
    ]);
    expect(sorted.map((item) => item.id)).toEqual(["new", "old"]);
  });
});
