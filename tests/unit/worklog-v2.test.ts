import { describe, expect, it } from "vitest";
import { worklogDayRange } from "@/lib/worklog/day-range";
import { buildMoveInWorklogSnapshot, worklogGeneratedData, type WorklogConsultationRow, type WorklogUnitRow } from "@/lib/worklog/snapshot";
import { buildGenerateMoveInDailyReportArgs } from "@/lib/move-in/reports";
import type { MarketRow } from "@/lib/market/select-latest";

const range = worklogDayRange("2026-09-16", "Asia/Seoul");
const unit = (unitId: string, unitType: string | null = "TYPE-X"): WorklogUnitRow => ({ unitId, buildingNo: "1", unitType });
const event = (id: string, unitId: string | null, legacyGrade: string | null = null, consultedAt = "2026-09-16T09:00:00+09:00", contactType: string | null = "CALL", purpose: string | null = null): WorklogConsultationRow => ({ id, unitId, legacyGrade, consultedAt, contactType, purpose });
const market = (marketDataId: string, collectedAt: string, overrides: Partial<MarketRow> = {}): MarketRow => ({
  marketDataId, collectedAt, projectId: "p1", dataScope: "COMPETITOR", complexName: "단지A", period: "2026-09-01", unitType: null,
  saleListingCount: 10, jeonseListingCount: 4, monthlyRentListingCount: 2, transactionCount: null, priceAvg: null, moveInDate: null, moveInUnits: null, source: null, ...overrides,
});
const build = (units: WorklogUnitRow[] = [], events: WorklogConsultationRow[] = [], marketRows: MarketRow[] = []) => buildMoveInWorklogSnapshot(units, [], events, range, { contracts: [], marketRows });

describe("daily worklog v2 sales and current legacy grade", () => {
  it("groups actual types dynamically and deduplicates unit IDs", () => {
    const s = build([unit("a"), unit("a"), unit("b", "CUSTOM-TYPE"), unit("c", null)]);
    expect(s.summary.totalUnits).toBe(3);
    expect(s.salesConsultation?.total.supply).toBe(3);
    expect(s.salesConsultation?.rows.map(r => r.unitType)).toEqual(expect.arrayContaining(["TYPE-X", "CUSTOM-TYPE", "미지정"]));
  });
  it("counts ACTIVE and COMPLETED once per unit, excluding cancelled and future contracts", () => {
    const s = buildMoveInWorklogSnapshot([unit("a"), unit("b"), unit("c"), unit("d")], [], [], range, { contracts: [
      { unitId: "a", status: "ACTIVE", contractedAt: "2026-09-01T00:00:00Z" },
      { unitId: "a", status: "COMPLETED", contractedAt: "2026-09-01T00:00:00Z" },
      { unitId: "b", status: "COMPLETED", contractedAt: "2026-09-01T00:00:00Z" },
      { unitId: "c", status: "CANCELLED", contractedAt: "2026-09-01T00:00:00Z" },
      { unitId: "d", status: "ACTIVE", contractedAt: "2026-09-17T00:00:00+09:00" },
    ] });
    expect(s.salesConsultation?.total).toMatchObject({ supply: 4, sold: 2, unsold: 2 });
  });
  it("does not fabricate sold counts when contracts were not supplied", () => {
    const s = buildMoveInWorklogSnapshot([unit("a")], [], [], range);
    expect(s.salesConsultation?.total.sold).toBeNull();
    expect(s.salesConsultation?.soldSource).toBe("UNAVAILABLE");
  });
  it("selects the latest valid grade per unit before day end, not all historical grades", () => {
    const s = build([unit("a")], [event("old", "a", "A", "2026-09-01T00:00:00Z"), event("latest", "a", "D"), event("ungraded", "a", null, "2026-09-16T12:00:00+09:00"), event("future", "a", "B", range.endIso)]);
    expect(s.salesConsultation?.total.grades).toEqual({ A: 0, B: 0, C: 0, D: 1, 부재: 0, 상담거절: 0 });
  });
  it.each(["A", "B", "C", "D", "부재", "상담거절"])("counts current %s exactly once", grade => {
    expect(build([unit("a")], [event("1", "a", grade)]).salesConsultation?.total.grades[grade as "A"]).toBe(1);
  });
  it("keeps ungraded and invalid grades unclassified even with consultations", () => {
    const s = build([unit("a"), unit("b"), unit("c")], [event("1", "a", "unknown"), event("2", "b", null), event("3", "missing", "A")]);
    expect(s.salesConsultation?.total).toMatchObject({ unclassified: 3, consulted: 0, notConsulted: 3, progressPercent: 0 });
  });
  it("calculates progress, grade ratios and absence-excluded ratios with different denominators", () => {
    const s = build([unit("a"), unit("b"), unit("c"), unit("d")], [event("1", "a", "A"), event("2", "b", "부재"), event("3", "c", "상담거절")]);
    expect(s.salesConsultation?.total.progressPercent).toBe(75);
    expect(s.salesConsultation?.gradeRatios.A).toBeCloseTo(100 / 3);
    expect(s.salesConsultation?.absenceExcludedDenominator).toBe(2);
    expect(s.salesConsultation?.absenceExcludedRatios).toMatchObject({ A: 50, 상담거절: 50, 부재: null });
  });
  it("never produces NaN or Infinity for empty or all-absence populations", () => {
    const empty = build().salesConsultation!;
    expect(empty.total.progressPercent).toBe(0);
    expect(empty.gradeRatios.A).toBe(0);
    expect(build([unit("a")], [event("1", "a", "부재")]).salesConsultation?.absenceExcludedRatios.A).toBe(0);
  });
  it("uses a deterministic ID tie-break for simultaneous grades", () => {
    const events = [event("a", "u", "A"), event("z", "u", "C")];
    expect(build([unit("u")], events).salesConsultation).toEqual(build([unit("u")], events.reverse()).salesConsultation);
    expect(build([unit("u")], events).salesConsultation?.total.grades.C).toBe(1);
  });
});

