/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ReportGenerateForm } from "@/components/move-in/report-generate-form";
const mocks = vi.hoisted(() => ({ generate: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/app/projects/[projectId]/move-in/reports/actions", () => ({ generateMoveInDailyReport: mocks.generate }));
beforeEach(() => { mocks.generate.mockReset(); mocks.refresh.mockReset(); });
afterEach(cleanup);
function submit() {
  render(<ReportGenerateForm projectId="p" dateYmd="2026-09-16" expectedFingerprint="shown" />);
  fireEvent.submit(screen.getByRole("form", { name: "일일 보고서 생성" }));
}
describe("displayed daily snapshot generation", () => {
  it("locks the preview date and sends the fingerprint", async () => {
    mocks.generate.mockResolvedValue({ ok: true }); submit();
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("보고서를 생성했습니다."));
    expect((screen.getByLabelText("기준일") as HTMLInputElement).readOnly).toBe(true);
    expect(mocks.generate).toHaveBeenCalledWith({ projectId: "p", date: "2026-09-16", expectedFingerprint: "shown" });
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });
  it("asks for refreshed review when source data changed", async () => {
    mocks.generate.mockResolvedValue({ ok: false, reason: "STALE_SNAPSHOT" }); submit();
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("집계 데이터가 변경되었습니다"));
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it("clears pending state and hides raw transport errors", async () => {
    mocks.generate.mockRejectedValue(new Error("PRIVATE_ERROR")); submit();
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("보고서를 만들지 못했습니다."));
    expect((screen.getByRole("button", { name: "보고서 생성" }) as HTMLButtonElement).disabled).toBe(false);
  });
});
