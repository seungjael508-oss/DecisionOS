import { describe, expect, it } from "vitest";
import { buildRecordVisitResultArgs } from "@/lib/move-in/absence-visit";
import { matchesTodayQueueFilter, parseTodayQueueFilter } from "@/lib/move-in/filters";

describe("방문 결과 인자", () => {
  const base = { projectId: "p", visitTargetId: "v", contractId: "k", content: "방문" };
  it("방문 완료는 의향 필수", () => {
    expect(buildRecordVisitResultArgs({ ...base, result: "VISITED", occupancyIntent: null })).toEqual({ error: "intent_required" });
    expect(buildRecordVisitResultArgs({ ...base, result: "VISITED", occupancyIntent: "INVALID" })).toEqual({ error: "intent_required" });
    expect(buildRecordVisitResultArgs({ ...base, result: "VISITED", occupancyIntent: "JEONSE" })).toMatchObject({ p_result: "VISITED", p_occupancy_intent: "JEONSE" });
  });

  it("재방문 필요는 의향을 받지 않는다", () => {
    expect(buildRecordVisitResultArgs({ ...base, result: "REVISIT_NEEDED", occupancyIntent: "SALE" })).toEqual({ error: "intent_not_allowed" });
    expect(buildRecordVisitResultArgs({ ...base, result: "REVISIT_NEEDED", occupancyIntent: null })).toMatchObject({ p_result: "REVISIT_NEEDED", p_occupancy_intent: null });
  });

  it("기본등급 인자를 보내지 않는다(방문 결과와 등급 분리)", () => {
    const args = buildRecordVisitResultArgs({ ...base, result: "VISITED", occupancyIntent: "SALE" });
    expect(Object.keys(args)).not.toContain("p_legacy_grade");
  });

  it("방문 결과 값·내용 검증", () => {
    expect(buildRecordVisitResultArgs({ ...base, result: "VISIT_NEEDED", occupancyIntent: null })).toEqual({ error: "invalid_result" });
    expect(buildRecordVisitResultArgs({ ...base, content: " ", result: "REVISIT_NEEDED", occupancyIntent: null })).toEqual({ error: "content_required" });
  });
});

describe("오늘 관리대상 필터", () => {
  it("장기 부재·방문상담 필터를 해석하고 next_contact는 전체로 처리", () => {
    expect(parseTodayQueueFilter("absence")).toBe("absence");
    expect(parseTodayQueueFilter("visit")).toBe("visit");
    expect(parseTodayQueueFilter("next_contact")).toBe("all");
    expect(parseTodayQueueFilter(undefined)).toBe("all");
  });

  it("사유 코드로만 좁힌다", () => {
    const absent = { reasonCodes: ["ABSENCE_STREAK", "VISIT_NEEDED"], moveInStatus: null };
    const revisit = { reasonCodes: ["REVISIT_NEEDED"], moveInStatus: null };
    const done = { reasonCodes: ["VISIT_DONE"], moveInStatus: null };
    const cGrade = { reasonCodes: ["C_GRADE_STALE"], moveInStatus: "DELAYED" };
    expect(matchesTodayQueueFilter(absent, "absence")).toBe(true);
    expect(matchesTodayQueueFilter(revisit, "absence")).toBe(false);
    expect([absent, revisit, done, cGrade].map((r) => matchesTodayQueueFilter(r, "visit"))).toEqual([true, true, true, false]);
    expect(matchesTodayQueueFilter(cGrade, "delayed")).toBe(true);
    expect(matchesTodayQueueFilter(cGrade, "next_contact")).toBe(true);
  });
});
