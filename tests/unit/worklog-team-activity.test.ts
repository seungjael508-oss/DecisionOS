import { describe, expect, it } from "vitest";
import { worklogDayRange } from "@/lib/worklog/day-range";
import type { WorklogConsultationRow, WorklogUnitRow } from "@/lib/worklog/snapshot";
import { buildConsultationDetail, buildGradeChangeSummary, buildTeamActivity, type WorklogFieldMember } from "@/lib/worklog/team-activity";

const range = worklogDayRange("2026-09-16", "Asia/Seoul");

const unit = (unitId: string, unitNo?: string): WorklogUnitRow => ({ unitId, buildingNo: "105", unitType: "TYPE-X", unitNo });

const event = (
  id: string,
  overrides: Partial<WorklogConsultationRow> = {},
): WorklogConsultationRow => ({
  id,
  unitId: null,
  legacyGrade: null,
  consultedAt: "2026-09-16T09:00:00+09:00",
  contactType: "CALL",
  purpose: null,
  ...overrides,
});

const LEE = "11111111-1111-4111-8111-111111111111"; // 이승재
const SONG = "22222222-2222-4222-8222-222222222222"; // 송용석
const PARK = "33333333-3333-4333-8333-333333333333"; // 박진하

const fieldMembers: WorklogFieldMember[] = [
  { memberId: LEE, displayName: "이승재" },
  { memberId: SONG, displayName: "송용석" },
  { memberId: PARK, displayName: "박진하" },
];

describe("buildTeamActivity: 3인 담당자별 실적", () => {
  it("3인 합계는 개별 담당자 건수의 합과 일치한다", () => {
    const today = [
      event("1", { counselorId: LEE, contactType: "CALL" }),
      event("2", { counselorId: SONG, contactType: "VISIT" }),
      event("3", { counselorId: PARK, contactType: "MESSAGE" }),
    ];
    const result = buildTeamActivity(today, fieldMembers);
    expect(result.total.total).toBe(3);
    expect(result.total.total).toBe(result.rows.reduce((sum, r) => sum + r.total, 0));
  });

  it("담당자별 전화(CALL) 건수를 정확히 집계한다", () => {
    const today = [
      event("1", { counselorId: LEE, contactType: "CALL" }),
      event("2", { counselorId: LEE, contactType: "CALL" }),
      event("3", { counselorId: SONG, contactType: "CALL" }),
    ];
    const result = buildTeamActivity(today, fieldMembers);
    expect(result.rows.find(r => r.memberId === LEE)?.call).toBe(2);
    expect(result.rows.find(r => r.memberId === SONG)?.call).toBe(1);
    expect(result.total.call).toBe(3);
  });

  it("담당자별 방문(VISIT) 건수를 정확히 집계한다", () => {
    const today = [event("1", { counselorId: PARK, contactType: "VISIT" }), event("2", { counselorId: PARK, contactType: "VISIT" })];
    const result = buildTeamActivity(today, fieldMembers);
    expect(result.rows.find(r => r.memberId === PARK)?.visit).toBe(2);
    expect(result.total.visit).toBe(2);
  });

  it("담당자별 문자(MESSAGE) 건수를 정확히 집계한다", () => {
    const today = [event("1", { counselorId: SONG, contactType: "MESSAGE" }), event("2", { counselorId: LEE, contactType: "MESSAGE" })];
    const result = buildTeamActivity(today, fieldMembers);
    expect(result.rows.find(r => r.memberId === SONG)?.message).toBe(1);
    expect(result.rows.find(r => r.memberId === LEE)?.message).toBe(1);
    expect(result.total.message).toBe(2);
  });

  it("담당자가 없거나(null) 화양 명단에 없는 상담은 어떤 담당자 행에도 더해지지 않는다 (신원 미상으로 오염되지 않음)", () => {
    const today = [event("1", { counselorId: null }), event("2", { counselorId: "unknown-member-id" })];
    const result = buildTeamActivity(today, fieldMembers);
    expect(result.total.total).toBe(0);
  });
});

