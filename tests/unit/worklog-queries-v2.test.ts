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

it("does not silently drop null contract dates or exclude phone-invalid holders", async () => {
 state.tables.project_unit=[{project_id:"p",unit_id:"u",building_no:"1",unit_type:"TYPE"}];
 state.tables.contract=[{project_id:"p",contract_id:"c",unit_id:"u",customer_id:"customer",contract_status:"ACTIVE",contracted_at:null}];
 state.tables.customer=[{project_id:"p",id:"customer",phone_quality:"PHONE_INVALID"}];
 const result=await loadMoveInWorklog("p","2026-09-17");
 expect(result.error).toBe(false);
 if(!result.error){expect(result.snapshot.salesConsultation?.total).toMatchObject({supply:1,sold:null,unsold:null});expect(result.snapshot.sourceReadiness?.phoneInvalid).toBe(1);}
});

it('maps only the audited Hwayang visit source in the read projection without writes or purpose inference',async()=>{
 const project='1283e198-5043-4027-96d6-edcc7a6686c6';
 state.tables.project_unit=[{project_id:project,unit_id:'u',building_no:'1',unit_type:'SYNTHETIC'}];
 const tags={legacy_source:'hwayang_legacy',legacy_file_id:'F003',legacy_sheet_index:4,legacy_row_number:2,legacy_source_key:'hwayang-260915:F003:4:2'};
 state.tables.consultation=Array.from({length:71},(_,i)=>({project_id:project,id:String(i),unit_id:'u',consulted_at:'2026-09-10T01:00:00Z',contact_type:'CONSULTATION',channel:'LEGACY_IMPORT',purpose:'성향파악',structured_tags:i===0?tags:null,next_action_at:null}));
 const before=JSON.stringify(state.tables.consultation);
 const result=await loadMoveInWorklog(project,'2026-09-10');
 expect(result.error).toBe(false);
 if(!result.error)expect(result.snapshot.consultationActivity?.today).toMatchObject({total:71,call:0,visit:1,message:0,unknown:70});
 expect(JSON.stringify(state.tables.consultation)).toBe(before);
 state.tables.consultation[0].structured_tags={...tags,legacy_source_key:'hwayang-260915:F003:4:999'};
 const mismatch=await loadMoveInWorklog(project,'2026-09-10');
 if(!mismatch.error)expect(mismatch.snapshot.consultationActivity?.today.visit).toBe(0);
});

it('fails closed for duplicate visit provenance and preserves explicit channels',async()=>{
 const project='1283e198-5043-4027-96d6-edcc7a6686c6';
 state.tables.project_unit=[{project_id:project,unit_id:'u',building_no:'1',unit_type:'SYNTHETIC'}];
 const tags={legacy_source:'hwayang_legacy',legacy_file_id:'F003',legacy_sheet_index:4,legacy_row_number:2,legacy_source_key:'hwayang-260915:F003:4:2'};
 const event={project_id:project,unit_id:'u',consulted_at:'2026-09-10T01:00:00Z',contact_type:'CONSULTATION',channel:'LEGACY_IMPORT',purpose:'입주안내',structured_tags:tags,next_action_at:null};
 state.tables.consultation=[{...event,id:'a'},{...event,id:'b'}];
 const duplicate=await loadMoveInWorklog(project,'2026-09-10');
 expect(duplicate.error).toBe(false);
 if(!duplicate.error)expect(duplicate.snapshot.consultationActivity?.today).toMatchObject({total:2,visit:0,unknown:2});
 state.tables.consultation=[{...event,id:'a',contact_type:'CALL'}];
 const explicit=await loadMoveInWorklog(project,'2026-09-10');
 expect(explicit.error).toBe(false);
 if(!explicit.error)expect(explicit.snapshot.consultationActivity?.today).toMatchObject({total:1,call:1,visit:0});
 state.tables.consultation=[{...event,id:'a',project_id:'another-project'}];
 state.tables.project_unit=[{project_id:'another-project',unit_id:'u',building_no:'1',unit_type:'SYNTHETIC'}];
 const other=await loadMoveInWorklog('another-project','2026-09-10');
 expect(other.error).toBe(false);
 if(!other.error)expect(other.snapshot.consultationActivity?.today).toMatchObject({total:1,visit:0,unknown:1});
});
