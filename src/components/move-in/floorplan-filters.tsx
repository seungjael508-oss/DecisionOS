"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import {
  FLOORPLAN_COLOR_MODE_LABELS,
  FLOORPLAN_COLOR_MODES,
  type FloorplanColorMode,
} from "@/lib/move-in/floorplan";

export function FloorplanFilters({
  projectId,
  buildings,
  buildingNo,
  colorBy,
}: {
  projectId: string;
  buildings: string[];
  buildingNo: string;
  colorBy: FloorplanColorMode;
}) {
  const router = useRouter();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    const nextBuilding = String(form.get("buildingNo") ?? "").trim();
    if (nextBuilding) params.set("buildingNo", nextBuilding);
    params.set("colorBy", colorBy);
    router.push(
      `/projects/${projectId}/move-in/floorplan?${params.toString()}`,
    );
  }

  return (
    <div className="mb-6 flex flex-col gap-4">
      <form
        onSubmit={onSubmit}
        className="flex flex-wrap items-end gap-3"
        aria-label="동호배치도 동 선택"
      >
        <label className="flex flex-col gap-1 text-sm">
          동
          <select
            name="buildingNo"
            defaultValue={buildingNo}
            className="border border-neutral-400 px-2 py-1"
          >
            {buildings.map((value) => (
              <option key={value} value={value}>
                {value}동
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="border border-neutral-800 px-3 py-1">
          적용
        </button>
      </form>
      <nav className="flex flex-wrap gap-2" aria-label="표시 기준">
        {FLOORPLAN_COLOR_MODES.map((mode) => {
          const params = new URLSearchParams();
          if (buildingNo) params.set("buildingNo", buildingNo);
          params.set("colorBy", mode);
          const active = mode === colorBy;
          return (
            <Link
              key={mode}
              href={`/projects/${projectId}/move-in/floorplan?${params.toString()}`}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "rounded bg-neutral-900 px-3 py-1 text-white"
                  : "rounded border border-neutral-400 px-3 py-1"
              }
            >
              {FLOORPLAN_COLOR_MODE_LABELS[mode]}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
