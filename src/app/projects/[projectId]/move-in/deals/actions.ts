"use server";

import { requireMoveInAccess } from "@/lib/move-in/access";
import {
  buildSaveMoveInUnitDealArgs,
  isConsentStatus,
  isDealStatus,
  type SaveMoveInUnitDealInput,
} from "@/lib/move-in/deals";
import { createServerClient } from "@/lib/supabase/server";

export async function saveMoveInUnitDeal(input: SaveMoveInUnitDealInput) {
  const access = await requireMoveInAccess(input.projectId);
  if (!access.ok) return { ok: false as const };
  if (!isConsentStatus(input.consentStatus) || !isDealStatus(input.dealStatus)) {
    return { ok: false as const };
  }
  if (!input.contractId || !input.customerId) return { ok: false as const };

  const supabase = await createServerClient();
  const { error } = await supabase.rpc(
    "save_move_in_unit_deal",
    buildSaveMoveInUnitDealArgs(input),
  );
  if (error) return { ok: false as const };
  return { ok: true as const };
}
