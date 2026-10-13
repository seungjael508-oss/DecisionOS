import { UnitListClient } from "@/components/move-in/unit-list-client";
import { QueryError } from "@/components/move-in/status-copy";
import { parseOperationalIntentFilter, type UnitListFilters } from "@/lib/move-in/filters";
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
import { buildMoveInPathWithSearch } from "@/lib/move-in/return-to";

function parseFilters(searchParams: {
  buildingNo?: string | string[];
  unitNo?: string | string[];
  customerName?: string | string[];
  customerPhone?: string | string[];
  grade?: string | string[];
  occupancyIntent?: string | string[];
  fundingStatus?: string | string[];
  moveInStatus?: string | string[];
  intent?: string | string[];
  sort?: string | string[];
  direction?: string | string[];
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
    customerPhone: one(searchParams.customerPhone),
    grade: ["A", "B", "C", "D", "부재", "상담거절"].includes(one(searchParams.grade))
      ? (one(searchParams.grade) as UnitListFilters["grade"])
      : "",
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
    operationalIntent: parseOperationalIntentFilter(one(searchParams.intent)),
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
  const one = (value: string | string[] | undefined) =>
    Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
  const initialSortKey = (["unit", "name", "grade"] as const).includes(one(query.sort) as "unit" | "name" | "grade")
    ? (one(query.sort) as "unit" | "name" | "grade")
    : "unit";
  const initialSortDirection = one(query.direction) === "desc" ? "desc" : "asc";
  const lastInContext = one(query.moveInNotice) === "last";
  const initialReturnTo = buildMoveInPathWithSearch(
    `/projects/${projectId}/move-in/units`,
    query,
    ["moveInNotice"],
  );
  const result = await loadUnitRows(projectId);
  if (result.error) return <QueryError />;


  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-semibold">동호수 관리</h1>
      <UnitListClient
        projectId={projectId}
        rows={result.rows}
        initialFilters={filters}
        initialReturnTo={initialReturnTo}
        initialSortKey={initialSortKey}
        initialSortDirection={initialSortDirection}
        lastInContext={lastInContext}
      />
    </main>
  );
}
