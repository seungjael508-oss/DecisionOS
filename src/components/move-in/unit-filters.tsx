"use client";

import { useEffect, useState } from "react";
import {
  FUNDING_STATUS_LABELS,
  FUNDING_STATUS_VALUES,
  MOVE_IN_STATUS_LABELS,
  MOVE_IN_STATUS_VALUES,
  OCCUPANCY_INTENT_LABELS,
  OCCUPANCY_INTENT_VALUES,
} from "@/lib/move-in/labels";
import { LEGACY_GRADE_VALUES, type LegacyGrade } from "@/lib/move-in/consultation";
import {
  UNIT_SORT_OPTIONS,
  type SortDirection,
  type UnitListFilters,
  type UnitSortKey,
} from "@/lib/move-in/filters";

// 타이핑마다 필터를 다시 계산하면 851행 렌더링이 계속 튄다. 짧게만 묶어서 넘긴다.
const SEARCH_DEBOUNCE_MS = 250;

export function UnitFilters({
  filters,
  onChange,
  onReset,
  totalCount,
  visibleCount,
  gradeCounts,
  sortKey,
  sortDirection,
  onSortChange,
}: {
  filters: UnitListFilters;
  onChange: (filters: UnitListFilters) => void;
  onReset: () => void;
  totalCount: number;
  visibleCount: number;
  gradeCounts: Record<LegacyGrade, number>;
  sortKey: UnitSortKey;
  sortDirection: SortDirection;
  onSortChange: (key: UnitSortKey, direction: SortDirection) => void;
}) {
  const [buildingNo, setBuildingNo] = useState(filters.buildingNo);
  const [unitNo, setUnitNo] = useState(filters.unitNo);
  const [customerName, setCustomerName] = useState(filters.customerName);

  useEffect(() => {
    const timer = setTimeout(() => {
      onChange({ ...filters, buildingNo, unitNo, customerName });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [buildingNo, unitNo, customerName, filters, onChange]);

  function setSelect(key: "occupancyIntent" | "fundingStatus" | "moveInStatus", value: string) {
    onChange({ ...filters, [key]: value });
  }

  function toggleGrade(grade: LegacyGrade) {
    onChange({ ...filters, grade: filters.grade === grade ? "" : grade });
  }

  const hasActiveFilter = Boolean(
    filters.grade ||
      buildingNo ||
      unitNo ||
      customerName ||
      filters.occupancyIntent ||
      filters.fundingStatus ||
      filters.moveInStatus,
  );

  return (
    <div className="mb-6">
      <div role="group" aria-label="등급 빠른 필터" className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={!filters.grade}
          onClick={() => onChange({ ...filters, grade: "" })}
          className="border border-neutral-800 px-3 py-1 text-sm aria-pressed:bg-neutral-800 aria-pressed:text-white"
        >
          전체 {totalCount}
        </button>
        {LEGACY_GRADE_VALUES.map((grade) => (
          <button
            key={grade}
            type="button"
            aria-pressed={filters.grade === grade}
            onClick={() => toggleGrade(grade)}
            className="border border-neutral-800 px-3 py-1 text-sm aria-pressed:bg-neutral-800 aria-pressed:text-white"
          >
            {grade} {gradeCounts[grade]}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-3" aria-label="동호수 검색 필터">
        <label className="flex flex-col gap-1 text-sm">
          동
          <input
            value={buildingNo}
            onChange={(event) => setBuildingNo(event.target.value)}
            className="border border-neutral-400 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          호
          <input
            value={unitNo}
            onChange={(event) => setUnitNo(event.target.value)}
            className="border border-neutral-400 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          계약자명
          <input
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            className="border border-neutral-400 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          입주의향
          <select
            value={filters.occupancyIntent}
            onChange={(event) => setSelect("occupancyIntent", event.target.value)}
            className="border border-neutral-400 px-2 py-1"
          >
            <option value="">전체</option>
            {OCCUPANCY_INTENT_VALUES.map((value) => (
              <option key={value} value={value}>
                {OCCUPANCY_INTENT_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          자금상태
          <select
            value={filters.fundingStatus}
            onChange={(event) => setSelect("fundingStatus", event.target.value)}
            className="border border-neutral-400 px-2 py-1"
          >
            <option value="">전체</option>
            {FUNDING_STATUS_VALUES.map((value) => (
              <option key={value} value={value}>
                {FUNDING_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          입주진행
          <select
            value={filters.moveInStatus}
            onChange={(event) => setSelect("moveInStatus", event.target.value)}
            className="border border-neutral-400 px-2 py-1"
          >
            <option value="">전체</option>
            {MOVE_IN_STATUS_VALUES.map((value) => (
              <option key={value} value={value}>
                {MOVE_IN_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm md:hidden">
          정렬
          <select
            aria-label="정렬"
            value={`${sortKey}:${sortDirection}`}
            onChange={(event) => {
              const [key, direction] = event.target.value.split(":") as [UnitSortKey, SortDirection];
              onSortChange(key, direction);
            }}
            className="border border-neutral-400 px-2 py-1"
          >
            {UNIT_SORT_OPTIONS.map((option) => (
              <option key={`${option.key}:${option.direction}`} value={`${option.key}:${option.direction}`}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={onReset} className="border border-neutral-800 px-3 py-1 text-sm">
          전체 초기화
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="border border-neutral-800 px-3 py-1 text-sm"
        >
          인쇄
        </button>
      </div>

      <p role="status" className="mt-2 text-sm text-neutral-600">
        {hasActiveFilter ? `전체 ${totalCount}세대 중 ${visibleCount}세대` : `전체 ${totalCount}세대`}
      </p>
    </div>
  );
}
