"use client";

import type { FormEvent } from "react";
import {
  FUNDING_STATUS_LABELS,
  FUNDING_STATUS_VALUES,
  MOVE_IN_STATUS_LABELS,
  MOVE_IN_STATUS_VALUES,
  OCCUPANCY_INTENT_LABELS,
  OCCUPANCY_INTENT_VALUES,
} from "@/lib/move-in/labels";
import type { UnitListFilters } from "@/lib/move-in/filters";

export function UnitFilters({
  onApply,
  filters,
}: {
  onApply: (filters: UnitListFilters) => void;
  filters: UnitListFilters;
}) {

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    // 이미 받은 데이터의 검색조건만 갱신한다. URL navigation은 수행하지 않는다.
    const value = (key: string) => String(form.get(key) ?? "").trim();
    onApply({
      buildingNo: value("buildingNo"), unitNo: value("unitNo"), customerName: value("customerName"),
      occupancyIntent: OCCUPANCY_INTENT_VALUES.find(v => v === value("occupancyIntent")) ?? "",
      fundingStatus: FUNDING_STATUS_VALUES.find(v => v === value("fundingStatus")) ?? "",
      moveInStatus: MOVE_IN_STATUS_VALUES.find(v => v === value("moveInStatus")) ?? "",
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mb-6 grid gap-3 md:grid-cols-3"
      aria-label="동호수 검색 필터"
    >
      <label className="flex flex-col gap-1 text-sm">
        동
        <input
          name="buildingNo"
          defaultValue={filters.buildingNo}
          className="border border-neutral-400 px-2 py-1"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        호
        <input
          name="unitNo"
          defaultValue={filters.unitNo}
          className="border border-neutral-400 px-2 py-1"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        계약자명
        <input
          name="customerName"
          defaultValue={filters.customerName}
          className="border border-neutral-400 px-2 py-1"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        입주의향
        <select
          name="occupancyIntent"
          defaultValue={filters.occupancyIntent}
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
          name="fundingStatus"
          defaultValue={filters.fundingStatus}
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
          name="moveInStatus"
          defaultValue={filters.moveInStatus}
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
      <div className="md:col-span-3">
        <button type="submit" className="border border-neutral-800 px-3 py-1">
          적용
        </button>
      </div>
    </form>
  );
}
