"use server";

import { requireMoveInAccess } from "@/lib/move-in/access";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isInvitableRole, isValidEmail, isValidMemberDisplayName } from "@/lib/move-in/members";

type InviteProjectMemberResult =
  | { ok: true; memberId: string }
  | { ok: false; reason: "forbidden" | "invalid_input" | "invite_failed" | "duplicate_member" | "unavailable" };

// PROJECT_ADMIN이 이름+이메일+역할을 입력해 새 프로젝트 사용자를 초대한다.
// 1) Auth Admin API로 초대(또는 이미 있는 계정 재사용)만 먼저 확정하고,
// 2) 그 user_id가 실제로 존재할 때만 project_member RPC를 호출한다.
// 이 순서를 뒤집지 않아야 "초대 실패 시 project_member orphan 생성 금지"가 지켜진다.
export async function inviteProjectMember(input: {
  projectId: string;
  displayName: string;
  email: string;
  role: string;
}): Promise<InviteProjectMemberResult> {
  const access = await requireMoveInAccess(input.projectId);
  if (!access.ok || access.role !== "PROJECT_ADMIN") {
    return { ok: false, reason: "forbidden" };
  }

  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim();
  if (!isValidEmail(email) || !isValidMemberDisplayName(displayName) || !isInvitableRole(input.role)) {
    return { ok: false, reason: "invalid_input" };
  }

  const userId = await resolveInvitedUserId(email, displayName);
  if (!userId) {
    return { ok: false, reason: "invite_failed" };
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("invite_project_member", {
    p_project_id: input.projectId,
    p_user_id: userId,
    p_role: input.role,
    p_display_name: displayName,
  });

  if (error) {
    // project_member(project_id, user_id) unique 위반은 postgres 23505.
    if (error.code === "23505") return { ok: false, reason: "duplicate_member" };
    return { ok: false, reason: "unavailable" };
  }

  return { ok: true, memberId: data };
}

// 이미 가입된 이메일이면 새 Auth user를 만들지 않고 기존 user_id를 그대로 쓴다.
// inviteUserByEmail을 먼저 시도하고, "이미 존재" 에러일 때만 이메일로 재조회한다
// (listUsers는 이메일 필터가 없어 매번 스캔하면 비효율적이라 실패 시에만 폴백한다).
async function resolveInvitedUserId(email: string, displayName: string): Promise<string | null> {
  const admin = createAdminClient();

  const invited = await admin.auth.admin.inviteUserByEmail(email, {
    data: { display_name: displayName },
    redirectTo: "https://stayj.co.kr/auth/confirm",
  });
  if (!invited.error) {
    return invited.data.user?.id ?? null;
  }
  if (!isAlreadyRegisteredError(invited.error)) {
    return null;
  }
  return findExistingUserIdByEmail(admin, email);
}

function isAlreadyRegisteredError(error: { code?: string; status?: number; message?: string }) {
  if (error.code === "email_exists" || error.code === "user_already_exists") return true;
  // GoTrue 버전에 따라 code가 없을 수 있어 상태코드+메시지로도 한 번 더 판별한다.
  return error.status === 422 && /already registered|already exists/i.test(error.message ?? "");
}

// listUsers()는 서버 필터를 지원하지 않으므로 페이지 단위로 스캔해 이메일이 일치하는 user를 찾는다.
// 관리자가 소수 인원을 직접 입력하는 흐름이라 빈도가 낮고, perPage를 크게 잡아 왕복을 줄인다.
async function findExistingUserIdByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
): Promise<string | null> {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return null;
    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match.id;
    if (data.users.length < 1000) return null;
  }
  return null;
}
