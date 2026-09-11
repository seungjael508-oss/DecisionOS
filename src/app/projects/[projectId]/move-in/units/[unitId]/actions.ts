"use server";

import { buildCreateMoveInConsultationArgs } from "@/lib/move-in/consultation";
import type { CreateMoveInConsultationInput } from "@/lib/move-in/consultation";
import { requireMoveInAccess } from "@/lib/move-in/access";
import { createServerClient } from "@/lib/supabase/server";

export async function createMoveInConsultation(
  input: CreateMoveInConsultationInput,
) {
  const access = await requireMoveInAccess(input.projectId);
  if (!access.ok) {
    return { ok: false as const };
  }

  const args = buildCreateMoveInConsultationArgs(input);
  if ("error" in args) {
    return { ok: false as const };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.rpc("create_move_in_consultation", args);
  if (error) {
    return { ok: false as const };
  }
  return { ok: true as const };
}
