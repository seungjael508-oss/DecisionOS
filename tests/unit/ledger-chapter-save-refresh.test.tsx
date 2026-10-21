// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { useEffect } from "react";

const saveLedgerUnit = vi.fn();
const refreshLedgerUnit = vi.fn();
vi.mock("@/app/projects/[projectId]/move-in/ledger/save-actions", () => ({
  saveLedgerUnit: (...a: unknown[]) => saveLedgerUnit(...a), refreshLedgerUnit: (...a: unknown[]) => refreshLedgerUnit(...a),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));

import { LedgerSummaryProvider, useLedgerSummaryResult } from "@/components/move-in/ledger-summary-store";
import { UnitSaveProvider, useUnitSave } from "@/components/move-in/unit-save-context";
import { countLedgerChapters } from "@/lib/move-in/ledger-chapters";
import type { LedgerClientRow, ProjectionResult } from "@/lib/move-in/ledger-types";

const P = "00000000-0000-4000-8000-000000000001", U = "00000000-0000-4000-8000-0000000000aa";
const IDENTITY = { contractId: "c1", customerId: "k1" };
const baseRow = { projectId: P, unitId: U, currentContractId: "c1", currentCustomerId: "k1", currentGrade: "B", effectiveIntent: "UNDECIDED",
  absenceStreak: 2, buildingNo: "101", unitNo: "101", specialReasons: [], dGradeReasons: [] } as unknown as LedgerClientRow;
const initial: ProjectionResult<LedgerClientRow> = { error: false, rows: [baseRow], anomalyCount: 0, anomalies: {},
  snapshotAsOf: "2026-10-17T00:00:00Z", queryCounts: { current: 0, contacts: 0, deals: 0, special: 0, recheck: 0 } };
const workspace = { projectId: P, detail: { unitId: U }, identity: IDENTITY, capabilities: { saveEnabled: true } } as never;

function Counts() {
  const result = useLedgerSummaryResult(P, initial);
  const counts = countLedgerChapters(result.rows);
  return <p data-testid="counts">{`absence=${counts.absence_visit};c_undecided=${counts.c_undecided};grade=${result.rows[0].currentGrade}`}</p>;
}
let saveFn: ReturnType<typeof useUnitSave> = null;
function Capture({ onReady }: { onReady: (save: ReturnType<typeof useUnitSave>) => void }) {
  const save = useUnitSave();
  useEffect(() => { onReady(save); }, [save, onReady]);
  return null;
}
const keep = (save: ReturnType<typeof useUnitSave>) => { saveFn = save; };

function mount() {
  return render(<LedgerSummaryProvider><Counts /><UnitSaveProvider workspace={workspace} returnTo={`/projects/${P}/move-in/ledger`} onRefreshed={() => {}}><Capture onReady={keep} /></UnitSaveProvider></LedgerSummaryProvider>);
}
async function saveOnce() {
  let out: { ok: boolean } = { ok: false };
  await act(async () => { out = await saveFn!.save({ kind: "consultation", input: { projectId: P, unitId: U, customerId: "k1" } } as never, "stay"); });
  return out;
}
const savedRow = { ...baseRow, absenceStreak: 3 } as LedgerClientRow; // 3회째 부재 저장 후 서버 행
const okResult = (row: LedgerClientRow) => ({ ok: true, workspace: { projectId: P, detail: { unitId: U }, identity: IDENTITY, capabilities: { saveEnabled: true } }, row });
const BEFORE = "absence=0;c_undecided=0;grade=B";

afterEach(() => { cleanup(); saveLedgerUnit.mockReset(); refreshLedgerUnit.mockReset(); saveFn = null; });

describe("상담 저장 결과와 챕터 숫자", () => {
  it("저장 성공 후에만 챕터 숫자·목록 갱신", async () => {
    mount();
    expect(screen.getByTestId("counts").textContent).toBe(BEFORE);
    saveLedgerUnit.mockResolvedValue(okResult(savedRow));
    expect(await saveOnce()).toEqual({ ok: true });
    expect(screen.getByTestId("counts").textContent).toBe("absence=1;c_undecided=0;grade=B");
  });

  it.each([
    ["저장 실패(미저장)", { ok: false, code: "save_failed", committed: false }],
    ["권한 거부", { ok: false, code: "forbidden", committed: false }],
    ["계약 변경(경합)", { ok: false, code: "stale_contract", committed: false }],
    ["저장 후 최신 상태 확인 실패", { ok: false, code: "refresh_failed", committed: true }],
    ["저장 여부 불명", { ok: false, code: "save_failed", committed: "unknown" }],
  ])("%s → 챕터 숫자·목록 변경 없음", async (_label, result) => {
    mount();
    saveLedgerUnit.mockResolvedValue(result);
    expect(await saveOnce()).toEqual({ ok: false });
    expect(screen.getByTestId("counts").textContent).toBe(BEFORE);
  });

  it("응답 예외 → 변경 없음", async () => {
    mount();
    saveLedgerUnit.mockRejectedValue(new Error("network"));
    expect(await saveOnce()).toEqual({ ok: false });
    expect(screen.getByTestId("counts").textContent).toBe(BEFORE);
  });

  it("성공 응답이어도 다른 계약 행이면 반영하지 않음(IDOR·경합)", async () => {
    mount();
    saveLedgerUnit.mockResolvedValue(okResult({ ...savedRow, currentContractId: "c-other" } as LedgerClientRow));
    expect(await saveOnce()).toEqual({ ok: false });
    expect(screen.getByTestId("counts").textContent).toBe(BEFORE);
  });
});
