import { createServerClient } from "@/lib/supabase/server";
import { readAllRows } from "@/lib/supabase/read-all";
import { loadMarketRows } from "@/lib/market/queries";
import { extractLegacyGrade, confirmedLegacyVisitKey } from "@/lib/move-in/consultation";
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
  "contract",
  "market_data",
  "customer",
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
    contracts: { table: "contract" as const, eq: { project_id: projectId } },
    market: { table: "market_data" as const, eq: { project_id: projectId } },
  };
}

export type WorklogLoadResult =
  | { error: true }
  | { error: false; snapshot: MoveInWorklogSnapshot; refreshedAt: string };

export async function loadMoveInWorklog(
  projectId: string,
  requestedDate: string | null,
): Promise<WorklogLoadResult> {
  try {
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

    const [unitsResult, occupancyResult, consultationResult, contractsResult, marketResult, customersResult] = await Promise.all([
      readAllRows((from, to) => supabase
        .from("project_unit")
        .select("unit_id, building_no, unit_type", { count: "exact" })
        .eq("project_id", projectId).order("unit_id").range(from, to)),
      readAllRows((from, to) => supabase
        .from("unit_occupancy_status")
        .select(
          "unit_id, occupancy_intent, funding_status, move_in_status, balance_paid_at, actual_move_in_date, planned_move_in_date, next_contact_at",
          { count: "exact" },
        )
        .eq("project_id", projectId).order("unit_id").range(from, to)),
      readAllRows((from, to) => supabase
        .from("consultation")
        .select("id, unit_id, consulted_at, contact_type, channel, purpose, structured_tags, next_action_at", { count: "exact" })
        .eq("project_id", projectId)
        .lt("consulted_at", range.endIso).order("consulted_at").order("id").range(from, to)),
      readAllRows((from, to) => supabase.from("contract")
        .select("contract_id, unit_id, customer_id, contract_status, contracted_at", { count: "exact" })
        .eq("project_id", projectId).order("contract_id").range(from, to)),
      loadMarketRows(projectId, range.endIso).catch(() => ({ error: true as const, rows: [] })),
      readAllRows((from, to) => supabase.from("customer").select("id, phone_quality", { count: "exact" }).eq("project_id", projectId).order("id").range(from,to)),
    ]);

    if (unitsResult.error || occupancyResult.error || consultationResult.error || contractsResult.error) {
      return { error: true };
    }

    // Audited F003 visit worksheet: 29 valid events at rows 2–30.
    // Read projection: current Hwayang operations classify other legacy consultations as CALL.
    // Never infer a channel from purpose or rewrite the source.
    const unitIds = new Set(unitsResult.data.map(row => row.unit_id));
    const keyCounts = new Map<string, number>();
    for (const row of consultationResult.data) {
      const tags = row.structured_tags;
      if (tags && typeof tags === "object" && !Array.isArray(tags) && typeof tags.legacy_source_key === "string") {
        const key = tags.legacy_source_key;
        keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
      }
    }
    const projectedContactType = (row: (typeof consultationResult.data)[number]) => {
      const key = confirmedLegacyVisitKey(projectId, row.structured_tags);
      return projectId === "1283e198-5043-4027-96d6-edcc7a6686c6" &&
        row.contact_type === "CONSULTATION" && row.channel === "LEGACY_IMPORT" &&
        row.unit_id !== null && unitIds.has(row.unit_id) && key !== null && keyCounts.get(key) === 1
        ? "VISIT" : projectId === "1283e198-5043-4027-96d6-edcc7a6686c6" && row.channel === "LEGACY_IMPORT" && row.contact_type === "CONSULTATION" && row.unit_id !== null && unitIds.has(row.unit_id) ? "CALL" : row.contact_type;
    };

    const holderContracts = contractsResult.data.filter(c => c.contract_status === "ACTIVE" || c.contract_status === "COMPLETED");
    const phoneByCustomer = new Map(customersResult.data.map(c => [c.id,c.phone_quality]));
    const phonesComplete = !customersResult.error && holderContracts.every(c => phoneByCustomer.has(c.customer_id));
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
        contactType: projectedContactType(row),
        unitId: row.unit_id,
        legacyGrade: extractLegacyGrade(row.structured_tags),
        purpose: row.purpose,
        nextActionAt: row.next_action_at,
      })),
      range,
      {
        phoneQualities: phonesComplete ? holderContracts.map(c => ({unitId:c.unit_id, invalid:phoneByCustomer.get(c.customer_id) === "PHONE_INVALID"})) : undefined,
        contracts: contractsResult.data.map(row => ({ unitId: row.unit_id, status: row.contract_status, contractedAt: row.contracted_at })),
        marketRows: marketResult.rows,
        marketError: marketResult.error,
      },
    );

    return { error: false, snapshot, refreshedAt: new Date().toISOString() };
  } catch {
    return { error: true };
  }
}
