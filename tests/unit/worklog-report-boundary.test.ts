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

it('Hwayang counselor can generate the same worklog report through the guarded RPC',async()=>{
 mocks.role='COUNSELOR';const s=snapshot();mocks.load.mockResolvedValue({error:false,snapshot:s});
 expect((await generateMoveInDailyReport({projectId:'1283e198-5043-4027-96d6-edcc7a6686c6',date:s.date})).ok).toBe(true);
 expect(mocks.rpc).toHaveBeenCalledWith('generate_report',expect.objectContaining({p_report_phase:'MOVE_IN',p_report_type:'DAILY'}));
});

describe("3인 실시간 업무일지: 저장 보고서 경계", () => {
  // 화양 라이브 화면 전용 섹션(담당자별 실적/등급변경/금일 상담 상세)과 원문 상담내용은
  // 화면에는 노출되어도 저장되는 보고서 스냅샷에는 절대 포함되면 안 된다.
  function hwayangSnapshotWithLiveSections() {
    const range = worklogDayRange("2026-09-16", "Asia/Seoul");
    return buildMoveInWorklogSnapshot(
      [{ unitId: "a", buildingNo: "105", unitType: "TYPE-X", unitNo: "1203" }],
      [],
      [{
        id: "c1", unitId: "a", legacyGrade: "A", consultedAt: "2026-09-16T09:00:00+09:00",
        contactType: "CALL", purpose: null, counselorId: "member-1", content: "고객 상담 원문 내용 (전화번호 010-0000-0000)",
      }],
      range,
      { fieldMembers: [{ memberId: "member-1", displayName: "이승재" }] },
    );
  }

  it("라이브 화면에는 담당자별 실적/등급변경/금일 상담 상세와 원문 상담내용이 채워진다", () => {
    const s = hwayangSnapshotWithLiveSections();
    expect(s.teamActivity).toBeDefined();
    expect(s.gradeChanges).toBeDefined();
    expect(s.consultationDetail?.[0]?.content).toBe("고객 상담 원문 내용 (전화번호 010-0000-0000)");
  });

  it("worklogGeneratedData()는 라이브 전용 섹션과 원문 상담내용을 포함하지 않는다", () => {
    const s = hwayangSnapshotWithLiveSections();
    const generated = worklogGeneratedData(s);
    expect(generated).not.toHaveProperty("teamActivity");
    expect(generated).not.toHaveProperty("gradeChanges");
    expect(generated).not.toHaveProperty("consultationDetail");
    expect(JSON.stringify(generated)).not.toContain("고객 상담 원문 내용");
    expect(JSON.stringify(generated)).not.toContain("010-0000-0000");
  });

  it("보고서 저장 RPC로 전달되는 데이터에도 원문 상담내용이 포함되지 않는다", async () => {
    mocks.role = "COUNSELOR";
    const s = hwayangSnapshotWithLiveSections();
    mocks.load.mockResolvedValue({ error: false, snapshot: s });
    const result = await generateMoveInDailyReport({
      projectId: "1283e198-5043-4027-96d6-edcc7a6686c6",
      date: s.date,
      expectedFingerprint: worklogSnapshotFingerprint(s),
    });
    expect(result.ok).toBe(true);
    const savedData = mocks.rpc.mock.calls.find((call) => call[0] === "generate_report")?.[1]?.p_generated_data;
    expect(JSON.stringify(savedData)).not.toContain("고객 상담 원문 내용");
    expect(JSON.stringify(savedData)).not.toContain("010-0000-0000");
  });
});
