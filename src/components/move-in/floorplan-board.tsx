import Link from "next/link";
import {
  buildFloorplanGrid,
  cellKey,
  floorplanCellTone,
  floorplanLegend,
  type FloorplanColorMode,
  type FloorplanUnit,
} from "@/lib/move-in/floorplan";
import { formatUnitLabel } from "@/lib/move-in/labels";

export function FloorplanBoard({
  projectId,
  units,
  buildingNo,
  colorBy,
}: {
  projectId: string;
  units: FloorplanUnit[];
  buildingNo: string;
  colorBy: FloorplanColorMode;
}) {
  const grid = buildFloorplanGrid(units, buildingNo);
  const legend = floorplanLegend(colorBy);

  return (
    <section aria-label={`${buildingNo}동 동호배치도`}>
      <h2 className="mb-4 text-xl font-semibold">{buildingNo}동</h2>
      <ul className="mb-4 flex flex-wrap gap-3 text-sm" aria-label="범례">
        {legend.map((item) => (
          <li key={item.value} className="flex items-center gap-2">
            <span className={`inline-block h-4 w-4 border border-neutral-400 ${item.className}`} />
            {item.label}
          </li>
        ))}
        <li className="flex items-center gap-2">
          <span className="inline-block h-4 w-4 border border-neutral-400 bg-white" />
          미등록
        </li>
      </ul>
      {grid.floors.length === 0 && grid.unparsed.length === 0 ? (
        <p>표시할 세대가 없습니다.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="border-collapse text-sm">
            <thead>
              <tr>
                <th className="px-2 py-1 text-left font-medium">층</th>
                {grid.lines.map((line) => (
                  <th key={line} className="px-1 py-1 font-medium">
                    {String(line).padStart(2, "0")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.floors.map((floor) => (
                <tr key={floor}>
                  <th className="px-2 py-1 text-left font-medium">{floor}층</th>
                  {grid.lines.map((line) => {
                    const cell = grid.cells.get(cellKey(floor, line));
                    if (!cell) {
                      return (
                        <td key={line} className="p-1">
                          <span className="block min-w-14 border border-dashed border-neutral-300 px-2 py-2 text-center text-neutral-400">
                            —
                          </span>
                        </td>
                      );
                    }
                    const tone = floorplanCellTone(cell, colorBy);
                    return (
                      <td key={line} className="p-1">
                        <Link
                          href={`/projects/${projectId}/move-in/units/${cell.unitId}`}
                          className={`block min-w-14 border border-neutral-400 px-2 py-2 text-center ${tone.className}`}
                          aria-label={`${formatUnitLabel(cell.buildingNo, cell.unitNo)} ${tone.label}`}
                        >
                          {cell.unitNo}
                        </Link>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {grid.unparsed.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="기타 세대">
          {grid.unparsed.map((unit) => {
            const tone = floorplanCellTone(unit, colorBy);
            return (
              <li key={unit.unitId}>
                <Link
                  href={`/projects/${projectId}/move-in/units/${unit.unitId}`}
                  className={`inline-block border border-neutral-400 px-2 py-1 ${tone.className}`}
                  aria-label={`${formatUnitLabel(unit.buildingNo, unit.unitNo)} ${tone.label}`}
                >
                  {unit.unitNo}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
