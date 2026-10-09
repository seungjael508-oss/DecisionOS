import type { CurrentUnitSnapshot } from '@/lib/move-in/ledger-types';
import type { FloorplanUnit } from '@/lib/move-in/floorplan';
import { buildWorkspaceSelectionHref, parseWorkspaceContext } from '@/lib/move-in/ledger-context';

export type UnitLocation = { projectId: string; unitId: string; buildingNo: string; unitNo: string; floor: number | null };
export function toFloorplanUnit(snapshot: CurrentUnitSnapshot, location: UnitLocation): FloorplanUnit | null {
  if (snapshot.projectId !== location.projectId || snapshot.unitId !== location.unitId || !location.buildingNo || !location.unitNo) return null;
  return {
    projectId: snapshot.projectId, unitId: snapshot.unitId, buildingNo: location.buildingNo, unitNo: location.unitNo, floor: location.floor,
    currentGrade: snapshot.currentGrade, funding: snapshot.funding, moveIn: snapshot.moveIn,
    effectiveIntent: snapshot.effectiveIntent, rentalType: snapshot.rentalType, specialReasons: [...snapshot.specialReasons],
    balancePaidAt: snapshot.balancePaidAt, actualMoveInDate: snapshot.actualMoveInDate, revision: snapshot.revision, fetchedAt: snapshot.fetchedAt,
  };
}

/** Task 6 can use ledgerHref; until then detailHref preserves the existing route. */
export function floorplanSelection(projectId: string, unit: UnitLocation, rawContext?: string) {
  if (projectId !== unit.projectId || !/^[a-zA-Z0-9_-]+$/.test(projectId) || !/^[a-zA-Z0-9_-]+$/.test(unit.unitId)) return null;
  const base = `/projects/${projectId}/move-in`;
  const raw = rawContext ?? `${base}/ledger?${new URLSearchParams({ building: unit.buildingNo })}`;
  const context = parseWorkspaceContext(projectId, raw);
  if (!context.valid) return null;
  return { projectId, unitId: unit.unitId, buildingNo: unit.buildingNo, unitNo: unit.unitNo,
    ledgerHref: buildWorkspaceSelectionHref(projectId, raw, unit.unitId), detailHref: `${base}/units/${encodeURIComponent(unit.unitId)}` };
}
