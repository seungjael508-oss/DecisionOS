"use client";

import { useEffect, useState } from "react";
import { LEGACY_GRADE_VALUES } from "@/lib/move-in/consultation";
import type { AssignFilters as AssignFiltersState } from "@/lib/move-in/assign";

// 동호수 관리 화면(UnitFilters)과 동일하게 타이핑마다 즉시 필터링하지 않고 짧게 묶어서 넘긴다.
const SEARCH_DEBOUNCE_MS = 250;

export function AssignFilters({
  filters,
  onChange,
  onReset,
  totalCount,
  visibleCount,
  counselors,
}: {
  filters: AssignFiltersState;
  onChange: (filters: AssignFiltersState) => void;
  onReset: () => void;
  totalCount: number;
  visibleCount: number;
  counselors: { id: string; label: string }[];
}) {
  const [buildingNo, setBuildingNo] = useState(filters.buildingNo);
  const [unitNo, setUnitNo] = useState(filters.unitNo);
  const [customerName, setCustomerName] = useState(filters.customerName);
  const [customerPhone, setCustomerPhone] = useState(filters.customerPhone);

  useEffect(() => {
    const timer = setTimeout(() => {
      onChange({ ...filters, buildingNo, unitNo, customerName, customerPhone });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingNo, unitNo, customerName, customerPhone]);

  return (
    <div className="mb-6">
      <div className="grid gap-3 md:grid-cols-3" aria-label="상담사 배정 검색 필터">
        <label className="flex flex-col gap-1 text-sm">
          등급
          <select
            value={filters.grade}
            onChange={(event) =>
              onChange({ ...filters, grade: event.target.value as AssignFiltersState["grade"] })
            }
            className="border border-neutral-400 px-2 py-1"
          >
            <option value="">전체</option>
            {LEGACY_GRADE_VALUES.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          동
          <input
            value={buildingNo}
            onChange={(event) => setBuildingNo(event.target.value)}
            className="border border-neutral-400 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          호수
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
          전화번호
          <input
            value={customerPhone}
            onChange={(event) => setCustomerPhone(event.target.value)}
            className="border border-neutral-400 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          현재 담당 상담사
          <select
            value={filters.counselorId}
            onChange={(event) => onChange({ ...filters, counselorId: event.target.value })}
            disabled={filters.unassignedOnly}
            className="border border-neutral-400 px-2 py-1 disabled:bg-neutral-100"
          >
            <option value="">전체</option>
            {counselors.map((counselor) => (
              <option key={counselor.id} value={counselor.id}>
                {counselor.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={filters.unassignedOnly}
            onChange={(event) =>
              onChange({ ...filters, unassignedOnly: event.target.checked })
            }
          />
          미배정만
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={onReset} className="border border-neutral-800 px-3 py-1 text-sm">
          초기화
        </button>
      </div>

      <p role="status" className="mt-2 text-sm text-neutral-600">
        검색 결과 {visibleCount}세대 / 전체 {totalCount}세대
      </p>
    </div>
  );
}
