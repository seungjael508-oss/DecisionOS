"use server";

import { canManageSpecialCase, requireMoveInAccess } from "@/lib/move-in/access";
import {
  buildSaveMoveInUnitDealArgs,
  EMPTY_UNIT_DEAL_TYPED_FIELDS,
  isConsentStatus,
  isDealStatus,
  isUnitDealListingStatus,
  type SaveMoveInUnitDealInput,
} from "@/lib/move-in/deals";
import { createServerClient } from "@/lib/supabase/server";
import { getSafeMoveInReturnTo } from "@/lib/move-in/return-to";
import {
  SPECIAL_CASE_MANUAL_FLAG_MESSAGE,
  validateSpecialCaseInput,
  type SpecialCaseMetadata,
} from "@/lib/move-in/special-case";

export type SaveMoveInSpecialCaseInput = SpecialCaseMetadata & {
  projectId: string;
  unitId: string;
  contractId: string;
  currentCustomerId: string;
  returnTo?: string | null;
};

export type SaveMoveInSpecialCaseResult =
  | { ok: true; returnTo: string }
  | { ok: false; code: "forbidden" | "stale_contract" | "manual_consistency" | "invalid_input" | "save_failed"; message?: string };

export async function saveMoveInSpecialCase(
  input: SaveMoveInSpecialCaseInput,
): Promise<SaveMoveInSpecialCaseResult> {
  const access = await requireMoveInAccess(input.projectId);
  if (!access.ok || !canManageSpecialCase(access)) {
    return { ok: false, code: "forbidden" };
  }

  const validation = validateSpecialCaseInput(input);
  if (!validation.ok) return validation;

  const supabase = await createServerClient();
  const safeReturnTo = getSafeMoveInReturnTo(input.projectId, input.returnTo);
  const { data: activeContracts, error: contractError } = await supabase
    .from("contract")
    .select("contract_id, unit_id, customer_id, contract_status")
    .eq("project_id", input.projectId)
    .eq("unit_id", input.unitId)
    .eq("contract_status", "ACTIVE");

  if (contractError || activeContracts.length !== 1) {
    return { ok: false, code: "stale_contract", message: "현재 계약자를 확인하지 못했습니다. 다시 불러온 후 시도해 주세요." };
  }
  const current = activeContracts[0];
  if (
    current.contract_id !== input.contractId ||
    current.unit_id !== input.unitId ||
    current.customer_id !== input.currentCustomerId
  ) {
    return { ok: false, code: "stale_contract", message: "현재 계약자가 변경되어 다시 확인해야 합니다." };
  }

  // The Task 2 RPC signature intentionally does not accept customer_id. The
  // server-side current-holder check above is the stale-holder boundary.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rpcClient = supabase as any;
  const { error } = await rpcClient.rpc("save_move_in_special_case", {
    p_project_id: input.projectId,
    p_unit_id: input.unitId,
    p_contract_id: input.contractId,
    p_manually_flagged: input.manuallyFlagged,
    p_visit_required: input.visitRequired,
    p_abandonment_document_received: input.abandonmentDocumentReceived,
    p_termination_document_received: input.terminationDocumentReceived,
    p_legal_consultation_required: input.legalConsultationRequired,
    p_legal_consultation_status: input.legalConsultationStatus,
    p_processing_status: input.processingStatus,
    p_memo: input.memo.trim() || null,
  });
  if (error) {
    if (error.code === "23514") {
      return { ok: false, code: "manual_consistency", message: SPECIAL_CASE_MANUAL_FLAG_MESSAGE };
    }
    return { ok: false, code: "save_failed", message: "특별관리 정보를 저장하지 못했습니다." };
  }
  return { ok: true, returnTo: safeReturnTo };
}

export async function saveMoveInUnitDeal(input: SaveMoveInUnitDealInput) {
  const access = await requireMoveInAccess(input.projectId);
  if (!access.ok) return { ok: false as const };
  if (!isConsentStatus(input.consentStatus) || !isDealStatus(input.dealStatus)) {
    return { ok: false as const };
  }
  if (!input.contractId || !input.customerId) return { ok: false as const };
  if (input.typed) {
    const amounts = [
      input.typed.askingSalePriceKrw,
      input.typed.jeonseDepositKrw,
      input.typed.monthlyRentDepositKrw,
      input.typed.monthlyRentAmountKrw,
    ];
    if (amounts.some((value) => value !== null && (!Number.isFinite(value) || value <= 0))) {
      return { ok: false as const };
    }
    const statuses = [input.typed.saleListingStatus, input.typed.jeonseListingStatus, input.typed.monthlyRentListingStatus];
    if (statuses.some((value) => value !== null && !isUnitDealListingStatus(value))) {
      return { ok: false as const };
    }
  }

  const supabase = await createServerClient();
  let saveInput = input;
  if (!input.typed) {
    const existing = await supabase.from("unit_deal")
      .select("contract_id, customer_id")
      .eq("project_id", input.projectId).eq("unit_id", input.unitId).maybeSingle();
    if (existing.error) return { ok: false as const };
    // The legacy overload preserves typed fields. A replacement contract must
    // start empty instead of reattaching the previous contract's prices/statuses.
    if (existing.data && (existing.data.contract_id !== input.contractId || existing.data.customer_id !== input.customerId)) {
      saveInput = { ...input, typed: { ...EMPTY_UNIT_DEAL_TYPED_FIELDS } };
    }
  }
  const { error } = await supabase.rpc(
    "save_move_in_unit_deal",
    buildSaveMoveInUnitDealArgs(saveInput),
  );
  if (error) return { ok: false as const };
  return { ok: true as const };
}
