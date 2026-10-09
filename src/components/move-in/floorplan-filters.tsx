"use client";

import type { FormEvent } from "react";

export function FloorplanFilters({ buildings, buildingNo, onBuildingChange }: {
  buildings: string[]; buildingNo: string; onBuildingChange: (building: string) => void;
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
    <p className="text-sm">표시 기준: <strong>현재등급</strong></p>
  </div>;
}
