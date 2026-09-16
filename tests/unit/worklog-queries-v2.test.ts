import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadMoveInWorklog } from "@/lib/worklog/queries";

const state = vi.hoisted(() => ({ tables: {} as Record<string, Record<string, unknown>[]>, failed: "", requests: [] as Array<{ table: string; select: string; filters: Array<[string, string, unknown]> }> }));
vi.mock("@/lib/supabase/server", () => ({ createServerClient: async () => ({
  from(table: string) {
    const request = { table, select: "", filters: [] as Array<[string, string, unknown]> };
    state.requests.push(request);
    let from = 0, to = 499;
    const builder = {
      select(columns: string) { request.select = columns; return builder; },
      eq(column: string, value: unknown) { request.filters.push(["eq", column, value]); return builder; },
      lt(column: string, value: unknown) { request.filters.push(["lt", column, value]); return builder; },
      gte(column: string, value: unknown) { request.filters.push(["gte", column, value]); return builder; },
      order() { return builder; },
      range(a: number, b: number) { from = a; to = b; return builder; },
      maybeSingle() { return Promise.resolve({ data: { timezone: "Asia/Seoul" }, error: null }); },
      then(resolve: (value: unknown) => unknown) {
        let rows = state.tables[table] ?? [];
        for (const [operator, col, val] of request.filters) rows = rows.filter(r => operator === "eq" ? r[col] === val : operator === "lt" ? String(r[col]) < String(val) : String(r[col]) >= String(val));
        return Promise.resolve({ data: rows.slice(from, to + 1), error: state.failed === table ? { message: "PRIVATE_DB_ERROR" } : null, count: rows.length }).then(resolve);
      },
    };
    return builder;
  },
}) }));

beforeEach(() => { state.tables = {}; state.failed = ""; state.requests = []; });
describe("worklog v2 read boundaries", () => {
  it("loads every cumulative consultation page and keeps only one current grade per unit", async () => {
    state.tables.project_unit = [{ project_id: "p", unit_id: "u", building_no: "1", unit_type: "DYNAMIC" }];
    state.tables.consultation = Array.from({ length: 1201 }, (_, i) => ({ project_id: "p", id: String(i).padStart(5, "0"), unit_id: "u", consulted_at: "2026-09-01T00:00:00.000Z", contact_type: "CALL", purpose: "입주안내", structured_tags: { legacy_grade: "C", private: "NOT_COPIED" }, next_action_at: null }));
    const result = await loadMoveInWorklog("p", "2026-09-16");
    expect(result.error).toBe(false);
    if (result.error) return;
    expect(result.snapshot.consultationActivity?.cumulative.total).toBe(1201);
    expect(result.snapshot.salesConsultation?.total.grades.C).toBe(1);
    expect(JSON.stringify(result.snapshot)).not.toContain("NOT_COPIED");
  });
  it("scopes all source queries and fetches cumulative consultations with an exclusive end", async () => {
    await loadMoveInWorklog("project-scope", "2026-09-16");
    for (const r of state.requests) expect(r.filters).toContainEqual(["eq", r.table === "project" ? "id" : "project_id", "project-scope"]);
    const consultations = state.requests.filter(r => r.table === "consultation");
    expect(consultations[0].filters).toContainEqual(["lt", "consulted_at", "2026-09-16T15:00:00.000Z"]);
    expect(consultations[0].filters.some(f => f[0] === "gte")).toBe(false);
    expect(consultations[0].select).not.toMatch(/\bcontent\b|\bphone\b|\bname\b|\baddress\b/);
    expect(state.requests.some(r => r.table === "market_data")).toBe(true);
  });
  it("keeps other sections available when market loading fails", async () => {
    state.failed = "market_data";
    const result = await loadMoveInWorklog("p", "2026-09-16");
    expect(result.error).toBe(false);
    if (!result.error) expect(result.snapshot.marketSummary?.status).toBe("ERROR");
    expect(JSON.stringify(result)).not.toContain("PRIVATE_DB_ERROR");
  });
  it("does not publish partial consultation totals after a failed read", async () => {
    state.failed = "consultation";
    expect(await loadMoveInWorklog("p", "2026-09-16")).toEqual({ error: true });
  });
});
