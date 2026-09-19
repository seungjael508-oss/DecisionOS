"use client";

import { useMemo, useState } from "react";
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
export function UnitListClient({ projectId, rows, initialFilters }: {
  projectId: string;
  rows: UnitListRow[];
  initialFilters: UnitListFilters;
}) {
  const [filters, setFilters] = useState<UnitListFilters>({ ...DEFAULT_UNIT_LIST_FILTERS, ...initialFilters });
  const [sortKey, setSortKey] = useState<UnitSortKey>("unit");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [resetSignal, setResetSignal] = useState(0);

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
    setResetSignal((value) => value + 1);
  }

  function handleSort(key: UnitSortKey) {
    if (key === sortKey) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  }

  return <>
    <div className="print:hidden">
      <UnitFilters
        key={resetSignal}
        filters={filters}
        onChange={setFilters}
        onReset={handleReset}
        totalCount={rows.length}
        visibleCount={visible.length}
        gradeCounts={counts}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSortChange={(key, direction) => {
          setSortKey(key);
          setSortDirection(direction);
        }}
      />
      {visible.length === 0 ? <EmptyState>등록된 동호수가 없습니다.</EmptyState>
        : <UnitTable projectId={projectId} rows={visible} sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />}
    </div>
    <UnitPrintTable filterSummary={describeActiveFilters(filters)} rows={visible} />
  </>;
}
