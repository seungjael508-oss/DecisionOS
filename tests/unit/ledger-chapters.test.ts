import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { toLedgerSummaryRow } from "@/lib/move-in/current-unit-snapshot";
import { countLedgerChapters, matchesLedgerChapter } from "@/lib/move-in/ledger-chapters";
import { applyLedgerQuery, parseLedgerQuery, patchLedgerQuery } from "@/lib/move-in/ledger-filters";
import { createLedgerSummaryStore } from "@/components/move-in/ledger-summary-store";
import type { ContactRecord, LedgerClientRow, ProjectionResult } from "@/lib/move-in/ledger-types";

const P = "00000000-0000-4000-8000-000000000001", CUR = "10000000-0000-4000-8000-000000000001", PREV = "20000000-0000-4000-8000-000000000001";
let seq = 0;
type Consult = { min: number; tag?: string; type?: string; customer?: string };
const at = (min: number) => new Date(Date.UTC(2026, 9, 1, 0, min)).toISOString();
function row(grade: string | null, intent: string, consults: Consult[] = [], extra: { dGradeReasons?: string[] } = {}) {
  const unitId = `00000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;
  const snapshot = { projectId: P, unitId, currentContractId: "c", currentCustomerId: CUR, currentGrade: grade, funding: "NORMAL",
    specialReasons: [], effectiveIntent: intent, rentalType: null } as never;
  const unit = { project_id: P, unit_id: unitId, building_no: "101", unit_no: String(1000 + seq), unit_type: null,
    contracts: [{ project_id: P, unit_id: unitId, contract_id: "c", customer_id: CUR, contract_status: "ACTIVE", updated_at: "2026-10-01T00:00:00Z",
      holder: { id: CUR, project_id: P, name: null, phone: null, phone_quality: null, assigned_counselor_id: null } }],
    occupancy: { project_id: P, unit_id: unitId, contract_id: "c", legacy_grade: grade, last_contact_at: null, next_contact_at: null } } as never;
  const contacts: ContactRecord[] = consults.map((c, i) => ({ project_id: P, unit_id: unitId, customer_id: c.customer ?? CUR, id: `k-${seq}-${i}`,
    consulted_at: at(c.min), next_action_at: null, structured_tags: c.tag ? { legacy_grade: c.tag } : {}, content: "", contact_type: c.type ?? "CALL" }));
  return { ...toLedgerSummaryRow(unit, snapshot, null, contacts), ...(extra.dGradeReasons ? { dGradeReasons: extra.dGradeReasons } : {}) } as never as LedgerClientRow;
}
const absent3: Consult[] = [{ min: 1, tag: "B" }, { min: 2, tag: "부재" }, { min: 3, tag: "부재" }, { min: 4, tag: "부재" }];

describe("원장 행 장기 부재 횟수(현재 계약자 기준)", () => {
  it("마지막 실제 접촉 이후 전화 부재만, 방문 부재·이전 계약자 기록 제외", () => {
    expect(row("B", "UNDECIDED", absent3).absenceStreak).toBe(3);
    expect(row("B", "UNDECIDED", [...absent3, { min: 5, tag: "C" }]).absenceStreak).toBe(0);
    expect(row("B", "UNDECIDED", [{ min: 1, tag: "부재" }, { min: 2, tag: "부재", type: "VISIT" }, { min: 3, tag: "부재" }]).absenceStreak).toBe(2);
    expect(row("B", "UNDECIDED", [{ min: 1, tag: "부재", customer: PREV }, { min: 2, tag: "부재", customer: PREV }, { min: 3, tag: "부재" }]).absenceStreak).toBe(1);
  });
});

describe("입주촉진 집중관리 챕터", () => {
  const rows = [
    row("C", "UNDECIDED"),                    // C 미정
    row("C", "SALE_TRANSFER"),                // C 전매
    row("D", "UNDECIDED", [], { dGradeReasons: ["ASEL"] }), // D 미정(아셀)
    row("D", "RENT", absent3, { dGradeReasons: ["ABSENCE_STREAK"] }), // D 임대 + 장기 부재
    row("D", "MOVE_IN"),                      // D 입주 확정(어느 챕터도 아님)
    row("B", "UNDECIDED", absent3),           // B 장기 부재
    row("A", "SALE_TRANSFER"),                // A 전매(C·D 아님)
    row(null, "UNDECIDED"),
  ];
  it("챕터 판정", () => {
    expect(rows.map(r => matchesLedgerChapter(r, "c_undecided"))).toEqual([true, false, false, false, false, false, false, false]);
    expect(rows.map(r => matchesLedgerChapter(r, "d_undecided"))).toEqual([false, false, true, false, false, false, false, false]);
    expect(rows.map(r => matchesLedgerChapter(r, "cd_sale_rent"))).toEqual([false, true, false, true, false, false, false, false]);
    expect(rows.map(r => matchesLedgerChapter(r, "absence_visit"))).toEqual([false, false, false, true, false, true, false, false]);
  });
  it("세대 수: 같은 세대 중복 행은 1번만", () => {
    expect(countLedgerChapters([...rows, rows[0], rows[3]])).toEqual({ all: 8, c_undecided: 1, d_undecided: 1, cd_sale_rent: 2, absence_visit: 2 });
  });
  it("D 장기 부재 사유와 장기 부재 챕터가 같은 규칙", () => {
    for (const r of rows.filter(r => r.currentGrade === "D")) {
      expect(matchesLedgerChapter(r, "absence_visit")).toBe(r.dGradeReasons.includes("ABSENCE_STREAK"));
    }
  });

  const run = (qs: string) => applyLedgerQuery(rows, parseLedgerQuery(new URLSearchParams(qs)), new Date()).filteredSorted.map(r => r.unitId);
  it("챕터로 기존 원장 목록 필터링, 다른 필터(D등급 관리사유 포함)와 AND", () => {
    expect(run("chapter=cd_sale_rent")).toEqual([rows[1].unitId, rows[3].unitId]);
    expect(run("chapter=d_undecided&dGradeReason=ASEL")).toEqual([rows[2].unitId]);
    expect(run("chapter=d_undecided&dGradeReason=ABSENCE_STREAK")).toEqual([]);
    expect(run("chapter=absence_visit&grade=D")).toEqual([rows[3].unitId]);
    expect(run("")).toHaveLength(8);
    expect(run("chapter=bogus")).toEqual([]); // 알 수 없는 값은 다른 잘못된 조건과 같이 빈 결과(조용히 무시하지 않음)
  });
  it("챕터 전환: 다른 필터 초기화, 정렬·쪽 크기·열린 상세 유지, 1쪽으로", () => {
    const before = new URLSearchParams("grade=C&customerSearch=김&sort=grade&direction=desc&pageSize=50&page=3&selectedUnit=u1&view=special");
    const state = parseLedgerQuery(before);
    const next = patchLedgerQuery(before, { reset: true, chapter: "d_undecided", sort: state.sort, pageSize: state.pageSize, selectedUnitId: state.selectedUnitId });
    expect(Object.fromEntries(next)).toEqual({ chapter: "d_undecided", sort: "grade", direction: "desc", pageSize: "50", selectedUnit: "u1", page: "1" });
    const back = patchLedgerQuery(next, { reset: true, chapter: "all", sort: state.sort, pageSize: state.pageSize, selectedUnitId: null });
    expect(back.has("chapter")).toBe(false);
  });
});

describe("상담 저장 후 챕터 숫자·목록 갱신", () => {
  it("저장 결과 행이 store에 반영되면 챕터 숫자가 바뀐다(서버 재조회 없음)", () => {
    const store = createLedgerSummaryStore();
    const base: ProjectionResult<LedgerClientRow> = { error: false, rows: [row("B", "UNDECIDED", absent3.slice(0, 3))], anomalyCount: 0, anomalies: {},
      snapshotAsOf: at(0), queryCounts: { current: 0, contacts: 0, deals: 0, special: 0, recheck: 0 } };
    store.bind(P, base);
    const before = base.rows[0];
    expect(countLedgerChapters(store.snapshot()!.rows).absence_visit).toBe(0);
    const token = store.begin(P, before.unitId, { contractId: before.currentContractId, customerId: before.currentCustomerId })!;
    // 3회째 부재 저장 → 서버가 돌려준 행(같은 세대·같은 계약)
    const saved = { ...before, absenceStreak: 3 };
    expect(store.commit(token, saved)).toBe(true);
    expect(countLedgerChapters(store.snapshot()!.rows).absence_visit).toBe(1);
    // 다른 계약 행은 반영하지 않음(IDOR·경합 방어)
    const token2 = store.begin(P, before.unitId, { contractId: before.currentContractId, customerId: before.currentCustomerId })!;
    expect(store.commit(token2, { ...saved, currentContractId: "other", absenceStreak: 0 })).toBe(false);
    expect(countLedgerChapters(store.snapshot()!.rows).absence_visit).toBe(1);
  });
});
