import type { MoveInRole } from "@/lib/move-in/access";

// 화양의 현장 기능만 공동화한다. 이 판정은 인증이 아니므로 서버에서는
// requireMoveInAccess 통과 후 사용하며 최종 데이터 경계는 RLS/RPC가 검증한다.
export const HWAYANG_SHARED_PROJECT_ID = "1283e198-5043-4027-96d6-edcc7a6686c6";

/** 활성 멤버로 확인된 호출자의 현장 관리 화면/작업 허용 여부. 관리자 권한은 승격하지 않는다. */
export function canManageField(projectId: string, role: MoveInRole) {
  return (
    role === "PROJECT_ADMIN" ||
    ((role === "COUNSELOR" || role === "CLIENT_MANAGER") && projectId === HWAYANG_SHARED_PROJECT_ID)
  );
}

/** 화양 외 프로젝트의 상담사 담당 고객 제한을 그대로 유지한다. */
export function usesAssignedCustomerScope(projectId: string, role: MoveInRole) {
  return role === "COUNSELOR" && projectId !== HWAYANG_SHARED_PROJECT_ID;
}
