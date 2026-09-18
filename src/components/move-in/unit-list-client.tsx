"use client";

import { useState } from "react";
import { UnitFilters } from "@/components/move-in/unit-filters";
import { UnitTable } from "@/components/move-in/unit-table";
import { EmptyState } from "@/components/move-in/status-copy";
import { filterUnits, type UnitListFilters, type UnitListRow } from "@/lib/move-in/filters";

// 인증된 서버가 전달한 목록만 필터링한다. 검색 시 route 재실행이나 DB 조회는 없다.
export function UnitListClient({ projectId, rows, initialFilters }: {
  projectId: string;
  rows: UnitListRow[];
  initialFilters: UnitListFilters;
}) {
  const [filters, setFilters] = useState(initialFilters);
  const visible = filterUnits(rows, filters);
  return <>
    <UnitFilters filters={filters} onApply={setFilters} />
    {visible.length === 0 ? <EmptyState>등록된 동호수가 없습니다.</EmptyState>
      : <UnitTable projectId={projectId} rows={visible} />}
  </>;
}
