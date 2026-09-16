import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateMoveInDailyReport } from "@/app/projects/[projectId]/move-in/reports/actions";
import { buildMoveInWorklogSnapshot, worklogGeneratedData } from "@/lib/worklog/snapshot";
import { worklogDayRange } from "@/lib/worklog/day-range";
import { worklogSnapshotFingerprint } from "@/lib/worklog/fingerprint";

const mocks = vi.hoisted(() => ({ role: "PROJECT_ADMIN", load: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/move-in/access", () => ({ requireMoveInAccess: async () => ({ ok: true, role: mocks.role }), requireProjectAdmin: (a: { role: string }) => a.role === "PROJECT_ADMIN" }));
vi.mock("@/lib/worklog/queries", () => ({ loadMoveInWorklog: mocks.load }));
vi.mock("@/lib/supabase/server", () => ({ createServerClient: async () => ({ rpc: mocks.rpc }) }));
const snapshot = () => buildMoveInWorklogSnapshot([], [], [], worklogDayRange("2026-09-16", "Asia/Seoul"));
beforeEach(() => { mocks.role = "PROJECT_ADMIN"; mocks.load.mockReset(); mocks.rpc.mockReset(); mocks.rpc.mockResolvedValue({ error: null }); });
describe("existing generate_report snapshot boundary", () => {
  it("passes the same displayed generated_data to the existing RPC", async () => {
    const s = snapshot(); mocks.load.mockResolvedValue({ error: false, snapshot: s });
    const result = await generateMoveInDailyReport({ projectId: "p", date: s.date, expectedFingerprint: worklogSnapshotFingerprint(s) });
    expect(result.ok).toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith("generate_report", expect.objectContaining({ p_generated_data: worklogGeneratedData(s) }));
  });
  it("does not save changed data when the displayed snapshot is stale", async () => {
    const shown = snapshot(), current = snapshot(); current.summary.totalUnits = 1;
    mocks.load.mockResolvedValue({ error: false, snapshot: current });
    const result = await generateMoveInDailyReport({ projectId: "p", date: shown.date, expectedFingerprint: worklogSnapshotFingerprint(shown) });
    expect(result).toMatchObject({ ok: false, reason: "STALE_SNAPSHOT" });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("denies COUNSELOR before any source read or RPC", async () => {
    mocks.role = "COUNSELOR";
    expect((await generateMoveInDailyReport({ projectId: "p", date: "2026-09-16" })).ok).toBe(false);
    expect(mocks.load).not.toHaveBeenCalled(); expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("does not expose raw errors", async () => {
    mocks.load.mockResolvedValue({ error: false, snapshot: snapshot() });
    mocks.rpc.mockResolvedValue({ error: { message: "PRIVATE_DB_ERROR" } });
    expect(await generateMoveInDailyReport({ projectId: "p", date: "2026-09-16" })).toEqual({ ok: false });
  });
});
