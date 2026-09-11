import { CallFilters } from "@/components/move-in/call-filters";
import { CallTable } from "@/components/move-in/call-table";
import { EmptyState, QueryError } from "@/components/move-in/status-copy";
import { requireMoveInAccess } from "@/lib/move-in/access";
import {
  filterCallRows,
  type CallListFilters,
} from "@/lib/move-in/calls";
import {
  counselorDisplayName,
  isLegacyGrade,
  type LegacyGrade,
} from "@/lib/move-in/consultation";
import type {
  FundingStatus,
  MoveInStatus,
  OccupancyIntent,
} from "@/lib/move-in/labels";
import {
  FUNDING_STATUS_VALUES,
  MOVE_IN_STATUS_VALUES,
  OCCUPANCY_INTENT_VALUES,
} from "@/lib/move-in/labels";
import { loadCallRows } from "@/lib/move-in/queries";

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function parseFilters(searchParams: Record<string, string | string[] | undefined>): CallListFilters {
  const occupancyIntent = one(searchParams.occupancyIntent);
  const fundingStatus = one(searchParams.fundingStatus);
  const moveInStatus = one(searchParams.moveInStatus);
  const legacyGrade = one(searchParams.legacyGrade);

  return {
    q: one(searchParams.q),
    counselorId: one(searchParams.counselorId),
    legacyGrade: isLegacyGrade(legacyGrade) ? (legacyGrade as LegacyGrade) : "",
    occupancyIntent: OCCUPANCY_INTENT_VALUES.includes(
      occupancyIntent as OccupancyIntent,
    )
      ? (occupancyIntent as OccupancyIntent)
      : "",
    fundingStatus: FUNDING_STATUS_VALUES.includes(fundingStatus as FundingStatus)
      ? (fundingStatus as FundingStatus)
      : "",
    moveInStatus: MOVE_IN_STATUS_VALUES.includes(moveInStatus as MoveInStatus)
      ? (moveInStatus as MoveInStatus)
      : "",
    nextContactDue: one(searchParams.nextContactDue) === "1",
  };
}

export default async function MoveInCallsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { projectId } = await params;
  const access = await requireMoveInAccess(projectId);
  if (!access.ok) return null;

  const filters = parseFilters(await searchParams);
  const result = await loadCallRows(projectId);
  if (result.error) return <QueryError />;

  const rows = filterCallRows(result.rows, filters);
  const counselorIds = [
    ...new Set(
      result.rows
        .map((row) => row.assignedCounselorId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-semibold">상담·콜 관리</h1>
      <CallFilters
        projectId={projectId}
        filters={filters}
        counselors={counselorIds.map((id) => ({
          id,
          label: counselorDisplayName(id, access.memberId),
        }))}
      />
      {result.rows.length === 0 || rows.length === 0 ? (
        <EmptyState>등록된 상담 대상이 없습니다.</EmptyState>
      ) : (
        <CallTable
          projectId={projectId}
          rows={rows}
          currentMemberId={access.memberId}
        />
      )}
    </main>
  );
}
