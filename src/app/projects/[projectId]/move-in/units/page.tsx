import { UnitFilters } from "@/components/move-in/unit-filters";
import { UnitTable } from "@/components/move-in/unit-table";
import { EmptyState, QueryError } from "@/components/move-in/status-copy";
import { filterUnits, type UnitListFilters } from "@/lib/move-in/filters";
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
import { loadUnitRows } from "@/lib/move-in/queries";

function parseFilters(searchParams: {
  buildingNo?: string | string[];
  unitNo?: string | string[];
  customerName?: string | string[];
  occupancyIntent?: string | string[];
  fundingStatus?: string | string[];
  moveInStatus?: string | string[];
}): UnitListFilters {
  const one = (value: string | string[] | undefined) =>
    Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
  const occupancyIntent = one(searchParams.occupancyIntent);
  const fundingStatus = one(searchParams.fundingStatus);
  const moveInStatus = one(searchParams.moveInStatus);

  return {
    buildingNo: one(searchParams.buildingNo),
    unitNo: one(searchParams.unitNo),
    customerName: one(searchParams.customerName),
    occupancyIntent: OCCUPANCY_INTENT_VALUES.includes(
      occupancyIntent as OccupancyIntent,
    )
      ? (occupancyIntent as OccupancyIntent)
      : "",
    fundingStatus: FUNDING_STATUS_VALUES.includes(
      fundingStatus as FundingStatus,
    )
      ? (fundingStatus as FundingStatus)
      : "",
    moveInStatus: MOVE_IN_STATUS_VALUES.includes(moveInStatus as MoveInStatus)
      ? (moveInStatus as MoveInStatus)
      : "",
  };
}

export default async function MoveInUnitsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { projectId } = await params;
  const query = await searchParams;
  const filters = parseFilters(query);
  const result = await loadUnitRows(projectId);
  if (result.error) return <QueryError />;

  const rows = filterUnits(result.rows, filters);

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-semibold">동호수 관리</h1>
      <UnitFilters projectId={projectId} filters={filters} />
      {result.rows.length === 0 || rows.length === 0 ? (
        <EmptyState>등록된 동호수가 없습니다.</EmptyState>
      ) : (
        <UnitTable projectId={projectId} rows={rows} />
      )}
    </main>
  );
}
