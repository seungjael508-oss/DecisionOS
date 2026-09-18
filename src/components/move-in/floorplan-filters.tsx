"use client";

import type { FormEvent } from "react";
import { FLOORPLAN_COLOR_MODE_LABELS, FLOORPLAN_COLOR_MODES, type FloorplanColorMode } from "@/lib/move-in/floorplan";

// 기존 표시기준과 동 선택 UI를 유지하며 부모의 client state만 갱신한다.
export function FloorplanFilters({ buildings, buildingNo, colorBy, onBuildingChange, onColorChange }: {
  buildings: string[];
  buildingNo: string;
  colorBy: FloorplanColorMode;
  onBuildingChange: (building: string) => void;
  onColorChange: (mode: FloorplanColorMode) => void;
}) {
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = String(new FormData(event.currentTarget).get("buildingNo") ?? "");
    if (buildings.includes(next)) onBuildingChange(next);
  }
  return <div className="mb-6 flex flex-col gap-4">
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3" aria-label="동호배치도 동 선택">
      <label className="flex flex-col gap-1 text-sm">동
        <select name="buildingNo" value={buildingNo} onChange={event => onBuildingChange(event.target.value)} className="border border-neutral-400 px-2 py-1">
          {buildings.map(value => <option key={value} value={value}>{value}동</option>)}
        </select>
      </label>
      <button type="submit" className="border border-neutral-800 px-3 py-1">적용</button>
    </form>
    <nav className="flex flex-wrap gap-2" aria-label="표시 기준">
      {FLOORPLAN_COLOR_MODES.map(mode => <button key={mode} type="button"
        onClick={() => onColorChange(mode)} aria-pressed={mode === colorBy}
        className={mode === colorBy ? "rounded bg-neutral-900 px-3 py-1 text-white" : "rounded border border-neutral-400 px-3 py-1"}>
        {FLOORPLAN_COLOR_MODE_LABELS[mode]}
      </button>)}
    </nav>
  </div>;
}