describe("buildGradeChangeSummary: 실제 등급 전환만 집계", () => {
  it("C → B 전환을 등급변경으로 집계한다", () => {
    const units = [unit("a")];
    const consultations = [
      event("prev", { unitId: "a", legacyGrade: "C", consultedAt: "2026-09-01T00:00:00+09:00" }),
      event("today", { unitId: "a", legacyGrade: "B", counselorId: LEE }),
    ];
    const result = buildGradeChangeSummary(units, consultations, fieldMembers, range);
    expect(result.totalChanges).toBe(1);
    expect(result.transitions).toEqual([{ from: "C", to: "B", count: 1 }]);
    expect(result.rows[0]).toMatchObject({ from: "C", to: "B", displayName: "이승재" });
  });

  it("C → A 전환을 등급변경으로 집계한다", () => {
    const units = [unit("a")];
    const consultations = [
      event("prev", { unitId: "a", legacyGrade: "C", consultedAt: "2026-09-01T00:00:00+09:00" }),
      event("today", { unitId: "a", legacyGrade: "A" }),
    ];
    const result = buildGradeChangeSummary(units, consultations, fieldMembers, range);
    expect(result.transitions).toEqual([{ from: "C", to: "A", count: 1 }]);
  });

  it("D → C 전환을 등급변경으로 집계한다", () => {
    const units = [unit("a")];
    const consultations = [
      event("prev", { unitId: "a", legacyGrade: "D", consultedAt: "2026-09-01T00:00:00+09:00" }),
      event("today", { unitId: "a", legacyGrade: "C" }),
    ];
    const result = buildGradeChangeSummary(units, consultations, fieldMembers, range);
    expect(result.transitions).toEqual([{ from: "D", to: "C", count: 1 }]);
  });

  it("동일 등급(C → C) 전환은 등급변경으로 집계하지 않는다", () => {
    const units = [unit("a")];
    const consultations = [
      event("prev", { unitId: "a", legacyGrade: "C", consultedAt: "2026-09-01T00:00:00+09:00" }),
      event("today", { unitId: "a", legacyGrade: "C" }),
    ];
    const result = buildGradeChangeSummary(units, consultations, fieldMembers, range);
    expect(result.totalChanges).toBe(0);
    expect(result.transitions).toEqual([]);
  });

  it("직전 유효 등급이 없는 첫 평가는 신규평가로 분류하고 등급변경 건수에서 제외한다", () => {
    const units = [unit("a")];
    const consultations = [event("first", { unitId: "a", legacyGrade: "C" })];
    const result = buildGradeChangeSummary(units, consultations, fieldMembers, range);
    expect(result.newEvaluations).toBe(1);
    expect(result.totalChanges).toBe(0);
    expect(result.rows).toEqual([]);
  });
});

describe("buildConsultationDetail: 금일 상담 상세", () => {
  it("금일 상담을 최신순(시간 내림차순)으로 정렬한다", () => {
    const units = [unit("a"), unit("b")];
    const consultations = [
      event("early", { unitId: "a", consultedAt: "2026-09-16T09:00:00+09:00" }),
      event("late", { unitId: "b", consultedAt: "2026-09-16T18:00:00+09:00" }),
    ];
    const result = buildConsultationDetail(units, consultations, fieldMembers, range);
    expect(result.map(r => r.consultationId)).toEqual(["late", "early"]);
  });

  it("상담에 기록된 다음접촉(nextActionAt)을 그대로 노출한다", () => {
    const units = [unit("a")];
    const consultations = [event("1", { unitId: "a", nextActionAt: "2026-09-18T10:00:00+09:00" })];
    const result = buildConsultationDetail(units, consultations, fieldMembers, range);
    expect(result[0].nextActionAt).toBe("2026-09-18T10:00:00+09:00");
  });

  it("다음접촉이 없는 상담은 null로 표시한다", () => {
    const units = [unit("a")];
    const consultations = [event("1", { unitId: "a" })];
    const result = buildConsultationDetail(units, consultations, fieldMembers, range);
    expect(result[0].nextActionAt).toBeNull();
  });
});
