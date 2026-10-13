import 'server-only';
import { loadCurrentUnitSnapshots } from '@/lib/move-in/current-unit-snapshot.server';
import { createServerClient } from '@/lib/supabase/server';
import { readAllRows } from '@/lib/supabase/read-all';
import { toFloorplanUnit } from '@/lib/move-in/floorplan-current';
import type { FloorplanUnit } from '@/lib/move-in/floorplan';
import type { ProjectionResult, QueryCounts } from '@/lib/move-in/ledger-types';

export type FloorplanCurrentResult = Omit<ProjectionResult<FloorplanUnit>, 'queryCounts'> & {
  queryCounts: QueryCounts & { locations: number };
};

/** Current state exclusively comes from Task 2. Extra queries read location, never state/history. */
export async function loadCurrentFloorplanRows(projectId: string, now = new Date()): Promise<FloorplanCurrentResult> {
  const current = await loadCurrentUnitSnapshots(projectId, now);
  const queryCounts = { ...current.queryCounts, locations: 0 };
  const base = { ...current, rows: [] as FloorplanUnit[], queryCounts };
  if (current.error || !current.rows.length) return base;
  try {
    const supabase = await createServerClient();
    type Location = { project_id: string; unit_id: string; building_no: string; unit_no: string; floor: number | null };
    const locations = await readAllRows((from, to) => {
      queryCounts.locations++;
      return supabase.from('project_unit').select('project_id,unit_id,building_no,unit_no,floor', { count: 'exact' })
        .eq('project_id', projectId).order('unit_id').range(from, to).returns<Location[]>();
    });
    if (locations.error) return { ...base, error: true };
    const byUnit = new Map<string, Location[]>();
    for (const loc of locations.data) { const list = byUnit.get(loc.unit_id) ?? []; list.push(loc); byUnit.set(loc.unit_id, list); }
    const rows: FloorplanUnit[] = [];
    let invalidLocations = 0;
    for (const snapshot of current.rows) {
      const locations = byUnit.get(snapshot.unitId) ?? [], loc = locations[0];
      const row = locations.length === 1 && loc ? toFloorplanUnit(snapshot, {
        projectId: loc.project_id, unitId: loc.unit_id, buildingNo: loc.building_no, unitNo: loc.unit_no, floor: loc.floor,
      }) : null;
      if (row) rows.push(row); else invalidLocations++;
    }
    return { ...base, rows, anomalyCount: current.anomalyCount + invalidLocations,
      anomalies: invalidLocations ? { ...current.anomalies, invalid_relation: (current.anomalies.invalid_relation ?? 0) + invalidLocations } : current.anomalies };
  } catch { return { ...base, error: true }; }
}
