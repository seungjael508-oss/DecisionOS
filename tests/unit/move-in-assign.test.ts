import { describe, expect, it } from "vitest";
import type { CallListRow } from "@/lib/move-in/calls";
import { filterCallRows, parseDongHoQuery } from "@/lib/move-in/calls";
import { requireProjectAdmin, type MoveInAccess } from "@/lib/move-in/access";
import {
  canSubmitAssignment,
  filterAssignRows,
  uniqueCustomerIds,
  type AssignListFilters,
} from "@/lib/move-in/assign";

function row(
  partial: Partial<CallListRow> & Pick<CallListRow, "unitId" | "customerId">,
): CallListRow {
  return {
    buildingNo: "101",
    unitNo: "202",
    customerName: "이OO",
    customerPhone: "010-1234-5678",
    phoneNormalized: "01012345678",
    assignedCounselorId: "member-a",
    latestGrade: "C",
    occupancyIntent: "SALE",
    fundingStatus: "UNKNOWN",
    moveInStatus: "CONTACTED",
    lastConsultedAt: null,
    nextContactAt: null,
    ...partial,
  };
}

const emptyAssign: AssignListFilters = {
  q: "",
  counselorId: "",
  legacyGrade: "",
  unassignedOnly: false,
};

describe("assign search reuses call helpers", () => {
  it("parses 101-202 via existing helper", () => {
    expect(parseDongHoQuery("101-202")).toEqual({
      buildingNo: "101",
      unitNo: "202",
    });
  });

  it("searches name and hyphen-insensitive phone through filterAssignRows", () => {
    const rows = [
      row({ unitId: "u1", customerId: "c1" }),
      row({
        unitId: "u2",
        customerId: "c2",
        customerName: "김OO",
        buildingNo: "102",
        phoneNormalized: "01099990000",
        customerPhone: "010-9999-0000",
      }),
    ];
    expect(filterAssignRows(rows, { ...emptyAssign, q: "이OO" })).toHaveLength(1);
    expect(filterAssignRows(rows, { ...emptyAssign, q: "010-1234-5678" })).toHaveLength(1);
    expect(filterAssignRows(rows, { ...emptyAssign, q: "101-202" })).toHaveLength(1);
    expect(filterCallRows).toBeTypeOf("function");
  });

  it("filters unassigned and legacy grade", () => {
    const rows = [
      row({ unitId: "u1", customerId: "c1", assignedCounselorId: null, latestGrade: "C" }),
      row({ unitId: "u2", customerId: "c2", assignedCounselorId: "member-a", latestGrade: "A" }),
    ];
    expect(
      filterAssignRows(rows, { ...emptyAssign, unassignedOnly: true }).map((item) => item.customerId),
    ).toEqual(["c1"]);
    expect(
      filterAssignRows(rows, { ...emptyAssign, counselorId: "member-a" }).map((item) => item.customerId),
    ).toEqual(["c2"]);
    expect(
      filterAssignRows(rows, { ...emptyAssign, legacyGrade: "C" }).map((item) => item.customerId),
    ).toEqual(["c1"]);
  });
});

describe("assign payload", () => {
  it("dedupes customer ids", () => {
    expect(uniqueCustomerIds(["c1", "c1", "c2"])).toEqual(["c1", "c2"]);
  });

  it("prevents assign with 0 selected or missing assignee", () => {
    expect(canSubmitAssignment([], "member-a")).toBe(false);
    expect(canSubmitAssignment(["c1"], "")).toBe(false);
    expect(canSubmitAssignment(["c1"], "member-a")).toBe(true);
  });
});

describe("assign route access", () => {
  it("blocks COUNSELOR and allows PROJECT_ADMIN", () => {
    const counselor: MoveInAccess = {
      ok: true,
      projectId: "p1",
      projectName: "현장",
      role: "COUNSELOR",
      memberId: "m1",
      userId: "u1",
    };
    const admin: MoveInAccess = { ...counselor, role: "PROJECT_ADMIN" };
    expect(requireProjectAdmin(counselor)).toBe(false);
    expect(requireProjectAdmin(admin)).toBe(true);
  });
});
