"use server";

import { buildCreateMoveInConsultationArgs } from "@/lib/move-in/consultation";
import type { CreateMoveInConsultationInput } from "@/lib/move-in/consultation";
import { requireMoveInAccess } from "@/lib/move-in/access";
import {
  buildMoveInUnitDetailHref,
  getMoveInReturnContext,
  getSafeMoveInReturnTo,
  resolveNextMoveInUnitId,
  withMoveInReturnNotice,
} from "@/lib/move-in/return-to";
import { loadUnitRows } from "@/lib/move-in/queries";
import { createServerClient } from "@/lib/supabase/server";

type CreateMoveInConsultationResult =
  | { ok: false }
  | {
      ok: true;
      returnTo: string;
      destination: string;
      lastInContext: boolean;
    };

export async function createMoveInConsultation(
  input: CreateMoveInConsultationInput & {
    returnTo?: string;
    afterSave?: "list" | "next";
  },
): Promise<CreateMoveInConsultationResult> {
  const access = await requireMoveInAccess(input.projectId);
  if (!access.ok) {
    return { ok: false as const };
  }

  const args = buildCreateMoveInConsultationArgs(input);
  if ("error" in args) {
    return { ok: false as const };
  }

  const returnContext = getMoveInReturnContext(input.projectId, input.returnTo);
  let nextUnitId: string | null = null;
  if (input.afterSave === "next") {
    // Resolve from the same server-authorized projection that powers the list
    // before mutating. A grade/status change in this consultation must not
    // move the operator to an unrelated row after a successful save.
    const rows = await loadUnitRows(input.projectId);
    if (rows.error) return { ok: false as const };
    nextUnitId = resolveNextMoveInUnitId(
      rows.rows,
      input.unitId,
      returnContext,
    );
  }

  const supabase = await createServerClient();
  const { error } = await supabase.rpc("create_move_in_consultation", args);
  if (error) {
    return { ok: false as const };
  }

  if (input.afterSave === "next") {
    const destination = nextUnitId
      ? buildMoveInUnitDetailHref(input.projectId, nextUnitId, returnContext.returnTo)
      : withMoveInReturnNotice(returnContext.returnTo, "last");
    return {
      ok: true as const,
      returnTo: returnContext.returnTo,
      destination,
      lastInContext: nextUnitId === null,
    };
  }

  const returnTo = getSafeMoveInReturnTo(input.projectId, input.returnTo);
  return {
    ok: true as const,
    returnTo,
    destination: returnTo,
    lastInContext: false,
  };
}
