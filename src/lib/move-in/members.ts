// PROJECT_ADMIN 전용 "사용자 관리" 화면(초대/목록)의 순수 검증 로직.
// DB에서도 invite_project_member RPC가 동일한 규칙(표시이름 2-30자, 초대 가능 역할)을
// 다시 검증하므로, 여기 있는 함수들은 UI/서버 액션에서의 빠른 실패용이다.
import type { Database } from "@/lib/supabase/types";

export type ProjectMemberRow = {
  memberId: string;
  userId: string;
  displayName: string | null;
  email: string;
  role: Database["public"]["Enums"]["project_member_role"];
  active: boolean;
  createdAt: string;
};

// 이 화면에서 부여할 수 있는 역할은 상담사/시행사 관리자뿐이다.
// PROJECT_ADMIN은 여기서 절대 선택지에 넣지 않는다(승격 경로 자체를 UI에서도 없앤다).
export const INVITABLE_ROLES = ["COUNSELOR", "CLIENT_MANAGER"] as const;
export type InvitableRole = (typeof INVITABLE_ROLES)[number];

export const INVITABLE_ROLE_LABEL: Record<InvitableRole, string> = {
  COUNSELOR: "상담사",
  CLIENT_MANAGER: "시행사 관리자",
};

export function isInvitableRole(value: string): value is InvitableRole {
  return (INVITABLE_ROLES as readonly string[]).includes(value);
}

export function isValidMemberDisplayName(value: string) {
  const trimmed = value.trim();
  return trimmed.length >= 2 && trimmed.length <= 30;
}

// RFC 5322 전체를 검증하지 않는다. 초대 전 형식만 걸러내고, 실제 존재 여부는
// Supabase Auth Admin API 호출 결과로 판단한다.
export function isValidEmail(value: string) {
  const trimmed = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}
