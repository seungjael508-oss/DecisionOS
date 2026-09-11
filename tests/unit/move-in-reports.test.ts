import { describe, expect, it } from "vitest";
import {
  asWorklogSnapshot,
  buildGenerateMoveInDailyReportArgs,
  canGenerateMoveInReport,
  latestMoveInReportId,
  sortMoveInReports,
  supersededVersion,
  type MoveInReportRow,
} from "@/lib/move-in/reports";
import { worklogDayRange } from "@/lib/worklog/day-range";
import {
  buildMoveInWorklogSnapshot,
  worklogGeneratedData,
} from "@/lib/worklog/snapshot";

function row(
  partial: Partial<MoveInReportRow> & Pick<MoveInReportRow, "reportId">,
): MoveInReportRow {
  return {
    reportDate: "2026-09-11",
    version: 1,
    supersedesReportId: null,
    generatedAt: "2026-09-11T01:00:00.000Z",
    generatedBy: "member-admin",
    generatedData: { date: "2026-09-11", timeZone: "Asia/Seoul", summary: { totalUnits: 1 } },
    ...partial,
  };
}

describe("move-in daily reports", () => {
  it("lets PROJECT_ADMIN generate and COUNSELOR only read", () => {
    expect(canGenerateMoveInReport("PROJECT_ADMIN")).toBe(true);
    expect(canGenerateMoveInReport("COUNSELOR")).toBe(false);
  });

  it("sorts by report date then version and marks the latest row", () => {
    const rows = [
      row({ reportId: "old", reportDate: "2026-09-10", version: 3 }),
      row({
        reportId: "v1",
        version: 1,
        generatedAt: "2026-09-11T01:00:00.000Z",
      }),
      row({
        reportId: "v2",
        version: 2,
        supersedesReportId: "v1",
        generatedAt: "2026-09-11T08:00:00.000Z",
      }),
    ];
    expect(sortMoveInReports(rows).map((item) => item.reportId)).toEqual([
      "v2",
      "v1",
      "old",
    ]);
    expect(latestMoveInReportId(rows)).toBe("v2");
    expect(supersededVersion(rows, "v1")).toBe(1);
  });

  it("builds generate_report args from the worklog snapshot without a template", () => {
    const snapshot = buildMoveInWorklogSnapshot(
      [{ unitId: "u1", buildingNo: "106", unitType: "84A" }],
      [],
      [],
      worklogDayRange("2026-09-11", "Asia/Seoul"),
    );
    const args = buildGenerateMoveInDailyReportArgs("project-1", snapshot);
    expect(args).toEqual({
      p_project_id: "project-1",
      p_report_date: "2026-09-11",
      p_report_phase: "MOVE_IN",
      p_report_type: "DAILY",
      p_generated_data: expect.objectContaining({
        date: "2026-09-11",
        summary: expect.objectContaining({ totalUnits: 1 }),
      }),
    });
    expect(args).not.toHaveProperty("p_template_id");
  });

  it("accepts worklog generated_data and rejects unrelated json", () => {
    const snapshot = buildMoveInWorklogSnapshot(
      [{ unitId: "u1", buildingNo: "106", unitType: null }],
      [],
      [],
      worklogDayRange("2026-09-11", "Asia/Seoul"),
    );
    expect(asWorklogSnapshot(worklogGeneratedData(snapshot))).not.toBeNull();
    expect(asWorklogSnapshot({ hello: "no" })).toBeNull();
  });
});
