"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UnitFilters } from "@/components/move-in/unit-filters";
import { UnitTable } from "@/components/move-in/unit-table";
import { UnitPrintTable } from "@/components/move-in/unit-print-table";
import { EmptyState } from "@/components/move-in/status-copy";
import {
  DEFAULT_UNIT_LIST_FILTERS,
  describeActiveFilters,
  filterUnits,
  gradeCounts,
  sortUnitRows,
  type SortDirection,
  type UnitListFilters,
  type UnitListRow,
  type UnitSortKey,
} from "@/lib/move-in/filters";

// 인증된 서버가 전달한 목록만 필터링한다. 검색/정렬/인쇄 시 route 재실행이나 DB 조회는 없다.
function setOrDelete(params: URLSearchParams, key: string, value: string) {
  if (value) params.set(key, value);
  else params.delete(key);
}

export function UnitListClient({ projectId, rows, initialFilters, initialReturnTo, initialSortKey = "unit", initialSortDirection = "asc", lastInContext = false }: {
  projectId: string;
  rows: UnitListRow[];
  initialFilters: UnitListFilters;
  initialReturnTo: string;
  initialSortKey?: UnitSortKey;
  initialSortDirection?: SortDirection;
  lastInContext?: boolean;
}) {
  const [filters, setFilters] = useState<UnitListFilters>({ ...DEFAULT_UNIT_LIST_FILTERS, ...initialFilters });
  const [sortKey, setSortKey] = useState<UnitSortKey>(initialSortKey);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSortDirection);
  const [resetSignal, setResetSignal] = useState(0);
  const [isPrinting, setIsPrinting] = useState(false);
  const returnToRef = useRef(initialReturnTo);
  const [returnTo, setReturnTo] = useState(initialReturnTo);

  // The print layout contains one row per unit, so mounting it beside the
  // interactive table doubles the DOM for every ordinary visit. Mount it only
  // after the user requests printing, then remove it when the native dialog
  // closes.
  useEffect(() => {
    if (!isPrinting) return;

    const finishPrinting = () => setIsPrinting(false);
    window.addEventListener("afterprint", finishPrinting, { once: true });
    window.print();

    return () => window.removeEventListener("afterprint", finishPrinting);
  }, [isPrinting]);

  const updateListUrl = useCallback((nextFilters: UnitListFilters, nextSortKey: UnitSortKey, nextSortDirection: SortDirection) => {
    const current = typeof window === "undefined"
      ? new URL(`https://decisionos.invalid${returnToRef.current}`)
      : new URL(window.location.href);
    const params = current.searchParams;
    const hadExplicitSort = params.has("sort");
    const hadExplicitDirection = params.has("direction");
    setOrDelete(params, "buildingNo", nextFilters.buildingNo.trim());
    setOrDelete(params, "unitNo", nextFilters.unitNo.trim());
    setOrDelete(params, "customerName", nextFilters.customerName.trim());
    setOrDelete(params, "customerPhone", (nextFilters.customerPhone ?? "").trim());
    setOrDelete(params, "grade", nextFilters.grade ?? "");
    setOrDelete(params, "occupancyIntent", nextFilters.occupancyIntent);
    setOrDelete(params, "fundingStatus", nextFilters.fundingStatus);
    setOrDelete(params, "moveInStatus", nextFilters.moveInStatus);
    setOrDelete(params, "intent", nextFilters.operationalIntent.join(","));
    // Default ordering need not be introduced, but an explicit URL choice is
    // part of the caller's work context and must survive detail navigation.
    setOrDelete(params, "sort", nextSortKey === "unit" && !hadExplicitSort ? "" : nextSortKey);
    setOrDelete(params, "direction", nextSortDirection === "asc" && !hadExplicitDirection ? "" : nextSortDirection);
    const next = `/projects/${projectId}/move-in/units${params.size ? `?${params.toString()}` : ""}`;
    returnToRef.current = next;
    setReturnTo(next);
    if (typeof window !== "undefined") window.history.replaceState(null, "", next);
  }, [projectId]);

  const handleFilterChange = useCallback((nextFilters: UnitListFilters) => {
    setFilters(nextFilters);
    updateListUrl(nextFilters, sortKey, sortDirection);
  }, [sortDirection, sortKey, updateListUrl]);

  const counts = useMemo(() => gradeCounts(rows), [rows]);
  const filtered = useMemo(() => filterUnits(rows, filters), [rows, filters]);
  const visible = useMemo(
    () => sortUnitRows(filtered, sortKey, sortDirection),
    [filtered, sortKey, sortDirection],
  );

  function handleReset() {
    setFilters(DEFAULT_UNIT_LIST_FILTERS);
    setSortKey("unit");
    setSortDirection("asc");
    updateListUrl(DEFAULT_UNIT_LIST_FILTERS, "unit", "asc");
    setResetSignal((value) => value + 1);
  }

  function handleSort(key: UnitSortKey) {
    if (key === sortKey) {
      const nextDirection = sortDirection === "asc" ? "desc" : "asc";
      setSortDirection(nextDirection);
      updateListUrl(filters, key, nextDirection);
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
    updateListUrl(filters, key, "asc");
  }

  return <>
    <div className="print:hidden">
      {lastInContext ? <p role="status" className="mb-3 text-sm text-neutral-700">현재 조건의 마지막 세대입니다.</p> : null}
      <UnitFilters
        key={resetSignal}
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleReset}
        totalCount={rows.length}
        visibleCount={visible.length}
        gradeCounts={counts}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onPrint={() => setIsPrinting(true)}
        onSortChange={(key, direction) => {
          setSortKey(key);
          setSortDirection(direction);
          updateListUrl(filters, key, direction);
        }}
      />
      {visible.length === 0 ? <EmptyState>등록된 동호수가 없습니다.</EmptyState>
        : <UnitTable projectId={projectId} rows={visible} returnTo={returnTo} sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />}
    </div>
    {isPrinting ? <UnitPrintTable filterSummary={describeActiveFilters(filters)} rows={visible} /> : null}
  </>;
}
