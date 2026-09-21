/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import Page from "@/app/projects/[projectId]/move-in/worklog/page";
import { buildMoveInWorklogSnapshot } from "@/lib/worklog/snapshot";
import { worklogDayRange } from "@/lib/worklog/day-range";
import { worklogSnapshotFingerprint } from "@/lib/worklog/fingerprint";

const mocks = vi.hoisted(() => ({ role: "COUNSELOR", load: vi.fn() }));
vi.mock("@/lib/move-in/access", () => ({ requireMoveInAccess: async () => ({ ok: true, role: mocks.role }), requireProjectAdmin: (a: { role: string }) => a.role === "PROJECT_ADMIN" }));
vi.mock("@/lib/worklog/queries", () => ({ loadMoveInWorklog: mocks.load }));
vi.mock("@/components/move-in/report-generate-form", () => ({ ReportGenerateForm: (p: { expectedFingerprint: string; dateYmd: string }) => <button data-fingerprint={p.expectedFingerprint} data-date={p.dateYmd}>보고서 생성</button> }));
// 화양 프로젝트에서만 렌더되는 WorklogLiveRefresh(클라이언트 컴포넌트)가 useRouter/Supabase 브라우저 클라이언트를 사용하므로 mock한다.
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/supabase/client", () => {
  const chainable = { on: () => chainable, subscribe: () => chainable };
  return { createBrowserClient: () => ({ channel: () => chainable, removeChannel: () => {} }) };
});
const snapshot = buildMoveInWorklogSnapshot([], [], [], worklogDayRange("2026-09-16", "Asia/Seoul"));
beforeEach(() => {
  mocks.role = "COUNSELOR";
  mocks.load.mockReset().mockResolvedValue({ error: false, snapshot, refreshedAt: "2026-09-16T01:00:00Z" });
});
afterEach(cleanup);
const page = () => Page({ params: Promise.resolve({ projectId: "p" }), searchParams: Promise.resolve({ date: "2026-09-16" }) });

describe("daily worklog page access and display", () => {
  it("shows all five sections, selected date and refresh time for a counselor with no data", async () => {
    render(await page());
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("일일 업무현황");
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(5);
    expect(screen.getByText(/최종 갱신/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "보고서 생성" })).toBeNull();
    expect(mocks.load).toHaveBeenCalledWith("p", "2026-09-16");
  });
  it("gives admins the fingerprint of exactly the displayed snapshot", async () => {
    mocks.role = "PROJECT_ADMIN";
    render(await page());
    const button = screen.getByRole("button", { name: "보고서 생성" });
    expect(button.getAttribute("data-fingerprint")).toBe(worklogSnapshotFingerprint(snapshot));
    expect(button.getAttribute("data-date")).toBe(snapshot.date);
  });
  it("uses the required generic error message", async () => {
    mocks.load.mockResolvedValue({ error: true });
    render(await page());
    expect(screen.getByRole("alert").textContent).toBe("업무일지를 불러오지 못했습니다.");
    expect(screen.queryByRole("button", { name: "보고서 생성" })).toBeNull();
  });
});

it("Hwayang counselor sees the same worklog generation action",async()=>{
 render(await Page({params:Promise.resolve({projectId:"1283e198-5043-4027-96d6-edcc7a6686c6"}),searchParams:Promise.resolve({date:"2026-09-16"})}));
 expect(screen.getByRole("button",{name:"보고서 생성"})).toBeTruthy();
});
