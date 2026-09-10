import { createServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export type MoveInRole = Extract<
  Database["public"]["Enums"]["project_member_role"],
  "COUNSELOR" | "PROJECT_ADMIN"
>;

export type MoveInAccess =
  | {
      ok: true;
      projectId: string;
      projectName: string;
      role: MoveInRole;
      memberId: string;
      userId: string;
    }
  | { ok: false; kind: "unauthenticated" | "forbidden" | "unavailable" };

export async function requireMoveInAccess(
  projectId: string,
): Promise<MoveInAccess> {
  const supabase = await createServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return { ok: false, kind: "unauthenticated" };
  }

  const { data: membership, error: memberError } = await supabase
    .from("project_member")
    .select("id, role, active")
    .eq("project_id", projectId)
    .eq("user_id", userData.user.id)
    .eq("active", true)
    .maybeSingle();

  if (memberError) {
    return { ok: false, kind: "unavailable" };
  }

  if (
    !membership ||
    (membership.role !== "COUNSELOR" && membership.role !== "PROJECT_ADMIN")
  ) {
    return { ok: false, kind: "forbidden" };
  }

  const { data: project, error: projectError } = await supabase
    .from("project")
    .select("id, name")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) {
    return { ok: false, kind: "unavailable" };
  }

  if (!project) {
    return { ok: false, kind: "forbidden" };
  }

  return {
    ok: true,
    projectId: project.id,
    projectName: project.name,
    role: membership.role,
    memberId: membership.id,
    userId: userData.user.id,
  };
}

export function accessMessage(kind: Exclude<MoveInAccess, { ok: true }>["kind"]) {
  if (kind === "unauthenticated") return "로그인이 필요합니다.";
  if (kind === "forbidden") return "이 프로젝트에 접근할 권한이 없습니다.";
  return "데이터를 불러오지 못했습니다.";
}

export function requireProjectAdmin(
  access: MoveInAccess,
): access is Extract<MoveInAccess, { ok: true; role: "PROJECT_ADMIN" }> {
  return access.ok && access.role === "PROJECT_ADMIN";
}