describe("daily and cumulative consultation activity", () => {
  it("uses KST [midnight,next midnight), preserving multiple events on one unit", () => {
    const s = build([unit("a")], [event("prior", "a", "A", "2026-09-15T14:59:59.999Z"), event("start", "a", "B", range.startIso), event("end-in", "a", "C", "2026-09-16T14:59:59.999Z"), event("end-out", "a", "D", range.endIso)]);
    expect(s.consultationActivity?.today.total).toBe(2);
    expect(s.consultationActivity?.cumulative.total).toBe(3);
    expect(s.salesConsultation?.total.consulted).toBe(1);
  });
  it("uses the project timezone, including a DST day", () => {
    const r = worklogDayRange("2026-03-08", "America/New_York");
    expect(r.end.getTime() - r.start.getTime()).toBe(23 * 3600000);
    const s = buildMoveInWorklogSnapshot([], [], [event("a", null, null, r.startIso), event("b", null, null, r.endIso)], r);
    expect(s.consultationActivity?.today.total).toBe(1);
  });
  it("separates CALL, VISIT and other channels without treating MESSAGE as a call", () => {
    const s = build([], [event("1", null, null), event("2", null, null, range.startIso, "VISIT"), event("3", null, null, range.startIso, "MESSAGE"), event("4", null, null, range.startIso, "CONSULTATION"), event("5", null, null, range.startIso, null)]);
    expect(s.consultationActivity?.today).toMatchObject({ call: 1, visit: 1, other: 3, total: 5 });
  });
  it.each(["성향파악", "입주안내", "잔금독촉", "매칭안내", "기타"])("maps explicit purpose %s", purpose => {
    const s = build([], [event("1", null, null, range.startIso, "CALL", purpose)]);
    expect(s.consultationActivity?.rows.find(r => r.purpose === purpose)?.today.call).toBe(1);
  });
  it("maps OUTBOUND, INBOUND and unknown purpose to 기타 without guessing", () => {
    const s = build([], ["OUTBOUND", "INBOUND", "new-purpose"].map((p, i) => event(String(i), null, null, range.startIso, "CALL", p)));
    expect(s.consultationActivity?.rows.find(r => r.purpose === "기타")?.today.call).toBe(3);
  });
});

