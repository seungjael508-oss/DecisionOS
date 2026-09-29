import {
  DEFAULT_UNIT_LIST_FILTERS,
  filterTodayRows,
  filterUnits,
  parseOperationalIntentFilter,
  sortUnitRows,
  type SortDirection,
  type TodayFilter,
  type UnitListFilters,
  type UnitListRow,
  type UnitSortKey,
} from "@/lib/move-in/filters";
import {
  FUNDING_STATUS_VALUES,
  MOVE_IN_STATUS_VALUES,
  OCCUPANCY_INTENT_VALUES,
  type FundingStatus,
  type MoveInStatus,
  type OccupancyIntent,
} from "@/lib/move-in/labels";
import { LEGACY_GRADE_VALUES, type LegacyGrade } from "@/lib/move-in/consultation";

export type MoveInReturnContext =
  | {
      kind: "units";
      returnTo: string;
      filters: UnitListFilters;
      sortKey: UnitSortKey;
      sortDirection: SortDirection;
    }
  | {
      kind: "today";
      returnTo: string;
      filter: TodayFilter;
    };

export function getSafeMoveInReturnTo(projectId: string, raw: string | null | undefined) {
  const fallback = `/projects/${projectId}/move-in/units`;
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return fallback;
  }

  try {
    const candidate = new URL(raw, "https://decisionos.invalid");
    if (candidate.origin !== "https://decisionos.invalid") return fallback;

    const unitsPath = fallback;
    const todayPath = `/projects/${projectId}/move-in/today`;
    if (candidate.pathname !== unitsPath && candidate.pathname !== todayPath) {
      return fallback;
    }

    return `${candidate.pathname}${candidate.search}`;
  } catch {
    return fallback;
  }
}

export function buildMoveInPathWithSearch(
  pathname: string,
  searchParams: Record<string, string | string[] | undefined>,
  omittedKeys: readonly string[] = [],
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (omittedKeys.includes(key) || value === undefined) continue;
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) params.append(key, item);
  }
  return `${pathname}${params.size ? `?${params.toString()}` : ""}`;
}

function allowedOne<T extends string>(
  value: string | null,
  values: readonly T[],
): T | "" {
  return value && values.includes(value as T) ? (value as T) : "";
}

function parseUnitFilters(params: URLSearchParams): UnitListFilters {
  const value = (primary: string, alias?: string) =>
    params.get(primary) ?? (alias ? params.get(alias) : null) ?? "";

  return {
    ...DEFAULT_UNIT_LIST_FILTERS,
    buildingNo: value("buildingNo", "building"),
    unitNo: value("unitNo", "unit"),
    customerName: value("customerName", "search"),
    customerPhone: value("customerPhone"),
    grade: allowedOne(params.get("grade"), LEGACY_GRADE_VALUES) as LegacyGrade | "",
    occupancyIntent: allowedOne(
      params.get("occupancyIntent"),
      OCCUPANCY_INTENT_VALUES,
    ) as OccupancyIntent | "",
    fundingStatus: allowedOne(
      params.get("fundingStatus"),
      FUNDING_STATUS_VALUES,
    ) as FundingStatus | "",
    moveInStatus: allowedOne(
      params.get("moveInStatus"),
      MOVE_IN_STATUS_VALUES,
    ) as MoveInStatus | "",
    operationalIntent: parseOperationalIntentFilter(params.get("intent")),
  };
}

function parseSort(params: URLSearchParams): {
  sortKey: UnitSortKey;
  sortDirection: SortDirection;
} {
  const rawSort = params.get("sort");
  const sortKey: UnitSortKey = rawSort === "name" || rawSort === "grade"
    ? rawSort
    : "unit";

  return {
    sortKey,
    sortDirection: params.get("direction") === "desc" ? "desc" : "asc",
  };
}

function parseTodayFilter(value: string | null): TodayFilter {
  return value === "next_contact" || value === "delayed" || value === "funding"
    ? value
    : "all";
}

