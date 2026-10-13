import Link from "next/link";
import {
  buildFloorplanGrid, cellKey, floorplanCurrentPresentation, floorplanLegend,
  FLOORPLAN_AUXILIARY_LEGEND, type FloorplanColorMode, type FloorplanUnit,
} from "@/lib/move-in/floorplan";
import { floorplanSelection } from "@/lib/move-in/floorplan-current";

function FloorplanTile({ projectId, unit }: { projectId: string; unit: FloorplanUnit }) {
  const selection = floorplanSelection(projectId, unit);
  if (!selection) return null;
  const p = floorplanCurrentPresentation(unit);
  return <Link prefetch={false} href={selection.detailHref}
    className={`block min-w-20 border border-neutral-400 px-2 py-2 text-center ${p.className}`}
    aria-label={p.ariaLabel}>
    <span className="block font-medium">{unit.unitNo}</span>
    <span className="block text-xs">{p.gradeLabel}</span>
    <span className="mt-1 flex max-w-40 flex-wrap justify-center gap-1">
      {p.tags.map(tag => <span key={tag.key} className="rounded border border-current px-1 text-xs">{tag.label}</span>)}
    </span>
  </Link>;
}

export function FloorplanBoard({ projectId, units, buildingNo, colorBy = "legacyGrade" }: {
  projectId: string; units: FloorplanUnit[]; buildingNo: string; colorBy?: FloorplanColorMode;
}) {
  const grid = buildFloorplanGrid(units, buildingNo);
  const legend = floorplanLegend(colorBy);
  return <section aria-label={`${buildingNo}동 동호배치도`}>
    <h2 className="mb-4 text-xl font-semibold">{buildingNo}동</h2>
    <ul className="mb-3 flex flex-wrap gap-3 text-sm" aria-label="현재등급 범례">
      {legend.map(item => <li key={item.value} className="flex items-center gap-2">
        <span aria-hidden="true" className={`inline-block h-4 w-4 border border-neutral-400 ${item.className}`} />{item.label}
      </li>)}
      <li className="flex items-center gap-2"><span aria-hidden="true" className="inline-block h-4 w-4 border border-neutral-400 bg-white" />미등록</li>
    </ul>
    <ul className="mb-4 flex flex-wrap gap-2 text-xs" aria-label="보조 태그 범례">
      {FLOORPLAN_AUXILIARY_LEGEND.map(label => <li key={label} className="rounded border border-neutral-400 px-2 py-1">{label}</li>)}
    </ul>
    {grid.floors.length === 0 && grid.unparsed.length === 0 ? <p>표시할 세대가 없습니다.</p> :
      <div className="overflow-x-auto"><table className="border-collapse text-sm">
        <thead><tr><th className="px-2 py-1 text-left font-medium">층</th>
          {grid.lines.map(line => <th key={line} className="px-1 py-1 font-medium">{String(line).padStart(2, "0")}</th>)}
        </tr></thead>
        <tbody>{grid.floors.map(floor => <tr key={floor}>
          <th className="px-2 py-1 text-left font-medium">{floor}층</th>
          {grid.lines.map(line => { const cell = grid.cells.get(cellKey(floor, line)); return <td key={line} className="p-1">
            {cell ? <FloorplanTile projectId={projectId} unit={cell} /> : <span className="block min-w-20 border border-dashed border-neutral-300 px-2 py-2 text-center text-neutral-400">—</span>}
          </td>; })}
        </tr>)}</tbody>
      </table></div>}
    {grid.unparsed.length > 0 ? <ul className="mt-4 flex flex-wrap gap-2" aria-label="기타 세대">
      {grid.unparsed.map(unit => <li key={unit.unitId}><FloorplanTile projectId={projectId} unit={unit} /></li>)}
    </ul> : null}
  </section>;
}
