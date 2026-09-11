"use server";

import { requireMoveInAccess, requireProjectAdmin } from "@/lib/move-in/access";
import {
  isBrokerageContactRole,
  type SaveBrokerageOfficeInput,
} from "@/lib/move-in/brokerages";
import { createServerClient } from "@/lib/supabase/server";

export async function saveBrokerageOffice(input: SaveBrokerageOfficeInput) {
  const access = await requireMoveInAccess(input.projectId);
  if (!requireProjectAdmin(access)) return { ok: false as const };
  if (!input.name.trim()) return { ok: false as const };

  const contacts = input.contacts.filter(
    (item) => isBrokerageContactRole(item.role) && item.name.trim(),
  );

  const supabase = await createServerClient();
  const { error } = await supabase.rpc("save_brokerage_office", {
    p_project_id: input.projectId,
    p_office_id: input.officeId || undefined,
    p_name: input.name,
    p_address: input.address || undefined,
    p_main_phone: input.mainPhone || undefined,
    p_active: input.active,
    p_contacts: contacts.map((item) => ({
      role: item.role,
      name: item.name.trim(),
      phone: item.phone.trim() || null,
    })),
  });
  if (error) return { ok: false as const };
  return { ok: true as const };
}