/**
 * The list URL is the canonical work context. This parser deliberately keeps
 * the exact safe URL for navigation while translating only filters that the
 * current list UI actually applies for server-side next-unit resolution.
 */
export function getMoveInReturnContext(
  projectId: string,
  raw: string | null | undefined,
): MoveInReturnContext {
  const returnTo = getSafeMoveInReturnTo(projectId, raw);
  const url = new URL(returnTo, "https://decisionos.invalid");

  if (url.pathname === `/projects/${projectId}/move-in/today`) {
    return {
      kind: "today",
      returnTo,
      filter: parseTodayFilter(url.searchParams.get("filter")),
    };
  }

  return {
    kind: "units",
    returnTo,
    filters: parseUnitFilters(url.searchParams),
    ...parseSort(url.searchParams),
  };
}

export function buildMoveInUnitDetailHref(
  projectId: string,
  unitId: string,
  returnTo: string | null | undefined,
) {
  const context = getSafeMoveInReturnTo(projectId, returnTo);
  return `/projects/${projectId}/move-in/units/${unitId}?returnTo=${encodeURIComponent(context)}`;
}

export function withMoveInReturnNotice(
  returnTo: string,
  notice: "last",
) {
  const url = new URL(returnTo, "https://decisionos.invalid");
  url.searchParams.set("moveInNotice", notice);
  return `${url.pathname}${url.search}`;
}

export type MoveInAdjacentUnitIds = {
  previousUnitId: string | null;
  nextUnitId: string | null;
};

/**
 * Resolves adjacent units only from the already-authorized, currently filtered
 * and sorted projection. There is intentionally no UUID, primary-key, or
 * project-wide fallback when the current unit is outside this work context.
 */
export function resolveMoveInAdjacentUnitIds(
  rows: UnitListRow[],
  currentUnitId: string,
  context: MoveInReturnContext,
  now = new Date(),
): MoveInAdjacentUnitIds {
  const scoped = context.kind === "today"
    ? filterTodayRows(rows, context.filter, now)
    : sortUnitRows(filterUnits(rows, context.filters), context.sortKey, context.sortDirection);
  const currentIndex = scoped.findIndex((row) => row.unitId === currentUnitId);
  if (currentIndex < 0) return { previousUnitId: null, nextUnitId: null };
  return {
    previousUnitId: scoped[currentIndex - 1]?.unitId ?? null,
    nextUnitId: scoped[currentIndex + 1]?.unitId ?? null,
  };
}

/** Backward-compatible successor access for the existing save-and-next action. */
export function resolveNextMoveInUnitId(
  rows: UnitListRow[],
  currentUnitId: string,
  context: MoveInReturnContext,
  now = new Date(),
): string | null {
  return resolveMoveInAdjacentUnitIds(rows, currentUnitId, context, now).nextUnitId;
}


export function resolveTodayQueueAdjacentUnitIds(
  rows: Array<{ unitId: string; reasonCodes: readonly string[]; moveInStatus?: string | null }>,
  currentUnitId: string,
  context: MoveInReturnContext,
): MoveInAdjacentUnitIds {
  if (context.kind !== "today") return { previousUnitId: null, nextUnitId: null };
  const scoped = rows.filter((row) => {
    if (context.filter === "all") return true;
    if (context.filter === "next_contact") return row.reasonCodes.includes("FOLLOW_UP_DUE");
    if (context.filter === "funding") return row.reasonCodes.includes("C_GRADE_FUNDING");
    return row.moveInStatus === "DELAYED";
  });
  const index = scoped.findIndex((row) => row.unitId === currentUnitId);
  if (index < 0) return { previousUnitId: null, nextUnitId: null };
  return {
    previousUnitId: scoped[index - 1]?.unitId ?? null,
    nextUnitId: scoped[index + 1]?.unitId ?? null,
  };
}