describe("daily market snapshots", () => {
  it("chooses latest selected-day snapshot, excludes future, and compares with latest before selected day", () => {
    const s = build([], [], [market("prior", "2026-09-13T01:00:00Z"), market("morning", range.startIso), market("today", "2026-09-16T05:00:00Z", { saleListingCount: 15, jeonseListingCount: 2, monthlyRentListingCount: 3 }), market("future", range.endIso, { saleListingCount: 999 })]);
    expect(s.marketSummary?.rows[0]).toMatchObject({ current: { sale: 15, jeonse: 2, monthlyRent: 3, total: 20 }, delta: { sale: 5, jeonse: -2, monthlyRent: 1, total: 4 } });
  });
  it("shows null deltas without a previous snapshot", () => {
    const s = build([], [], [market("today", range.startIso)]);
    expect(s.marketSummary?.rows[0].delta).toEqual({ sale: null, jeonse: null, monthlyRent: null, total: null });
  });
  it("keeps missing counts unknown, not zero", () => {
    const s = build([], [], [market("today", range.startIso, { jeonseListingCount: null })]);
    expect(s.marketSummary?.rows[0].current.total).toBeNull();
  });
  it("does not sum aggregate rows with unit-type rows or mix projects and scopes", () => {
    const s = build([], [], [market("total", range.startIso), market("type", range.startIso, { unitType: "TYPE-X", saleListingCount: 100 }), market("internal", range.startIso, { dataScope: "INTERNAL" }), market("p2", range.startIso, { projectId: "p2" })]);
    expect(s.marketSummary?.rows).toHaveLength(3);
    expect(s.marketSummary?.rows.every(r => r.current.sale === 10)).toBe(true);
  });
  it("does not manufacture a total from type-only market data", () => {
    expect(build([], [], [market("type", range.startIso, { unitType: "TYPE-X" })]).marketSummary?.rows[0].current.total).toBeNull();
  });
  it("marks older carry-forward data and does not invent a daily change", () => {
    const s = build([], [], [market("old", "2026-09-10T00:00:00Z")]);
    expect(s.marketSummary?.rows[0]).toMatchObject({ carriedForward: true, delta: { total: null } });
  });
});

describe("evidence-based other activities and immutable aggregate snapshots", () => {
  it("counts recontacts from the preceding grade and contact, not the resulting grade", () => {
    const s = build([unit("a"), unit("b"), unit("c")], [event("a-prior", "a", "부재", "2026-09-01T00:00:00Z"), event("b-prior", "b", "상담거절", "2026-09-01T00:00:00Z"), event("c-prior", "c", "C", "2026-08-01T00:00:00Z"), event("a-now", "a", "A"), event("b-now", "b", "B"), event("c-now", "c", "B")]);
    expect(s.otherActivities?.automatic).toMatchObject({ absenceRecontacts: 1, refusalRecontacts: 1, staleCDRecontacts: 1 });
  });
  it("does not count a stale C/D recontact if a newer ungraded contact exists", () => {
    const s = build([unit("a")], [event("old", "a", "C", "2026-08-01T00:00:00Z"), event("recent", "a", null, "2026-09-15T00:00:00Z"), event("today", "a", "A")]);
    expect(s.otherActivities?.automatic.staleCDRecontacts).toBe(0);
  });
  it("counts visit, message and next-action settings from actual consultation rows", () => {
    const s = build([], [event("v", null, null, range.startIso, "VISIT"), { ...event("m", null, null, range.startIso, "MESSAGE"), nextActionAt: "2026-09-20T00:00:00Z" }]);
    expect(s.otherActivities?.automatic).toMatchObject({ visits: 1, messages: 1, nextContactSettings: 1 });
  });
  it("marks management and manual memo blocked instead of fabricating data", () => {
    const s = build();
    expect(s.managementTargets?.status).toBe("BLOCKED");
    expect(s.otherActivities?.manualMemo.status).toBe("BLOCKED");
  });
  it("serializes the same v2 snapshot into generated_data and detaches nested values", () => {
    const s = build([unit("a")], [event("1", "a", "A")]);
    const saved = worklogGeneratedData(s);
    expect(buildGenerateMoveInDailyReportArgs("p1", s).p_generated_data).toEqual(saved);
    s.salesConsultation!.total.grades.A = 999;
    s.summary.totalUnits = 99;
    expect(saved.salesConsultation?.total.grades.A).toBe(1);
    expect(saved.summary.totalUnits).toBe(1);
  });
  it("keeps saved snapshots unchanged after later source activity", () => {
    const events = [event("1", "a", "A")];
    const saved = worklogGeneratedData(build([unit("a")], events));
    const before = JSON.stringify(saved);
    events.push(event("2", "a", "D", "2026-09-17T00:00:00+09:00"));
    build([unit("a")], events);
    expect(JSON.stringify(saved)).toBe(before);
  });
  it("drops names, phone, address, content and financial data even when input objects carry extra fields", () => {
    const secret = { customerName: "PRIVATE_NAME", phone: "PRIVATE_PHONE", address: "PRIVATE_ADDRESS", content: "PRIVATE_CONTENT", overdueAmount: "PRIVATE_MONEY" };
    const s = build([{ ...unit("a"), ...secret }], [{ ...event("1", "a", "A"), ...secret }]);
    const data = JSON.stringify(worklogGeneratedData(s));
    for (const value of Object.values(secret)) expect(data).not.toContain(value);
    expect(data).not.toContain('"unitId"');
  });
});
