import { occupancyHintNeedsWrite } from "@/lib/import/occupancy-hints";
import { classifyImportRows } from "@/lib/import/classify";
import { parseImportFile } from "@/lib/import/parse";
import type {
  ClassifiedImportRow,
  ImportApplyDecision,
  ImportCatalog,
} from "@/lib/import/types";
import { requireMoveInAccess } from "@/lib/move-in/access";
import { createServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export async function loadImportCatalog(
  projectId: string,
): Promise<{ error: true } | { error: false; catalog: ImportCatalog }> {
  const supabase = await createServerClient();
  const [units, customers, contracts, occupancies] = await Promise.all([
    supabase
      .from("project_unit")
      .select("unit_id, project_id, building_no, unit_no, unit_type")
      .eq("project_id", projectId),
    supabase
      .from("customer")
      .select("id, name, phone_normalized")
      .eq("project_id", projectId),
    supabase
      .from("contract")
      .select("contract_id, unit_id, customer_id, contract_status")
      .eq("project_id", projectId),
    supabase
      .from("unit_occupancy_status")
      .select("unit_id, contract_id, occupancy_intent, funding_status, move_in_status")
      .eq("project_id", projectId),
  ]);

  if (units.error || customers.error || contracts.error || occupancies.error) {
    return { error: true };
  }

  return {
    error: false,
    catalog: {
      projectId,
      units: (units.data ?? []).map((row) => ({
        unitId: row.unit_id,
        projectId: row.project_id,
        buildingNo: row.building_no,
        unitNo: row.unit_no,
        unitType: row.unit_type,
      })),
      customers: (customers.data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        phoneNormalized: row.phone_normalized,
      })),
      contracts: (contracts.data ?? []).map((row) => ({
        contractId: row.contract_id,
        unitId: row.unit_id,
        customerId: row.customer_id,
        status: row.contract_status,
      })),
      occupancies: (occupancies.data ?? []).map((row) => ({
        unitId: row.unit_id,
        contractId: row.contract_id,
        occupancyIntent: row.occupancy_intent,
        fundingStatus: row.funding_status,
        moveInStatus: row.move_in_status,
      })),
    },
  };
}

export async function analyzeImportFile(projectId: string, file: File) {
  const access = await requireMoveInAccess(projectId);
  if (!access.ok || access.role !== "PROJECT_ADMIN") {
    return { ok: false as const, message: "가져오기 권한이 없습니다." };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const parsed = await parseImportFile(file.name, bytes, file.type);
  if (!parsed.ok) return { ok: false as const, message: parsed.message };
  const catalog = await loadImportCatalog(projectId);
  if (catalog.error) return { ok: false as const, message: "데이터를 불러오지 못했습니다." };
  const preview = classifyImportRows(
    projectId,
    parsed.rows,
    catalog.catalog,
    parsed.mapping,
  );
  return { ok: true as const, preview };
}

export type PlannedImportWrite = {
  rowNumber: number;
  rpc: "apply_move_in_import_row";
  args: Database["public"]["Functions"]["apply_move_in_import_row"]["Args"];
};

const BLOCKED_REVIEW = new Set([
  "CUSTOMER_IDENTITY",
  "MULTI_UNIT_HOLDER_CONFIRM",
  "ACTIVE_CONTRACT_CONFLICT",
]);

export function planImportWrites(
  projectId: string,
  rows: ClassifiedImportRow[],
  decisions: ImportApplyDecision[],
): PlannedImportWrite[] {
  const decisionByRow = new Map(decisions.map((item) => [item.rowNumber, item]));
  const writes: PlannedImportWrite[] = [];
  for (const row of rows) {
    if (row.status === "ERROR") continue;
    if (row.writeKind !== "apply_import_row" || row.applyMode === "NO_OP") continue;
    if (row.reasons.some((reason) => BLOCKED_REVIEW.has(reason))) continue;
    const decision = decisionByRow.get(row.rowNumber);
    if (row.reasons.includes("HOLDER_CHANGE") && decision?.holderDecision !== "confirm") {
      continue;
    }
    if (row.reasons.includes("NEW_CUSTOMER_REQUIRED") && !decision?.allowNewCustomer) {
      continue;
    }
    if (!row.unitId) continue;
    const needsNewCustomer = row.reasons.includes("NEW_CUSTOMER_REQUIRED");
    if (needsNewCustomer && (!row.holderName || !row.phoneNormalized)) continue;
    if (!needsNewCustomer && !row.excelCustomerId) continue;

    const occupancy = occupancyHintNeedsWrite(row.occupancyHint);
    writes.push({
      rowNumber: row.rowNumber,
      rpc: "apply_move_in_import_row",
      args: {
        p_project_id: projectId,
        p_unit_id: row.unitId,
        p_apply_mode: row.applyMode,
        p_existing_customer_id: row.excelCustomerId ?? undefined,
        p_new_customer_name: needsNewCustomer ? row.holderName : undefined,
        p_new_customer_phone_normalized: needsNewCustomer
          ? (row.phoneNormalized ?? undefined)
          : undefined,
        p_expected_current_contract_id: row.currentContractId ?? undefined,
        p_occupancy_intent: occupancy ? row.occupancyHint.occupancyIntent ?? undefined : undefined,
        p_funding_status: occupancy ? row.occupancyHint.fundingStatus ?? undefined : undefined,
        p_move_in_status: occupancy ? row.occupancyHint.moveInStatus ?? undefined : undefined,
        p_reason: "IMPORT",
      },
    });
  }
  return writes;
}

export async function applyImportRows(
  projectId: string,
  rows: ClassifiedImportRow[],
  decisions: ImportApplyDecision[],
) {
  const access = await requireMoveInAccess(projectId);
  if (!access.ok || access.role !== "PROJECT_ADMIN") {
    return { ok: false as const, message: "가져오기 권한이 없습니다." };
  }

  const writes = planImportWrites(projectId, rows, decisions);
  const supabase = await createServerClient();
  const writeOk = new Set<number>();
  const writeFailed = new Set<number>();

  for (const write of writes) {
    const result = await supabase.rpc("apply_move_in_import_row", write.args);
    if (result.error) writeFailed.add(write.rowNumber);
    else writeOk.add(write.rowNumber);
  }

  let applied = 0;
  let reviewRequired = 0;
  let error = 0;
  for (const row of rows) {
    if (row.status === "ERROR" || writeFailed.has(row.rowNumber)) {
      error += 1;
      continue;
    }
    if (writeOk.has(row.rowNumber) || (row.status === "READY" && row.writeKind === "none")) {
      applied += 1;
      continue;
    }
    reviewRequired += 1;
  }

  return {
    ok: true as const,
    applied,
    skipped: reviewRequired,
    failed: writeFailed.size,
    reviewRequired,
    error,
  };
}
