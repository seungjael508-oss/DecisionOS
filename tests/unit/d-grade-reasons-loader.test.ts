import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

type Row = Record<string, unknown>;
const tables: Record<string, Row[]> = {};
const failing = new Set<string>();
const requested: { table: string; filters: [string, string, unknown][] }[] = [];

// PostgREST 흉내: eq/in 필터만 서버에서 적용(같은 세션 RLS 범위라고 가정), 나머지는 통과
function query(table: string) {
  const filters: [string, string, unknown][] = [];
  const builder = {
    select: () => builder,
    eq: (col: string, value: unknown) => { filters.push(["eq", col, value]); return builder; },
    in: (col: string, values: unknown[]) => { filters.push(["in", col, values]); return builder; },
    order: () => builder,
    range: () => builder,
    returns: () => builder,
    then: (resolve: (v: { data: Row[] | null; error: unknown }) => unknown) => {
      requested.push({ table, filters: [...filters] });
      if (failing.has(table)) return Promise.resolve(resolve({ data: null, error: { message: "permission denied" } }));
      const data = (tables[table] ?? []).filter(r => filters.every(([op, col, v]) => op === "eq" ? r[col] === v : (v as unknown[]).includes(r[col])));
      return Promise.resolve(resolve({ data, error: null }));
    },
  };
  return builder;
}
vi.mock("@/lib/supabase/server", () => ({ createServerClient: async () => ({ from: (t: string) => query(t) }) }));

const { loadDGradeReasons } = await import("@/lib/move-in/d-grade-reasons.server");

const P = "1283e198-5043-4027-96d6-edcc7a6686c6"; // 원본 명단이 연결된 프로젝트
const OTHER = "99999999-0000-4000-8000-000000000000";
const id = (n: number, prefix = "8f000000") => `${prefix}-0000-4000-8000-${String(n).padStart(12, "0")}`;
const unit = (n: number, buildingNo: string, unitNo: string, extra: Partial<Parameters<typeof loadDGradeReasons>[1][number]> = {}) => ({
  unitId: id(n), contractId: id(n, "c0000000"), customerId: id(n, "50000000"), buildingNo, unitNo,
  currentGrade: "D", funding: "NORMAL", moveIn: "CONTACTED", ...extra,
});
const consult = (n: number, customer: string, minute: number, grade: string, project = P, type = "CALL") => ({
  id: `k-${n}-${customer.slice(-4)}-${minute}`, project_id: project, unit_id: id(n), customer_id: customer,
  consulted_at: new Date(Date.UTC(2026, 9, 1, 0, minute)).toISOString(), contact_type: type, structured_tags: { legacy_grade: grade },
});

beforeEach(() => {
  for (const k of Object.keys(tables)) delete tables[k];
  failing.clear(); requested.length = 0;
  const prevHolder = id(3, "5e000000");
  tables.contract = [
    { project_id: P, unit_id: id(1), contract_id: id(1, "c0000000") },                // 106-1101 아셀, 계약 1건
    { project_id: P, unit_id: id(2), contract_id: id(2, "c0000000") },                // 101-701 연체, 이전 계약 있음
    { project_id: P, unit_id: id(2), contract_id: id(2, "cf000000") },
    { project_id: P, unit_id: id(3), contract_id: id(3, "c0000000") },
    { project_id: P, unit_id: id(3), contract_id: id(3, "cf000000") },
    { project_id: OTHER, unit_id: id(1), contract_id: id(1, "cf000000") },             // 다른 프로젝트(필터로 제외)
  ];
  tables.consultation = [
    // u3: 이전 계약자 부재 3회 + C→D 기록, 현재 계약자는 B→D 와 부재 1회
    consult(3, prevHolder, 1, "C"), consult(3, prevHolder, 2, "D"),
    consult(3, prevHolder, 3, "부재"), consult(3, prevHolder, 4, "부재"), consult(3, prevHolder, 5, "부재"),
    consult(3, id(3, "50000000"), 10, "B"), consult(3, id(3, "50000000"), 11, "D"), consult(3, id(3, "50000000"), 12, "부재"),
    // u4: 현재 계약자 C→(자동 전환)D, 전화 부재 3회
    consult(4, id(4, "50000000"), 1, "C"), consult(4, id(4, "50000000"), 2, "부재"), consult(4, id(4, "50000000"), 3, "부재"), consult(4, id(4, "50000000"), 4, "부재"),
    // 다른 프로젝트의 같은 세대 id 기록(필터로 제외)
    consult(4, id(4, "50000000"), 9, "A", OTHER),
  ];
  tables.contract_status_history = [
    { history_id: "h1", project_id: P, unit_id: id(3), contract_id: id(3, "cf000000"), field_changed: "legacy_grade", changed_at: new Date(Date.UTC(2026, 9, 1, 0, 2)).toISOString(), previous_value: "C", new_value: "D" },
    { history_id: "h2", project_id: P, unit_id: id(4), contract_id: id(4, "c0000000"), field_changed: "legacy_grade", changed_at: new Date(Date.UTC(2026, 9, 1, 0, 4)).toISOString(), previous_value: "C", new_value: "D" },
  ];
  tables.contract.push({ project_id: P, unit_id: id(4), contract_id: id(4, "c0000000") });
});

