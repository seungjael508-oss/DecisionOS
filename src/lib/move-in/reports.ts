import { canManageField } from "@/lib/move-in/field-access";
import type { Json } from "@/lib/supabase/types";
import type { MoveInRole } from "@/lib/move-in/access";
import {
  worklogGeneratedData,
  type MoveInWorklogSnapshot,
} from "@/lib/worklog/snapshot";

export const MOVE_IN_REPORT_PHASE = "MOVE_IN" as const;
export const MOVE_IN_DAILY_REPORT_TYPE = "DAILY" as const;

export type MoveInReportRow = {
  reportId: string;
  reportDate: string;
  version: number;
  supersedesReportId: string | null;
  generatedAt: string;
  generatedBy: string;
  generatedData: Json;
};

export function canGenerateMoveInReport(role: MoveInRole, projectId = "") {
  return canManageField(projectId, role);
}

export function sortMoveInReports(rows: MoveInReportRow[]) {
  return [...rows].sort((a, b) => {
    const date = b.reportDate.localeCompare(a.reportDate);
    if (date !== 0) return date;
    if (b.version !== a.version) return b.version - a.version;
    return b.generatedAt.localeCompare(a.generatedAt);
  });
}

export function latestMoveInReportId(rows: MoveInReportRow[]) {
  return sortMoveInReports(rows)[0]?.reportId ?? null;
}

export function supersededVersion(
  rows: MoveInReportRow[],
  supersedesReportId: string | null,
) {
  if (!supersedesReportId) return null;
  return rows.find((row) => row.reportId === supersedesReportId)?.version ?? null;
}

export function buildGenerateMoveInDailyReportArgs(
  projectId: string,
  snapshot: MoveInWorklogSnapshot,
) {
  return {
    p_project_id: projectId,
    p_report_date: snapshot.date,
    p_report_phase: MOVE_IN_REPORT_PHASE,
    p_report_type: MOVE_IN_DAILY_REPORT_TYPE,
    p_generated_data: worklogGeneratedData(snapshot) as Json,
  };
}

export function asWorklogSnapshot(data: Json): MoveInWorklogSnapshot | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const record = data as Record<string, unknown>;
  if (typeof record.date !== "string" || typeof record.timeZone !== "string") {
    return null;
  }
  const summary = record.summary;
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    return null;
  }
  if (typeof (summary as { totalUnits?: unknown }).totalUnits !== "number") {
    return null;
  }
  return data as unknown as MoveInWorklogSnapshot;
}
