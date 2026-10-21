import { describe, expect, it } from "vitest";
import { matchesDGradeReasonFilter } from "@/lib/move-in/d-grade-reasons";
import { matchesTodayQueueFilter, type TodayFilter } from "@/lib/move-in/filters";
import { parseTodayViewFilters, selectTodayViewRows, showTodayDoneRows, type TodayViewFilters } from "@/lib/move-in/today-view";
import { TODAY_TASK_TYPES, type TodayTaskType } from "@/lib/move-in/today-workflow";

type Row = { id: string; reasonCodes: string[]; moveInStatus: string | null; legacyGrade: string | null; dGradeReasons: string[]; taskTypes: TodayTaskType[] };
const rows: Row[] = [
  { id: "d-asel", reasonCodes: ["D_GRADE_STALE"], moveInStatus: null, legacyGrade: "D", dGradeReasons: ["ASEL"], taskTypes: ["call", "d_special"] },
  { id: "d-both", reasonCodes: ["ABSENCE_STREAK", "VISIT_NEEDED"], moveInStatus: null, legacyGrade: "D", dGradeReasons: ["ASEL", "DELINQUENT"], taskTypes: ["visit", "absence", "d_special"] },
  { id: "d-none", reasonCodes: ["NEXT_CONTACT_DUE"], moveInStatus: "DELAYED", legacyGrade: "D", dGradeReasons: [], taskTypes: ["call", "follow_up"] },
  { id: "c-fund", reasonCodes: ["C_GRADE_FUNDING"], moveInStatus: null, legacyGrade: "C", dGradeReasons: [], taskTypes: ["call", "c_undecided"] },
];
const ids = (list: Row[]) => list.map((r) => r.id);

// 서버에서 하던 판정(전환 전 page.tsx)을 그대로 옮긴 기준값
const legacy = (list: Row[], { filter, dReasons, task }: TodayViewFilters) => list
  .filter((row) => filter === "all" || matchesTodayQueueFilter(row, filter))
  .filter((row) => matchesDGradeReasonFilter({ currentGrade: row.legacyGrade, dGradeReasons: row.dGradeReasons }, dReasons))
  .filter((row) => !task || (task !== "done" && row.taskTypes.includes(task)));

describe("오늘 관리대상 화면 필터(브라우저 판정)", () => {
  it("모든 필터 조합에서 기존 서버 판정과 같은 행", () => {
    const filters: TodayFilter[] = ["all", "absence", "visit", "delayed", "funding"];
    const reasonSets = [[], ["ASEL"], ["DELINQUENT"], ["ASEL", "DELINQUENT"]] as TodayViewFilters["dReasons"][];
    for (const filter of filters) for (const dReasons of reasonSets) for (const task of [null, ...TODAY_TASK_TYPES]) {
      const view = { filter, dReasons, task };
      expect(ids(selectTodayViewRows(rows, view))).toEqual(ids(legacy(rows, view)));
    }
  });
  it("D등급 사유는 D 세대 중 선택 사유 하나 이상(OR), 처리 완료 선택 시 미처리 없음", () => {
    expect(ids(selectTodayViewRows(rows, { filter: "all", dReasons: ["DELINQUENT"], task: null }))).toEqual(["d-both"]);
    expect(ids(selectTodayViewRows(rows, { filter: "all", dReasons: ["ASEL", "DELINQUENT"], task: null }))).toEqual(["d-asel", "d-both"]);
    expect(selectTodayViewRows(rows, { filter: "all", dReasons: [], task: "done" })).toEqual([]);
  });
  it("처리 완료 목록은 필터·사유가 없을 때(또는 처리 완료 선택)만", () => {
    expect(showTodayDoneRows({ filter: "all", dReasons: [], task: null })).toBe(true);
    expect(showTodayDoneRows({ filter: "all", dReasons: [], task: "done" })).toBe(true);
    expect(showTodayDoneRows({ filter: "all", dReasons: [], task: "call" })).toBe(false);
    expect(showTodayDoneRows({ filter: "visit", dReasons: [], task: null })).toBe(false);
    expect(showTodayDoneRows({ filter: "all", dReasons: ["ASEL"], task: null })).toBe(false);
  });
  it("주소 해석은 서버와 같다(알 수 없는 값은 무시)", () => {
    expect(parseTodayViewFilters(new URLSearchParams("filter=visit&dReason=ASEL,DELINQUENT&task=call"))).toEqual({ filter: "visit", dReasons: ["ASEL", "DELINQUENT"], task: "call" });
    expect(parseTodayViewFilters(new URLSearchParams("filter=x&dReason=NOPE&task=y"))).toEqual({ filter: "all", dReasons: [], task: null });
  });
});
