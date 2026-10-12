import 'server-only';
import { attachLedgerManagement } from '@/lib/move-in/ledger-management.server';
import { attachContractAddress } from '@/lib/move-in/contract-address.server';
import { requireMoveInAccess } from '@/lib/move-in/access';
import { createServerClient } from '@/lib/supabase/server';
import { readAllRows } from '@/lib/supabase/read-all';
import { readByUuidRanges } from '@/lib/supabase/read-by-uuid-range';
import { currentIdentityRevision, currentRelationAnomaly, isCurrentUnitVisible, latestOf, resolveCurrentUnitSnapshot, toLedgerSummaryRow } from '@/lib/move-in/current-unit-snapshot';
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
      // count 없이 짧은 페이지로 종료한다: 행마다 RLS 함수를 평가하므로 count=exact는 같은 평가를 한 번 더 한다.
      return supabase.from('project_unit').select(recheck ? RECHECK_SELECT : CURRENT_SELECT)
        .eq('project_id', projectId).eq('contracts.contract_status', 'ACTIVE').order('unit_id').range(from, to).returns<CurrentUnitRecord[]>();
    }, summary ? 1000 : 500);
    // 상담 이력은 세대 목록과 독립이라 동시에 읽는다(권한 확인 이후). 예전 방식(현재 계약자 쌍 OR 필터 14배치)은
    // 세대 목록을 받은 뒤에야 시작해 critical path에 약 2.5s를 더했다. 행 범위는 같은 세션 RLS가 그대로 정한다.
    const contactsRead = summary ? readByUuidRanges<ContactRecord>(({ lower, upper }, from, to) => {
      queryCounts.contacts++;
      const query = supabase.from('consultation').select('project_id,unit_id,customer_id,id,consulted_at,next_action_at,structured_tags')
        .eq('project_id', projectId).gte('unit_id', lower);
      return (upper ? query.lt('unit_id', upper) : query).order('unit_id').order('consulted_at', { ascending: false }).order('id', { ascending: false }).range(from, to).returns<ContactRecord[]>();
    }) : Promise.resolve({ data: [] as ContactRecord[], error: false });
    const base = await readCurrent(false);
    if (base.error) { await contactsRead; return failure(); }
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
    // limit 없이 현재 계약자 이력 전체: 최신 기록이 부재여도 마지막 실제 접촉일을 정확히 계산.
    // (세대, 현재 계약자) 쌍이 정확히 일치하는 기록만 남긴다(이전 계약자 기록 제외 — 기존 OR 필터와 같은 조건).
    const contacts = async () => {
      const all = await contactsRead;
      if (all.error) return { data: [] as { project_id: string; unit_id: string; contact: ContactRecord[] }[], error: true };
      const byUnit = new Map<string, ContactRecord[]>();
      for (const row of all.data) {
        if (row.project_id !== projectId || currentCustomer.get(row.unit_id) !== row.customer_id) continue;
        const group = byUnit.get(row.unit_id) ?? []; group.push(row); byUnit.set(row.unit_id, group);
      }
      const withContent = await attachLatestContent(byUnit);
      if (!withContent) return { data: [] as { project_id: string; unit_id: string; contact: ContactRecord[] }[], error: true };
      return { data: [...byUnit].map(([unit_id, contact]) => ({ project_id: projectId, unit_id, contact })), error: false };
    };
    // 접촉상태 판정은 세대별 최신 상담 내용만 필요하다. 전체 이력 content를 받으면 원장 응답이 커지므로
    // 최신 상담 id만 따로 조회한다(같은 세션 RLS, 150건씩 병렬 — URL 길이 제한).
    const attachLatestContent = async (byUnit: Map<string, ContactRecord[]>) => {
      const latestIds = [...byUnit.values()].map(group => latestOf(group)!.id).filter(id => uuid.test(id));
      const chunks = Array.from({ length: Math.ceil(latestIds.length / 150) }, (_, i) => latestIds.slice(i * 150, (i + 1) * 150));
      const results = await Promise.all(chunks.map(ids => {
        queryCounts.contacts++;
        return supabase.from('consultation').select('id,content').eq('project_id', projectId).in('id', ids).returns<{ id: string; content: string | null }[]>();
      }));
      if (results.some(r => r.error)) return false;
      const contentById = new Map(results.flatMap(r => r.data ?? []).map(r => [r.id, r.content]));
      for (const [unitId, group] of byUnit) {
        byUnit.set(unitId, group.map(c => contentById.has(c.id) ? { ...c, content: contentById.get(c.id) } : c));
      }
      return true;
    };
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
    const contactByUnit = new Map(c.data.filter(r => r.project_id === projectId).map(r => [r.unit_id, r.contact ?? []]));
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
      rows.push(summary ? attachContractAddress(attachLedgerManagement(toLedgerSummaryRow(unit, result.snapshot, ds.length === 1 ? ds[0] : null, contactByUnit.get(unit.unit_id) ?? []))) : result.snapshot);
    }
    return finish(rows);
  } catch { return failure(); }
}

export async function loadCurrentUnitSnapshots(projectId: string, now = new Date()): Promise<ProjectionResult<CurrentUnitSnapshot>> {
  return readAuthorizedCurrentProjection(projectId, now, false);
}
