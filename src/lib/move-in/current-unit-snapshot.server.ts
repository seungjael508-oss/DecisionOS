import 'server-only';
import { attachLedgerManagement } from '@/lib/move-in/ledger-management.server';
import { requireMoveInAccess } from '@/lib/move-in/access';
import { createServerClient } from '@/lib/supabase/server';
import { readAllRows } from '@/lib/supabase/read-all';
import { readByIds } from '@/lib/supabase/read-by-ids';
import { currentIdentityRevision, currentRelationAnomaly, isCurrentUnitVisible, resolveCurrentUnitSnapshot, toLedgerSummaryRow } from '@/lib/move-in/current-unit-snapshot';
import { approvedUnitSourceTags } from '@/lib/move-in/ledger-source-tags.server';
import type { AnomalyReason, CurrentUnitRecord, CurrentUnitSnapshot, DealRecord, SpecialRecord, ContactRecord, LedgerSummaryRow, ProjectionResult, QueryCounts } from '@/lib/move-in/ledger-types';

const CURRENT_SELECT = `project_id,unit_id,building_no,unit_no,unit_type,
  occupancy:unit_occupancy_status!unit_occupancy_status_project_id_unit_id_fkey(project_id,unit_id,contract_id,legacy_grade,funding_status,move_in_status,operational_intent,occupancy_intent,balance_paid_at,planned_move_in_date,actual_move_in_date,last_contact_at,next_contact_at,updated_at),
  contracts:contract!contract_project_id_unit_id_fkey(project_id,unit_id,contract_id,customer_id,contract_status,updated_at,
    holder:customer!contract_customer_id_project_id_fkey(project_id,id,name,phone,phone_quality,assigned_counselor_id))`;
const RECHECK_SELECT = `project_id,unit_id,
  occupancy:unit_occupancy_status!unit_occupancy_status_project_id_unit_id_fkey(project_id,unit_id,contract_id,updated_at),
  contracts:contract!contract_project_id_unit_id_fkey(project_id,unit_id,contract_id,customer_id,contract_status,updated_at,
    holder:customer!contract_customer_id_project_id_fkey(project_id,id,assigned_counselor_id))`;
const DEAL_SELECT = `project_id,unit_id,contract_id,customer_id,id,consent_status,deal_status,sale_enabled,jeonse_enabled,monthly_rent_enabled,
  asking_sale_price_krw,jeonse_deposit_krw,monthly_rent_deposit_krw,monthly_rent_amount_krw,sale_listing_status,jeonse_listing_status,monthly_rent_listing_status,updated_at,
  offices:unit_deal_brokerage!unit_deal_brokerage_unit_deal_id_fkey(brokerage_office_id)`;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function groupByUnit<T extends { unit_id: string }>(rows: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) { const group = map.get(row.unit_id) ?? []; group.push(row); map.set(row.unit_id, group); }
  return map;
}

