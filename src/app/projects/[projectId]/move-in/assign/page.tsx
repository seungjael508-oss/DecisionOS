import { AssignBoard } from "@/components/move-in/assign-board";
import { AssignFilters } from "@/components/move-in/assign-filters";
import { AccessDenied, EmptyState, QueryError } from "@/components/move-in/status-copy";
import { requireMoveInAccess } from "@/lib/move-in/access";
import {
  counselorOptionLabel,
  filterAssignRows,
  type AssignListFilters,
} from "@/lib/move-in/assign";
import { isLegacyGrade, type LegacyGrade } from "@/lib/move-in/consultation";
import { loadActiveCounselors, loadCallRows } from "@/lib/move-in/queries";

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function parseFilters(
  searchParams: Record<string, string | string[] | undefined>,
): AssignListFilters {
  const legacyGrade = one(searchParams.legacyGrade);
  return {
    q: one(searchParams.q),
    counselorId: one(searchParams.counselorId),
    legacyGrade: isLegacyGrade(legacyGrade) ? (legacyGrade as LegacyGrade) : "",
    unassignedOnly: one(searchParams.unassignedOnly) === "1",
  };
}

export default async function MoveInAssignPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { projectId } = await params;
  const access = await requireMoveInAccess(projectId);
  if (!access.ok) return null;
  if (access.role !== "PROJECT_ADMIN") {
    return (
      <AccessDenied message="상담사 배정은 현장 관리자만 사용할 수 있습니다." />
    );
  }

  const filters = parseFilters(await searchParams);
  const [list, counselorsResult] = await Promise.all([
    loadCallRows(projectId),
    loadActiveCounselors(projectId),
  ]);
  if (list.error || counselorsResult.error) return <QueryError />;

  const counselors = counselorsResult.counselors.map((id) => ({
    id,
    label: counselorOptionLabel(id),
  }));
  const rows = filterAssignRows(list.rows, filters);

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-semibold">상담사 배정</h1>
      <AssignFilters
        projectId={projectId}
        filters={filters}
        counselors={counselors}
      />
      {list.rows.length === 0 || rows.length === 0 ? (
        <EmptyState>배정할 세대가 없습니다.</EmptyState>
      ) : (
        <AssignBoard
          projectId={projectId}
          rows={rows}
          counselors={counselors}
          currentMemberId={access.memberId}
        />
      )}
    </main>
  );
}
