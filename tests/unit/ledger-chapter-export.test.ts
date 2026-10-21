import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

const loadLedgerWorkspace = vi.fn();
const buildLedgerWorkbook = vi.fn(async (rows: string[][]) => `xlsx:${rows.length}`);
vi.mock("@/lib/move-in/ledger-workspace.server", () => ({ loadLedgerWorkspace: (...args: unknown[]) => loadLedgerWorkspace(...args) }));
vi.mock("@/lib/move-in/ledger-export", () => ({ buildLedgerWorkbook: (rows: string[][]) => buildLedgerWorkbook(rows) }));

const { prepareLedgerPrint, exportLedgerXlsx } = await import("@/app/projects/[projectId]/move-in/ledger/actions");

const P = "00000000-0000-4000-8000-000000000001";
let seq = 0;
const row = (currentGrade: string | null, effectiveIntent: string, absenceStreak = 0) => ({
  projectId: P, unitId: `u${++seq}`, buildingNo: "101", unitNo: String(100 + seq), currentGrade, effectiveIntent, absenceStreak,
  customerName: null, phone: null, assigneeId: null, rentalType: null, funding: "NORMAL", moveIn: "CONTACTED", nextContact: null,
  specialReasons: [], specialPriority: null, dealTypes: [], payment: "UNREGISTERED", balance: null, views: [], dGradeReasons: [],
  contactStatus: "NONE", lastContact: null, lastAttempt: null, contractAddress: null, management: undefined,
});
const rows = [row("C", "UNDECIDED"), row("D", "UNDECIDED"), row("D", "RENT", 4), row("B", "UNDECIDED", 3), row("D", "UNDECIDED")];

beforeEach(() => {
  loadLedgerWorkspace.mockReset(); buildLedgerWorkbook.mockClear();
  loadLedgerWorkspace.mockResolvedValue({ ok: true, result: { rows, snapshotAsOf: "2026-10-17T00:00:00Z" }, assignees: {} });
});

describe("인쇄·엑셀: 챕터 조건과 서버 권한 검증 유지", () => {
  it("인쇄: 서버가 권한 검증 후 읽은 행에 챕터 조건 적용", async () => {
    const r = await prepareLedgerPrint(P, "chapter=d_undecided");
    expect(loadLedgerWorkspace).toHaveBeenCalledWith(P);
    expect(r.ok && r.rows.map(cells => cells[0])).toEqual(["101동 102호", "101동 105호"]);
  });

  it("엑셀: 같은 챕터 조건(장기 부재 3회+), 다른 필터와 AND", async () => {
    let r = await exportLedgerXlsx(P, "chapter=absence_visit");
    expect(r).toMatchObject({ ok: true, base64: "xlsx:2" });
    r = await exportLedgerXlsx(P, "chapter=absence_visit&grade=D");
    expect(r).toMatchObject({ ok: true, base64: "xlsx:1" });
  });

  it("권한 검증 실패 시 행을 내보내지 않음", async () => {
    loadLedgerWorkspace.mockResolvedValue({ ok: false, error: "출력 권한을 확인할 수 없습니다." });
    expect(await prepareLedgerPrint(P, "chapter=d_undecided")).toEqual({ ok: false, error: "출력 권한을 확인할 수 없습니다." });
    expect(await exportLedgerXlsx(P, "chapter=d_undecided")).toEqual({ ok: false, error: "출력 권한을 확인할 수 없습니다." });
    expect(buildLedgerWorkbook).not.toHaveBeenCalled();
  });

  it("알 수 없는 챕터 값은 조회 전에 거부(조용히 전체 출력하지 않음)", async () => {
    const r = await prepareLedgerPrint(P, "chapter=everything");
    expect(r.ok).toBe(false);
    expect(loadLedgerWorkspace).not.toHaveBeenCalled();
  });
});
