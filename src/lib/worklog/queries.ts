import { createServerClient } from "@/lib/supabase/server";
import {
  isWorklogDateYmd,
  resolveWorklogTimeZone,
  todayYmd,
  worklogDayRange,
} from "@/lib/worklog/day-range";
import {
  buildMoveInWorklogSnapshot,
  type MoveInWorklogSnapshot,
} from "@/lib/worklog/snapshot";

export const WORKLOG_QUERY_TABLES = [
  "project",
  "project_unit",
  "unit_occupancy_status",
  "consultation",
] as const;

export function worklogSourceFilter(projectId: string) {
  return {
    project: { table: "project" as const, eq: { id: projectId } },
    units: { table: "project_unit" as const, eq: { project_id: projectId } },
    occupancy: {
      table: "unit_occupancy_status" as const,
      eq: { project_id: projectId },
    },
    consultations: {
      table: "consultation" as const,
      eq: { project_id: projectId },
    },
  };
}

export type WorklogLoadResult =
  | { error: true }
  | { error: false; snapshot: MoveInWorklogSnapshot };

export async function loadMoveInWorklog(
  projectId: string,
  requestedDate: string | null,
): Promise<WorklogLoadResult> {
  const supabase = await createServerClient();

  const projectResult = await supabase
    .from("project")
    .select("timezone")
    .eq("id", projectId)
    .maybeSingle();

  if (projectResult.error || !projectResult.data) {
    return { error: true };
  }

  const timeZone = resolveWorklogTimeZone(projectResult.data.timezone);
  const dateYmd =
    requestedDate && isWorklogDateYmd(requestedDate)
      ? requestedDate
      : todayYmd(timeZone);
  const range = worklogDayRange(dateYmd, timeZone);

  const [unitsResult, occupancyResult, consultationResult] = await Promise.all([
    supabase
      .from("project_unit")
      .select("unit_id, building_no, unit_type")
      .eq("project_id", projectId),
    supabase
      .from("unit_occupancy_status")
      .select(
        "unit_id, occupancy_intent, funding_status, move_in_status, balance_paid_at, actual_move_in_date, planned_move_in_date, next_contact_at",
      )
      .eq("project_id", projectId),
    supabase
      .from("consultation")
      .select("id, consulted_at, contact_type")
      .eq("project_id", projectId)
      .gte("consulted_at", range.startIso)
      .lt("consulted_at", range.endIso),
  ]);

  if (unitsResult.error || occupancyResult.error || consultationResult.error) {
    return { error: true };
  }

  const snapshot = buildMoveInWorklogSnapshot(
    (unitsResult.data ?? []).map((row) => ({
      unitId: row.unit_id,
      buildingNo: row.building_no,
      unitType: row.unit_type,
    })),
    (occupancyResult.data ?? []).map((row) => ({
      unitId: row.unit_id,
      occupancyIntent: row.occupancy_intent,
      fundingStatus: row.funding_status,
      moveInStatus: row.move_in_status,
      balancePaidAt: row.balance_paid_at,
      actualMoveInDate: row.actual_move_in_date,
      plannedMoveInDate: row.planned_move_in_date,
      nextContactAt: row.next_contact_at,
    })),
    (consultationResult.data ?? []).map((row) => ({
      id: row.id,
      consultedAt: row.consulted_at,
      contactType: row.contact_type,
    })),
    range,
  );

  return { error: false, snapshot };
}
