"use client";

import { useRouter } from "next/navigation";
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
  projectId,
  filters,
}: {
  projectId: string;
  filters: UnitListFilters;
}) {
  const router = useRouter();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const key of [
      "buildingNo",
      "unitNo",
      "customerName",
      "occupancyIntent",
      "fundingStatus",
      "moveInStatus",
    ]) {
      const value = String(form.get(key) ?? "").trim();
      if (value) params.set(key, value);
    }
    const query = params.toString();
    router.push(
      `/projects/${projectId}/move-in/units${query ? `?${query}` : ""}`,
    );
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
