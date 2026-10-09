import { AssignListClient } from "@/components/move-in/assign-list-client";
import { FieldMemberNameEditor } from "@/components/move-in/field-member-name-editor";
import { AccessDenied, QueryError } from "@/components/move-in/status-copy";
import { canManageAssignments, requireMoveInAccess } from "@/lib/move-in/access";
import { fieldMemberLabel } from "@/lib/move-in/assign";
import { loadActiveCounselors, loadCallRows, loadFieldMemberNames } from "@/lib/move-in/queries";

export default async function MoveInAssignPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const access = await requireMoveInAccess(projectId);
  if (!access.ok) return null;
  if (!canManageAssignments(access)) {
    return (
      <AccessDenied message="상담사 배정은 현장 관리자만 사용할 수 있습니다." />
    );
  }

  const [list, counselorsResult, fieldMembersResult] = await Promise.all([
    loadCallRows(projectId),
    loadActiveCounselors(projectId),
    loadFieldMemberNames(projectId),
  ]);
  if (list.error || counselorsResult.error || fieldMembersResult.error) {
    return <QueryError />;
  }

  // display_name은 list_move_in_field_members(화양 전용 RPC)로만 채워진다.
  // 다른 프로젝트는 항상 빈 목록이 돌아오므로 "이름 미등록"으로 대체된다.
  const fieldMembers = fieldMembersResult.members;
  const nameByMemberId = new Map(fieldMembers.map((member) => [member.memberId, member.displayName]));
  const counselors = counselorsResult.counselors.map((id) => ({
    id,
    label: fieldMemberLabel(nameByMemberId.get(id)),
  }));

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-semibold">상담사 배정</h1>
      <FieldMemberNameEditor projectId={projectId} members={fieldMembers} />
      <AssignListClient projectId={projectId} rows={list.rows} counselors={counselors} />
    </main>
  );
}
