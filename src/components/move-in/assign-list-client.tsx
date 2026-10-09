"use client";

import { useMemo, useState } from "react";
import { AssignFilters } from "@/components/move-in/assign-filters";
import { AssignBoard } from "@/components/move-in/assign-board";
import { EmptyState } from "@/components/move-in/status-copy";
import {
  DEFAULT_ASSIGN_FILTERS,
  filterAssignRows,
  sortAssignRows,
  type AssignFilters as AssignFiltersState,
  type AssignSortDirection,
  type AssignSortKey,
} from "@/lib/move-in/assign";
import type { CallListRow } from "@/lib/move-in/calls";

// 동호수 관리 화면(UnitListClient)과 동일하게, 서버가 한 번 내려준 rows를 브라우저에서만 필터링/정렬한다.
// 필터·정렬을 바꿔도 router.push/refresh나 Supabase 재조회는 일어나지 않는다.
export function AssignListClient({
  projectId,
  rows,
  counselors,
}: {
  projectId: string;
  rows: CallListRow[];
  counselors: { id: string; label: string }[];
}) {
  const [filters, setFilters] = useState<AssignFiltersState>(DEFAULT_ASSIGN_FILTERS);
  const [sortKey, setSortKey] = useState<AssignSortKey>("unit");
  const [sortDirection, setSortDirection] = useState<AssignSortDirection>("asc");
  const [resetSignal, setResetSignal] = useState(0);

  const filtered = useMemo(() => filterAssignRows(rows, filters), [rows, filters]);
  const visible = useMemo(
    () => sortAssignRows(filtered, sortKey, sortDirection),
    [filtered, sortKey, sortDirection],
  );

  function handleReset() {
    setFilters(DEFAULT_ASSIGN_FILTERS);
    setSortKey("unit");
    setSortDirection("asc");
    setResetSignal((value) => value + 1);
  }

  function handleSort(key: AssignSortKey) {
    if (key === sortKey) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  }

  return (
    <div>
      <AssignFilters
        key={resetSignal}
        filters={filters}
        onChange={setFilters}
        onReset={handleReset}
        totalCount={rows.length}
        visibleCount={visible.length}
        counselors={counselors}
      />
      {visible.length === 0 ? (
        <EmptyState>배정할 세대가 없습니다.</EmptyState>
      ) : (
        <AssignBoard
          projectId={projectId}
          rows={visible}
          counselors={counselors}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={handleSort}
        />
      )}
    </div>
  );
}
