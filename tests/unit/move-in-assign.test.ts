import { describe, expect, it } from "vitest";
import type { CallListRow } from "@/lib/move-in/calls";
import { requireProjectAdmin, type MoveInAccess } from "@/lib/move-in/access";
import {
  canSubmitAssignment,
  DEFAULT_ASSIGN_FILTERS,
  fieldMemberLabel,
  filterAssignRows,
  isValidFieldMemberDisplayName,
  sortAssignRows,
  uniqueCustomerIds,
  type AssignFilters,
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

function withFilters(overrides: Partial<AssignFilters>): AssignFilters {
  return { ...DEFAULT_ASSIGN_FILTERS, ...overrides };
}

describe("filterAssignRows: 개별 조건 조합", () => {
  const rows = [
    row({ unitId: "u1", customerId: "c1", buildingNo: "104", unitNo: "101", customerName: "이OO", customerPhone: "010-1234-5678", phoneNormalized: "01012345678", assignedCounselorId: null, latestGrade: "C" }),
    row({ unitId: "u2", customerId: "c2", buildingNo: "105", unitNo: "1204", customerName: "김OO", customerPhone: "010-9999-0000", phoneNormalized: "01099990000", assignedCounselorId: "member-a", latestGrade: "D" }),
    row({ unitId: "u3", customerId: "c3", buildingNo: "105", unitNo: "302", customerName: "박OO", customerPhone: "010-5555-1111", phoneNormalized: "01055551111", assignedCounselorId: "member-b", latestGrade: "A" }),
    row({ unitId: "u4", customerId: "c4", buildingNo: "104", unitNo: "501", customerName: "최OO", customerPhone: "010-7777-2222", phoneNormalized: "01077772222", assignedCounselorId: null, latestGrade: "C" }),
  ];

  it("등급 D만 필터링한다", () => {
    expect(filterAssignRows(rows, withFilters({ grade: "D" })).map((r) => r.customerId)).toEqual(["c2"]);
  });

  it("105동만 필터링한다", () => {
    expect(filterAssignRows(rows, withFilters({ buildingNo: "105" })).map((r) => r.customerId)).toEqual(["c2", "c3"]);
  });

  it("105동 + 1204호 조합", () => {
    expect(
      filterAssignRows(rows, withFilters({ buildingNo: "105", unitNo: "1204" })).map((r) => r.customerId),
    ).toEqual(["c2"]);
  });

  it("계약자명으로 필터링한다", () => {
    expect(filterAssignRows(rows, withFilters({ customerName: "김" })).map((r) => r.customerId)).toEqual(["c2"]);
  });

  it("전화번호는 하이픈 유무와 무관하게 필터링한다", () => {
    expect(filterAssignRows(rows, withFilters({ customerPhone: "010-5555-1111" })).map((r) => r.customerId)).toEqual(["c3"]);
    expect(filterAssignRows(rows, withFilters({ customerPhone: "01055551111" })).map((r) => r.customerId)).toEqual(["c3"]);
  });

  it("등급 D + 105동 조합", () => {
    expect(
      filterAssignRows(rows, withFilters({ grade: "D", buildingNo: "105" })).map((r) => r.customerId),
    ).toEqual(["c2"]);
  });

  it("등급 C + 104동 + 미배정만 조합", () => {
    expect(
      filterAssignRows(rows, withFilters({ grade: "C", buildingNo: "104", unassignedOnly: true })).map(
        (r) => r.customerId,
      ),
    ).toEqual(["c1", "c4"]);
  });

  it("현재 담당 상담사로 필터링한다", () => {
    expect(filterAssignRows(rows, withFilters({ counselorId: "member-b" })).map((r) => r.customerId)).toEqual(["c3"]);
  });

  it("미배정만 체크 시 담당상담사 필터는 무시한다", () => {
    expect(
      filterAssignRows(rows, withFilters({ unassignedOnly: true, counselorId: "member-a" })).map(
        (r) => r.customerId,
      ),
    ).toEqual(["c1", "c4"]);
  });

  it("조건이 없으면 전체를 반환한다 (초기화 상태)", () => {
    expect(filterAssignRows(rows, DEFAULT_ASSIGN_FILTERS)).toHaveLength(rows.length);
  });
});

describe("sortAssignRows", () => {
  const rows = [
    row({ unitId: "u1", customerId: "c1", buildingNo: "105", unitNo: "302", customerName: "박OO", latestGrade: "A" }),
    row({ unitId: "u2", customerId: "c2", buildingNo: "104", unitNo: "101", customerName: "김OO", latestGrade: "부재" }),
    row({ unitId: "u3", customerId: "c3", buildingNo: "104", unitNo: "501", customerName: "이OO", latestGrade: "D" }),
  ];

  it("동호수 오름차순/내림차순", () => {
    expect(sortAssignRows(rows, "unit", "asc").map((r) => r.customerId)).toEqual(["c2", "c3", "c1"]);
    expect(sortAssignRows(rows, "unit", "desc").map((r) => r.customerId)).toEqual(["c1", "c3", "c2"]);
  });

  it("계약자명 가나다순/역순", () => {
    // 김OO(c2) < 박OO(c1) < 이OO(c3)
    expect(sortAssignRows(rows, "name", "asc").map((r) => r.customerId)).toEqual(["c2", "c1", "c3"]);
    expect(sortAssignRows(rows, "name", "desc").map((r) => r.customerId)).toEqual(["c3", "c1", "c2"]);
  });

  it("등급순: A, B, C, D, 부재, 상담거절, 미확인 순서를 따른다", () => {
    expect(sortAssignRows(rows, "grade", "asc").map((r) => r.customerId)).toEqual(["c1", "c3", "c2"]);
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

describe("fieldMemberLabel: UUID 노출 금지", () => {
  it("표시 이름이 있으면 그대로 쓴다", () => {
    expect(fieldMemberLabel("이승재")).toBe("이승재");
  });

  it("이름이 없거나 공백이면 '이름 미등록'으로 대체하고 UUID를 노출하지 않는다", () => {
    expect(fieldMemberLabel(null)).toBe("이름 미등록");
    expect(fieldMemberLabel(undefined)).toBe("이름 미등록");
    expect(fieldMemberLabel("   ")).toBe("이름 미등록");
    expect(fieldMemberLabel("11112222-3333-4444-5555-666677778888")).not.toMatch(/^상담사 /);
  });
});

describe("isValidFieldMemberDisplayName", () => {
  it("2~30자만 허용한다", () => {
    expect(isValidFieldMemberDisplayName("가")).toBe(false);
    expect(isValidFieldMemberDisplayName("가나")).toBe(true);
    expect(isValidFieldMemberDisplayName("가".repeat(30))).toBe(true);
    expect(isValidFieldMemberDisplayName("가".repeat(31))).toBe(false);
    expect(isValidFieldMemberDisplayName("   ")).toBe(false);
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
