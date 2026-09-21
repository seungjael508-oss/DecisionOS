"use server";

import { canSubmitAssignment, isValidFieldMemberDisplayName, uniqueCustomerIds } from "@/lib/move-in/assign";
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

// UI에서 "상담사 관리" 섹션을 숨기는 것만으로는 권한 검증이 되지 않으므로,
// 서버 액션에서 다시 한 번 PROJECT_ADMIN 여부를 확인한 뒤에만 RPC를 호출한다.
export async function updateMoveInFieldMemberDisplayName(input: {
  projectId: string;
  memberId: string;
  displayName: string;
}) {
  const access = await requireMoveInAccess(input.projectId);
  if (!requireProjectAdmin(access)) {
    return { ok: false as const };
  }

  if (!isValidFieldMemberDisplayName(input.displayName)) {
    return { ok: false as const };
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc(
    "update_move_in_field_member_display_name",
    {
      p_project_id: input.projectId,
      p_member_id: input.memberId,
      p_display_name: input.displayName,
    },
  );
  if (error) {
    return { ok: false as const };
  }
  return { ok: true as const, displayName: data };
}