describe("D등급 관리 사유 서버 로더", () => {
  it("현재 계약·현재 계약자 기준으로만 판정(이전 계약자·이전 계약·다른 프로젝트 혼입 없음)", async () => {
    const r = await loadDGradeReasons(P, [
      unit(1, "106", "1101"), unit(2, "101", "701"), unit(3, "102", "101"), unit(4, "102", "102"),
    ]);
    expect(r.error).toBe(false);
    expect(r.unavailable).toEqual([]);
    expect(r.byUnit.get(id(1))).toEqual(["ASEL"]);
    expect(r.byUnit.get(id(2))).toEqual([]); // 이전 계약이 있어 명단 연결 안 함
    expect(r.byUnit.get(id(3))).toEqual([]); // 이전 계약자 부재·C→D 이력 무시, 현재 계약자는 B→D
    expect(r.byUnit.get(id(4))).toEqual(["C_DOWNGRADE", "ABSENCE_STREAK"]);
  });

  it("모든 조회에 프로젝트 조건이 걸리고 D가 아니거나 식별자가 잘못된 세대는 조회하지 않음", async () => {
    const r = await loadDGradeReasons(P, [unit(5, "102", "103", { currentGrade: "C" }), { ...unit(6, "102", "104"), unitId: "not-a-uuid" }]);
    expect(r.byUnit.size).toBe(0);
    expect(requested).toEqual([]);
    await loadDGradeReasons(P, [unit(1, "106", "1101")]);
    expect(requested.length).toBe(3);
    for (const q of requested) {
      expect(q.filters).toContainEqual(["eq", "project_id", P]);
      expect(q.filters.find(f => f[0] === "in" && f[1] === "unit_id")?.[2]).toEqual([id(1)]);
    }
  });

  it("근거 조회 실패 시 해당 사유만 판정하지 않고 unavailable로 알림(추정 분류 금지)", async () => {
    failing.add("contract");
    let r = await loadDGradeReasons(P, [unit(1, "106", "1101", { moveIn: "DELAYED" }), unit(4, "102", "102")]);
    expect(r.unavailable.sort()).toEqual(["ASEL", "DELINQUENT"]);
    expect(r.byUnit.get(id(1))).toEqual(["MOVE_IN_DIFFICULTY"]);
    expect(r.byUnit.get(id(4))).toEqual(["C_DOWNGRADE", "ABSENCE_STREAK"]);
    failing.clear(); failing.add("contract_status_history");
    r = await loadDGradeReasons(P, [unit(4, "102", "102")]);
    expect(r.unavailable).toEqual(["C_DOWNGRADE"]);
    expect(r.byUnit.get(id(4))).toEqual(["ABSENCE_STREAK"]);
    failing.clear(); failing.add("consultation");
    r = await loadDGradeReasons(P, [unit(4, "102", "102")]);
    expect(r.unavailable.sort()).toEqual(["ABSENCE_STREAK", "C_DOWNGRADE"]);
    expect(r.byUnit.get(id(4))).toEqual([]);
  });

  it("다른 프로젝트에는 원본 명단을 연결하지 않음", async () => {
    tables.contract.push({ project_id: OTHER, unit_id: id(7), contract_id: id(7, "c0000000") });
    const r = await loadDGradeReasons(OTHER, [unit(7, "106", "1101")]);
    expect(r.byUnit.get(id(7))).toEqual([]);
  });
});
