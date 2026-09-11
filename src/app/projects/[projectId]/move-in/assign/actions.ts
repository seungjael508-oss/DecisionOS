"use server";

import { canSubmitAssignment, uniqueCustomerIds } from "@/lib/move-in/assign";
import { requireMoveInAccess, requireProjectAdmin } from "@/lib/move-in/access";
import { createServerClient } from "@/lib/supabase/server";

export async function assignMoveInCustomers(input: {
  projectId: string;
  customerIds: string[];
  assigneeProjectMemberId: string;
}) {
  const access = await requireMoveInAccess(input.projectId);
  if (!requireProjectAdmin(access)) {
    return { ok: false as const };
  }

  const customerIds = uniqueCustomerIds(input.customerIds);
  if (!canSubmitAssignment(customerIds, input.assigneeProjectMemberId)) {
    return { ok: false as const };
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("assign_move_in_customers", {
    p_project_id: input.projectId,
    p_customer_ids: customerIds,
    p_assignee_project_member_id: input.assigneeProjectMemberId,
  });
  if (error) {
    return { ok: false as const };
  }
  return { ok: true as const, assigned: data };
}
