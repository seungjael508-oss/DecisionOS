"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import type { CallListFilters } from "@/lib/move-in/calls";
import { LEGACY_GRADE_VALUES } from "@/lib/move-in/consultation";
import {
  FUNDING_STATUS_LABELS,
  FUNDING_STATUS_VALUES,
  MOVE_IN_STATUS_LABELS,
  MOVE_IN_STATUS_VALUES,
  OCCUPANCY_INTENT_LABELS,
  OCCUPANCY_INTENT_VALUES,
} from "@/lib/move-in/labels";

export function CallFilters({
  projectId,
  filters,
  counselors,
}: {
  projectId: string;
  filters: CallListFilters;
  counselors: { id: string; label: string }[];
}) {
  const router = useRouter();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const key of [
      "q",
      "counselorId",
      "legacyGrade",
      "occupancyIntent",
      "fundingStatus",
      "moveInStatus",
    ]) {
      const value = String(form.get(key) ?? "").trim();
      if (value) params.set(key, value);
    }
    if (form.get("nextContactDue") === "1") params.set("nextContactDue", "1");
    const query = params.toString();
    router.push(
      `/projects/${projectId}/move-in/calls${query ? `?${query}` : ""}`,
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mb-6 grid gap-3 md:grid-cols-3"
      aria-label="상담 콜 검색 필터"
    >
      <label className="flex flex-col gap-1 text-sm md:col-span-3">
        검색 (동, 호, 계약자명, 전화번호, 101-202)
        <input
          name="q"
          defaultValue={filters.q}
          className="border border-neutral-400 px-2 py-1"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        담당상담사
        <select
          name="counselorId"
          defaultValue={filters.counselorId}
          className="border border-neutral-400 px-2 py-1"
        >
          <option value="">전체</option>
          {counselors.map((counselor) => (
            <option key={counselor.id} value={counselor.id}>
              {counselor.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        기존등급
        <select
          name="legacyGrade"
          defaultValue={filters.legacyGrade}
          className="border border-neutral-400 px-2 py-1"
        >
          <option value="">전체</option>
          {LEGACY_GRADE_VALUES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
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
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="nextContactDue"
          value="1"
          defaultChecked={filters.nextContactDue}
        />
        다음접촉 도래
      </label>
      <div>
        <button type="submit" className="border border-neutral-800 px-3 py-1">
          적용
        </button>
      </div>
    </form>
  );
}
