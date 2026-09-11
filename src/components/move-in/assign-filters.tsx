"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import type { AssignListFilters } from "@/lib/move-in/assign";
import { LEGACY_GRADE_VALUES } from "@/lib/move-in/consultation";

export function AssignFilters({
  projectId,
  filters,
  counselors,
}: {
  projectId: string;
  filters: AssignListFilters;
  counselors: { id: string; label: string }[];
}) {
  const router = useRouter();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const key of ["q", "counselorId", "legacyGrade"]) {
      const value = String(form.get(key) ?? "").trim();
      if (value) params.set(key, value);
    }
    if (form.get("unassignedOnly") === "1") params.set("unassignedOnly", "1");
    const query = params.toString();
    router.push(
      `/projects/${projectId}/move-in/assign${query ? `?${query}` : ""}`,
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mb-6 grid gap-3 md:grid-cols-3"
      aria-label="상담사 배정 검색 필터"
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
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="unassignedOnly"
          value="1"
          defaultChecked={filters.unassignedOnly}
        />
        미배정만
      </label>
      <div>
        <button type="submit" className="border border-neutral-800 px-3 py-1">
          적용
        </button>
      </div>
    </form>
  );
}
