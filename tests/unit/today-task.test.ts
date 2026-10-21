import { describe, expect, it } from "vitest";
import { buildTodayTaskArgs, todayTaskOutcome } from "@/lib/move-in/today-task";
import { buildRecordVisitResultArgs } from "@/lib/move-in/absence-visit";

const P = "1283e198-5043-4027-96d6-edcc7a6686c6", U = "8e000000-0000-4000-8000-000000000001";
const now = new Date("2026-10-19T05:00:00Z"); // KST 14:00

describe("오늘 관리대상 업무 처리 인자", () => {
  it("다음 관리일이 없거나 오늘(KST)이면 오늘 완료", () => {
    expect(buildTodayTaskArgs(P, U, null, now)).toEqual({ p_project_id: P, p_unit_id: U, p_action: "COMPLETE", p_snoozed_until: null });
    expect(buildTodayTaskArgs(P, U, "", now).p_action).toBe("COMPLETE");
    expect(buildTodayTaskArgs(P, U, "2026-10-19T14:59:00Z", now).p_action).toBe("COMPLETE"); // KST 23:59 같은 날
    expect(buildTodayTaskArgs(P, U, "not-a-date", now).p_action).toBe("COMPLETE");
    expect(buildTodayTaskArgs(P, U, "2026-10-18T00:00:00Z", now).p_action).toBe("COMPLETE"); // 과거
  });

  it("다음 관리일이 내일(KST) 이후면 그날까지 미룸", () => {
    expect(buildTodayTaskArgs(P, U, "2026-10-19T15:00:00Z", now)).toEqual({ p_project_id: P, p_unit_id: U, p_action: "SNOOZE", p_snoozed_until: "2026-10-19T15:00:00.000Z" });
    expect(buildTodayTaskArgs(P, U, "2026-10-22T00:00:00.000Z", now).p_action).toBe("SNOOZE");
  });

  it("RPC 결과 해석: 오류 = failed, null = 이미 관리대상 아님, id = 완료·미룸", () => {
    const complete = buildTodayTaskArgs(P, U, null, now), snooze = buildTodayTaskArgs(P, U, "2026-10-22T00:00:00Z", now);
    expect(todayTaskOutcome(complete, { data: null, error: { code: "42501" } })).toBe("failed");
    expect(todayTaskOutcome(complete, { data: null, error: null })).toBe("not_tracked");
    expect(todayTaskOutcome(complete, { data: "d1", error: null })).toBe("completed");
    expect(todayTaskOutcome(snooze, { data: "d1", error: null })).toBe("snoozed");
  });
});

describe("방문 결과 다음 방문일", () => {
  const base = { projectId: P, visitTargetId: U, contractId: U, content: "방문" };
  it("재방문 필요 + 내일 이후 날짜만 받는다", () => {
    expect(buildRecordVisitResultArgs({ ...base, result: "REVISIT_NEEDED", occupancyIntent: null, nextVisitAt: "2026-10-21T00:00:00Z" }, now))
      .toMatchObject({ p_result: "REVISIT_NEEDED", p_next_visit_at: "2026-10-21T00:00:00.000Z" });
    expect(buildRecordVisitResultArgs({ ...base, result: "REVISIT_NEEDED", occupancyIntent: null }, now)).toMatchObject({ p_next_visit_at: null });
    expect(buildRecordVisitResultArgs({ ...base, result: "REVISIT_NEEDED", occupancyIntent: null, nextVisitAt: "2026-10-19T10:00:00Z" }, now)).toEqual({ error: "next_visit_invalid" });
    expect(buildRecordVisitResultArgs({ ...base, result: "VISITED", occupancyIntent: "JEONSE", nextVisitAt: "2026-10-21T00:00:00Z" }, now)).toEqual({ error: "next_visit_invalid" });
  });
});
