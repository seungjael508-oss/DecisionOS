/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { WorklogSnapshotView } from "@/components/move-in/worklog-snapshot-view";
import { ReportList } from "@/components/move-in/report-list";
import { buildMoveInWorklogSnapshot, worklogGeneratedData } from "@/lib/worklog/snapshot";
import { worklogDayRange } from "@/lib/worklog/day-range";

vi.mock("@/lib/worklog/queries", () => ({ loadMoveInWorklog: vi.fn(() => { throw new Error("saved report must not query live sources"); }) }));
afterEach(cleanup);
const range = worklogDayRange("2026-09-16", "Asia/Seoul");
const snapshot = () => buildMoveInWorklogSnapshot([{ unitId: "u", buildingNo: "1", unitType: "UNIQUE-TYPE" }], [], [{ id: "c", unitId: "u", consultedAt: range.startIso, contactType: "MESSAGE", purpose: "입주안내", legacyGrade: "C" }], range, { contracts: [] });

describe("daily worklog v2 tables", () => {
  it("renders exactly the five field report sections in order", () => {
    render(<WorklogSnapshotView snapshot={snapshot()} />);
    expect(screen.getAllByRole("heading", { level: 2 }).map(n => n.textContent)).toEqual(["1. 분양/상담 현황", "2. 관리대상 동호 현황", "3. 상담 세부 현황", "4. 매물현황", "5. 오늘 업무 요약"]);
    expect(screen.getByText("UNIQUE-TYPE")).toBeTruthy();
    expect(screen.getByText("부재 제외시")).toBeTruthy();
    expect(screen.getByText("미분류")).toBeTruthy();
  });
  it("keeps management and market empty states independent from the consultation table", () => {
    render(<WorklogSnapshotView snapshot={snapshot()} />);
    expect(screen.getByText("관리대상 데이터 연결 대기")).toBeTruthy();
    expect(screen.getByText("매물 데이터가 없습니다.")).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "3. 상담 세부 현황" })).getByRole("table")).toBeTruthy();
  });
  it("keeps all five sections visible with no units or consultations", () => {
    render(<WorklogSnapshotView snapshot={buildMoveInWorklogSnapshot([], [], [], range)} />);
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(5);
    expect(screen.getByText("상담 데이터가 없습니다.")).toBeTruthy();
    expect(screen.getByText("공급 세대 데이터가 없습니다.")).toBeTruthy();
  });
  it("uses a generic market error without suppressing other sections", () => {
    const s = snapshot(); s.marketSummary = { status: "ERROR", rows: [] };
    render(<WorklogSnapshotView snapshot={s} />);
    expect(screen.getByText("매물현황을 불러오지 못했습니다.")).toBeTruthy();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(5);
  });
  it("shows actual message activity and does not offer unsaved memo controls", () => {
    render(<WorklogSnapshotView snapshot={snapshot()} />);
    expect(screen.getByText("문자상담")).toBeTruthy();
    expect(screen.getByText("오늘 상담 1건")).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
  });
  it("renders saved v2 generated_data without live queries", () => {
    render(<ReportList rows={[{ reportId: "r", reportDate: range.dateYmd, version: 1, supersedesReportId: null, generatedAt: range.startIso, generatedBy: "anonymous-admin", generatedData: worklogGeneratedData(snapshot()) }]} />);
    expect(screen.getByText("UNIQUE-TYPE")).toBeTruthy();
  });
  it("still renders older saved worklog snapshots without synthesizing v2 data", () => {
    const s = snapshot(); delete s.version; delete s.salesConsultation;
    render(<WorklogSnapshotView snapshot={s} />);
    expect(screen.getByText("세대/입주")).toBeTruthy();
    expect(screen.queryByText("1. 분양/상담 현황")).toBeNull();
  });
});
