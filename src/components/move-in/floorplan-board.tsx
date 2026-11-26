import Link from "next/link";
import { buildMoveInUnitDetailHref } from "@/lib/move-in/return-to";
import { isConfirmedBalancePaid } from '@/lib/move-in/balance-paid';
import {
  buildFloorplanGrid, cellKey, listBuildings, type FloorplanColorMode, type FloorplanUnit,
} from "@/lib/move-in/floorplan";
import { floorplanSelection } from "@/lib/move-in/floorplan-current";
import { MoveReservationBadge, ProblemHouseholdBadges, SourceManagementBadges } from './ledger-badges';
import { problemReasonText } from '@/lib/move-in/problem-household';

function FloorplanTile({ projectId, unit, returnBuildingNo, today, focused }: { projectId: string; unit: FloorplanUnit; returnBuildingNo?: string; today: boolean; focused: boolean }) {
  const selection = floorplanSelection(projectId, unit);
  if (!selection) return null;
  const paid = isConfirmedBalancePaid(unit);
  const reserved = unit.moveReservation === 'BOOKED';
  const schedule = unit.currentGrade === 'A' && unit.scheduleBadge
    && !(unit.scheduleBadge.kind === 'balance' && paid)
    && !(unit.scheduleBadge.kind === 'moveIn' && unit.actualMoveInDate) ? unit.scheduleBadge : null;
  const grade = unit.currentGrade || null;
  const special = unit.specialReasons.length > 0;
  const problemLabel = unit.problemFlags?.length ? `문제세대 ${problemReasonText(unit.problemFlags)} · ${unit.problemLockReleased ? '해제승인' : '입주잠금'}` : '';
  const tagLabels = [schedule?.label ?? '', grade ? `${grade}등급` : '', problemLabel, ...(unit.sourceTags ?? []).filter(tag => tag === 'ASEL' || tag === 'DELINQUENT').map(tag => tag === 'ASEL' ? '아셀' : '연체'), special ? '특별관리' : '', reserved ? '이사예약' : '', paid ? '잔금완납' : '', paid && !unit.balancePaidAt ? '완납일 미확인' : '', today ? '오늘 관리 대상' : ''].filter(Boolean);
  const returnTo = `/projects/${projectId}/move-in/floorplan?${new URLSearchParams({ buildingNo: returnBuildingNo ?? unit.buildingNo })}`;
  return <Link prefetch={false} href={`${buildMoveInUnitDetailHref(projectId, unit.unitId, returnTo)}#consultation-create-form`}
    id={`floorplan-unit-${unit.unitId}`}
    data-today-target={today || undefined} data-focused-unit={focused || undefined}
    data-move-reserved={reserved ? 'true' : undefined}
    data-balance-paid={paid ? 'true' : undefined}
    className={`flex min-h-9 min-w-16 flex-col items-center justify-center border border-neutral-400 px-2 py-1 text-center text-neutral-900 hover:outline hover:outline-2 focus-visible:outline focus-visible:outline-2 ${paid ? 'bg-green-100' : 'bg-white'} ${focused ? 'outline outline-2 outline-indigo-700' : ''}`}
    title={tagLabels.join(' · ') || undefined}
    aria-label={`${unit.buildingNo}동 ${unit.unitNo}호${tagLabels.length ? ` · ${tagLabels.join(' · ')}` : ''}`}>
    <span>{unit.unitNo}</span>
    {today ? <span className="rounded border border-amber-400 bg-amber-50 px-1 text-xs text-amber-950">오늘 관리</span> : null}
    <ProblemHouseholdBadges flags={unit.problemFlags} released={unit.problemLockReleased}/>
    {schedule ? <span data-schedule-kind={schedule.kind} className="inline-flex whitespace-nowrap rounded border border-violet-300 bg-violet-50 px-1 text-xs text-violet-900">{schedule.label}</span> : null}
    {reserved ? <MoveReservationBadge date={unit.movingDate ?? null} time={unit.movingTime}/> : null}
    {grade || special || unit.sourceTags?.some(tag => tag === 'ASEL' || tag === 'DELINQUENT') ? <span className="flex flex-wrap justify-center gap-1">
      {grade ? <span data-grade={grade} className="rounded border border-current px-1 text-xs">{grade}등급</span> : null}
      <SourceManagementBadges tags={unit.sourceTags}/>
      {special ? <span data-special-management="true" className="rounded border border-current px-1 text-xs">특별관리</span> : null}
    </span> : null}
  </Link>;
}

export function FloorplanBoard({ projectId, units, buildingNo, returnBuildingNo, todayUnitIds = [], focusUnitId }: {
  projectId: string; units: FloorplanUnit[]; buildingNo?: string; colorBy?: FloorplanColorMode;
  returnBuildingNo?: string; todayUnitIds?: readonly string[]; focusUnitId?: string;
}) {
  const today = new Set(todayUnitIds);
  const tile = (unit: FloorplanUnit) => <FloorplanTile projectId={projectId} unit={unit} returnBuildingNo={returnBuildingNo} today={today.has(unit.unitId)} focused={focusUnitId === unit.unitId} />;
  const grids = (buildingNo ? [buildingNo] : listBuildings(units)).map(building => buildFloorplanGrid(units, building));
  const registeredFloors = grids.flatMap(grid => grid.floors);
  const highest = registeredFloors.length ? Math.max(...registeredFloors) : 0;
  const lowest = registeredFloors.length ? Math.min(...registeredFloors) : 1;
  const floors = Array.from({length: highest - lowest + 1}, (_, index) => highest - index);
  return <section aria-label="동호수배치도">
    <ul className="mb-4 flex flex-wrap gap-4 text-sm" aria-label="잔금완납 범례">
      <li className="flex items-center gap-2"><span aria-hidden="true" className="h-4 w-4 border border-neutral-400 bg-white" />미완납</li>
      <li className="flex items-center gap-2"><span aria-hidden="true" className="h-4 w-4 border border-neutral-400 bg-green-100" />잔금완납</li>
    </ul>
    {grids.every(grid => !grid.floors.length && !grid.unparsed.length) ? <p>표시할 세대가 없습니다.</p> :
      <div className="overflow-x-auto"><table className="border-collapse text-sm">
        <thead><tr><th className="px-2 py-1 text-left font-medium">층</th>
          {grids.map(grid => <th key={grid.buildingNo} colSpan={Math.max(grid.lines.length, 1)} className="border-x-8 border-white bg-neutral-700 py-5 text-base font-semibold text-white">{grid.buildingNo}동</th>)}
        </tr></thead>
        <tbody>{floors.map(floor => <tr key={floor} data-floor={floor}>
          <th className="h-9 px-2 text-left font-normal text-neutral-500">{floor}F</th>
          {grids.map(grid => (grid.lines.length ? grid.lines : [0]).map((line, index, lines) => { const cell = grid.cells.get(cellKey(floor, line)); return <td key={`${grid.buildingNo}:${line}`} className={`p-0 ${index === 0 ? 'border-l-8 border-white' : ''} ${index === lines.length - 1 ? 'border-r-8 border-white' : ''}`}>
            {cell ? tile(cell) : null}
          </td>; }))}
        </tr>)}</tbody>
      </table></div>}
    {grids.map(grid => grid.unparsed.length > 0 ? <ul key={grid.buildingNo} className="mt-4 flex flex-wrap gap-2" aria-label={`${grid.buildingNo}동 기타 세대`}>
      {grid.unparsed.map(unit => <li key={unit.unitId}>{tile(unit)}</li>)}
    </ul> : null)}
  </section>;
}
