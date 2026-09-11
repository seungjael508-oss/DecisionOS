/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReportGenerateForm } from "@/components/move-in/report-generate-form";
import { ReportList } from "@/components/move-in/report-list";
import type { MoveInReportRow } from "@/lib/move-in/reports";
import { worklogDayRange } from "@/lib/worklog/day-range";
import {
  buildMoveInWorklogSnapshot,
  worklogGeneratedData,
} from "@/lib/worklog/snapshot";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/app/projects/[projectId]/move-in/reports/actions", () => ({
  generateMoveInDailyReport: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

const snapshot = worklogGeneratedData(
  buildMoveInWorklogSnapshot(
    [{ unitId: "u1", buildingNo: "106", unitType: "84A" }],
    [],
    [],
    worklogDayRange("2026-09-11", "Asia/Seoul"),
  ),
);

const rows: MoveInReportRow[] = [
  {
    reportId: "v2",
    reportDate: "2026-09-11",
    version: 2,
    supersedesReportId: "v1",
    generatedAt: "2026-09-11T08:00:00.000Z",
    generatedBy: "admin",
    generatedData: snapshot,
  },
  {
    reportId: "v1",
    reportDate: "2026-09-11",
    version: 1,
    supersedesReportId: null,
    generatedAt: "2026-09-11T01:00:00.000Z",
    generatedBy: "admin",
    generatedData: snapshot,
  },
];

describe("move-in reports UI", () => {
  it("expands the latest report and shows version replacement", () => {
    render(<ReportList rows={rows} />);
    const details = document.querySelectorAll("details");
    expect(details[0]?.hasAttribute("open")).toBe(true);
    expect(details[1]?.hasAttribute("open")).toBe(false);
    expect(screen.getByText(/v1 보고서를 대체/)).toBeTruthy();
    expect(screen.getByText("최신", { exact: false })).toBeTruthy();
    expect(screen.queryByText("수정")).toBeNull();
    expect(screen.queryByText("삭제")).toBeNull();
    expect(screen.getAllByText("총 대상세대").length).toBeGreaterThan(0);
  });

  it("shows generate controls for the admin form", () => {
    render(<ReportGenerateForm projectId="p1" dateYmd="2026-09-11" />);
    expect(screen.getByRole("button", { name: "보고서 생성" })).toBeTruthy();
    expect(screen.getByLabelText("기준일")).toBeTruthy();
  });
});
