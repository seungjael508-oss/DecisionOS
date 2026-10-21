import { describe, expect, it } from "vitest";
import { ledgerParamsFromTodayQuery, parseTodayTaskType, todayTaskTypesOf, todayTodoText } from "@/lib/move-in/today-workflow";
import { applyLedgerQuery, parseLedgerQuery } from "@/lib/move-in/ledger-filters";

describe("오늘 관리 업무 유형", () => {
  it("방문 사유는 방문, 그 외 재접촉·후속 사유는 전화로 본다", () => {
    expect(todayTaskTypesOf(["VISIT_NEEDED"], { currentGrade: "D", effectiveIntent: null })).toEqual(["visit", "d_special"]);
    expect(todayTaskTypesOf(["C_GRADE_STALE"], { currentGrade: "C", effectiveIntent: "UNDECIDED" })).toEqual(["call", "c_undecided"]);
    expect(todayTaskTypesOf(["ABSENCE_STREAK", "REVISIT_NEEDED"], { currentGrade: "B", effectiveIntent: "MOVE_IN" }).sort()).toEqual(["absence", "call", "visit"]);
    expect(todayTaskTypesOf(["NEXT_CONTACT_DUE"], { currentGrade: "C", effectiveIntent: "MOVE_IN" })).toEqual(["call", "follow_up"]);
    expect(todayTaskTypesOf(["VISIT_DONE"], { currentGrade: "A", effectiveIntent: null })).toEqual([]);
  });
  it("오늘 할 일은 우선순위 순으로 중복 없이 합친다", () => {
    expect(todayTodoText(["C_GRADE_STALE", "VISIT_NEEDED", "NEXT_CONTACT_DUE"])).toBe("방문상담 · 다음 관리일 후속 상담 · C등급 재접촉 전화");
    expect(todayTodoText([])).toBe("상담");
  });
  it("업무 유형 파라미터는 정해진 값만", () => {
    expect(parseTodayTaskType("done")).toBe("done");
    expect(parseTodayTaskType("x")).toBeNull();
    expect(parseTodayTaskType(null)).toBeNull();
  });
});

describe("오늘 관리 ↔ 원장 필터 판정 공유", () => {
  it("오늘 관리 전용 키는 빼고 원장 필터만 원장 함수로 넘긴다", () => {
    const params = ledgerParamsFromTodayQuery({ filter: "absence", dReason: "ASEL", task: "call", moveInNotice: "taskPending", taskUnit: "u", taskNext: "t", grade: "C" });
    expect(params.toString()).toBe("grade=C");
    expect(parseLedgerQuery(params).issues).toEqual([]);
  });
  it("같은 판정 함수: 원장 빠른필터 C가 오늘 관리 행에도 같은 결과", () => {
    const row = (unitId: string, currentGrade: string) => ({ unitId, buildingNo: "101", unitNo: "1", currentGrade, customerName: "n", phone: null, assigneeId: null,
      effectiveIntent: "UNDECIDED", rentalType: null, funding: null, moveIn: null, nextContact: null, specialReasons: [], specialPriority: null, dealTypes: [],
      payment: null, balance: null, views: [] }) as never;
    const state = parseLedgerQuery(ledgerParamsFromTodayQuery({ grade: "C", filter: "visit" }));
    expect(applyLedgerQuery([row("a", "C"), row("b", "D")], state, new Date()).filteredSorted.map((r: { unitId: string }) => r.unitId)).toEqual(["a"]);
  });
});