/** Server session + RLS are always re-used; callers cannot supply an elevated access/client. */
export async function readAuthorizedCurrentProjection(projectId: string, now: Date, summary: boolean): Promise<ProjectionResult<LedgerSummaryRow | CurrentUnitSnapshot>> {
  const queryCounts: QueryCounts = { current: 0, contacts: 0, deals: 0, special: 0, recheck: 0 };
  const empty = { rows: [], anomalyCount: 0, anomalies: {}, snapshotAsOf: now.toISOString(), queryCounts };
  const failure = () => ({ ...empty, error: true });
  try {
    const access = await requireMoveInAccess(projectId);
    if (!access.ok || access.projectId !== projectId) return failure();
    const supabase = await createServerClient();
    const readCurrent = (recheck: boolean) => readAllRows((from, to) => {
      queryCounts[recheck ? 'recheck' : 'current']++;
      return supabase.from('project_unit').select(recheck ? RECHECK_SELECT : CURRENT_SELECT, { count: 'exact' })
        .eq('project_id', projectId).eq('contracts.contract_status', 'ACTIVE').order('unit_id').range(from, to).returns<CurrentUnitRecord[]>();
    }, summary ? 1000 : 500);
    const base = await readCurrent(false);
    if (base.error) return failure();
    const anomalies: Partial<Record<AnomalyReason, number>> = {};
    const flag = (reason: AnomalyReason) => { anomalies[reason] = (anomalies[reason] ?? 0) + 1; };
    const current: CurrentUnitRecord[] = [];
    for (const group of groupByUnit(base.data).values()) {
      const u = group[0];
      if (u.project_id !== projectId) continue;
      if (group.length !== 1) { flag('duplicate_unit'); continue; }
      const reason = currentRelationAnomaly(u, projectId);
      if (reason) { flag(reason); continue; }
      if (isCurrentUnitVisible(u, access)) current.push(u);
    }
    const finish = (rows: (LedgerSummaryRow | CurrentUnitSnapshot)[]) => ({
      error: false, rows, snapshotAsOf: now.toISOString(), queryCounts,
      // A counselor must not learn counts for inaccessible project units.
      anomalyCount: access.role === 'COUNSELOR' ? 0 : Object.values(anomalies).reduce((a, b) => a + b, 0),
      anomalies: access.role === 'COUNSELOR' ? {} : anomalies,
    });
    if (!current.length) return finish([]);
    const byUnit = new Map(current.map(u => [u.unit_id, u]));
    const currentCustomer = new Map(current.map(u => [u.unit_id, u.contracts.find(c => c.contract_status === 'ACTIVE')!.customer_id]));
    // These identifiers came from the authorized DB response, never URL filters.
    if (current.some(u => !uuid.test(u.unit_id) || !uuid.test(currentCustomer.get(u.unit_id)!))) return failure();
    // Disjoint UUID ranges avoid repeating every unit ID in the parent IN filter.
    // The embedded predicate still matches each exact (unit, current customer)
    // pair BEFORE limit(1). Keep the left embed so no-history units are retained.
    const contacts = async () => summary ? readByIds(current.map(u => u.unit_id).sort(), (ids, from, to) => {
      queryCounts.contacts++;
      return supabase.from('project_unit')
        .select('project_id,unit_id,contact:consultation!consultation_unit_project_fkey(project_id,unit_id,customer_id,id,consulted_at,next_action_at)', { count: 'exact' })
        .eq('project_id', projectId).gte('unit_id', ids[0]).lte('unit_id', ids[ids.length - 1]).eq('contact.project_id', projectId)
        .or(ids.map(id => `and(unit_id.eq.${id},customer_id.eq.${currentCustomer.get(id)})`).join(','), { referencedTable: 'contact' })
        .order('unit_id').order('consulted_at', { referencedTable: 'contact', ascending: false }).order('id', { referencedTable: 'contact', ascending: false })
        .limit(1, { referencedTable: 'contact' }).range(from, to).returns<{ project_id: string; unit_id: string; contact: ContactRecord[] }[]>();
    // 64 pairs fit below an 8KB gateway limit, including the range bounds.
    }, 64) : { data: [], error: false };
    // Additive schema capabilities were verified in the disposable gate. This narrow
    // cast affects only the table name; .returns enforces the selected projection type.
    const special = () => readAllRows((from, to) => {
      queryCounts.special++;
      return supabase.from('move_in_special_case' as 'unit_deal').select('project_id,unit_id,contract_id,manually_flagged,updated_at', { count: 'exact' })
        .eq('project_id', projectId).order('unit_id').order('contract_id').range(from, to).returns<SpecialRecord[]>();
    }, summary ? 1000 : 500);
    const deals = async () => summary ? readAllRows((from, to) => {
      queryCounts.deals++;
      return supabase.from('unit_deal').select(DEAL_SELECT, { count: 'exact' }).eq('project_id', projectId).order('unit_id').range(from, to).returns<DealRecord[]>();
    }, 1000) : { data: [], error: false };
    const [s, d, c] = await Promise.all([special(), deals(), contacts()]);
    if (s.error || d.error || c.error) return failure();
    const recheck = await readCurrent(true);
    if (recheck.error) return failure();
    const finalByUnit = groupByUnit(recheck.data), specialByUnit = groupByUnit(s.data), dealByUnit = groupByUnit(d.data);
    const contactByUnit = new Map(c.data.filter(r => r.project_id === projectId).map(r => [r.unit_id, r.contact?.[0] ?? null]));
    const rows: (CurrentUnitSnapshot | LedgerSummaryRow)[] = [];
    for (const unit of byUnit.values()) {
      const final = finalByUnit.get(unit.unit_id);
      if (!final || final.length !== 1 || currentRelationAnomaly(final[0], projectId) || !isCurrentUnitVisible(final[0], access) ||
        currentIdentityRevision(final[0]) !== currentIdentityRevision(unit)) { flag('changed_during_read'); continue; }
      const contractId = unit.occupancy!.contract_id;
      const matchingSpecial = (specialByUnit.get(unit.unit_id) ?? []).filter(s => s.project_id === projectId && s.contract_id === contractId);
      const result = resolveCurrentUnitSnapshot({ unit, access, now, special: matchingSpecial.length === 1 ? matchingSpecial[0] : null,
        sourceTags: approvedUnitSourceTags(projectId, unit.building_no, unit.unit_no) });
      if (result.kind === 'anomaly') { flag(result.reason); continue; }
      const ds = dealByUnit.get(unit.unit_id) ?? [];
      rows.push(summary ? attachLedgerManagement(toLedgerSummaryRow(unit, result.snapshot, ds.length === 1 ? ds[0] : null, contactByUnit.get(unit.unit_id) ?? null)) : result.snapshot);
    }
    return finish(rows);
  } catch { return failure(); }
}

export async function loadCurrentUnitSnapshots(projectId: string, now = new Date()): Promise<ProjectionResult<CurrentUnitSnapshot>> {
  return readAuthorizedCurrentProjection(projectId, now, false);
}
