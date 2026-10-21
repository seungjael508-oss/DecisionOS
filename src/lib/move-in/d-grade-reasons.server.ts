import 'server-only';
import { createServerClient } from '@/lib/supabase/server';
import { readByIds } from '@/lib/supabase/read-by-ids';
import { approvedUnitSourceTags } from '@/lib/move-in/ledger-source-tags.server';
import { deriveDGradeReasons, type DGradeContact, type DGradeHistory, type DGradeReason } from '@/lib/move-in/d-grade-reasons';
import { absenceContactType } from '@/lib/move-in/consultation';
import type { Json } from '@/lib/supabase/types';

/** 서버에서 이미 현재 ACTIVE 계약으로 확인된 D등급 세대. URL·브라우저 값은 넣지 않는다. */
export type DGradeReasonUnit = {
  unitId: string; contractId: string; customerId: string;
  buildingNo: string; unitNo: string; currentGrade: string | null; funding: string | null; moveIn: string | null;
};
export type DGradeReasonResult = {
  error: boolean;
  byUnit: Map<string, DGradeReason[]>;
  /** 조회 실패로 이번 응답에서 판정하지 못한 사유(해당 사유는 어느 세대에도 붙이지 않음) */
  unavailable: DGradeReason[];
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * D등급 세대만 대상으로 사유 근거를 같은 세션(RLS)으로 읽는다.
 * - 상담: 현재 계약자 본인 기록만(장기 부재·C등급 하향)
 * - 계약: 같은 세대의 다른 계약 존재 여부(아셀·연체 명단은 동·호수만 있어 계약자 교체 세대는 연결하지 않음)
 * - 등급 변경 이력: 현재 계약의 legacy_grade 변경만(C등급 하향)
 */
export async function loadDGradeReasons(projectId: string, units: readonly DGradeReasonUnit[]): Promise<DGradeReasonResult> {
  const byUnit = new Map<string, DGradeReason[]>();
  const targets = units.filter(u => u.currentGrade === 'D' && uuid.test(u.unitId) && uuid.test(u.contractId) && uuid.test(u.customerId));
  if (!targets.length) return { error: false, byUnit, unavailable: [] };
  const ids = targets.map(u => u.unitId);
  const supabase = await createServerClient();
  const [contacts, contracts, history] = await Promise.all([
    readByIds<{ id: string; unit_id: string; customer_id: string; consulted_at: string; contact_type: string | null; channel: string | null; structured_tags: { legacy_grade?: unknown } | null }>(ids, (batch, from, to) =>
      supabase.from('consultation').select('id,unit_id,customer_id,consulted_at,contact_type,channel,structured_tags')
        .eq('project_id', projectId).in('unit_id', batch).order('unit_id').order('id').range(from, to)
        .returns<{ id: string; unit_id: string; customer_id: string; consulted_at: string; contact_type: string | null; channel: string | null; structured_tags: { legacy_grade?: unknown } | null }[]>(), 100, 4),
    readByIds<{ unit_id: string; contract_id: string }>(ids, (batch, from, to) =>
      supabase.from('contract').select('unit_id,contract_id').eq('project_id', projectId).in('unit_id', batch).order('contract_id').range(from, to)
        .returns<{ unit_id: string; contract_id: string }[]>(), 100, 4),
    readByIds<{ history_id: string; unit_id: string; contract_id: string; changed_at: string; previous_value: string | null; new_value: string | null }>(ids, (batch, from, to) =>
      supabase.from('contract_status_history').select('history_id,unit_id,contract_id,changed_at,previous_value,new_value')
        .eq('project_id', projectId).eq('field_changed', 'legacy_grade').in('unit_id', batch).order('history_id').range(from, to)
        .returns<{ history_id: string; unit_id: string; contract_id: string; changed_at: string; previous_value: string | null; new_value: string | null }[]>(), 100, 4),
  ]);
  const unavailable = new Set<DGradeReason>();
  if (contacts.error) { unavailable.add('ABSENCE_STREAK'); unavailable.add('C_DOWNGRADE'); }
  if (history.error) unavailable.add('C_DOWNGRADE');
  if (contracts.error) { unavailable.add('ASEL'); unavailable.add('DELINQUENT'); }

  for (const unit of targets) {
    const own: DGradeContact[] | null = contacts.error ? null : contacts.data
      .filter(c => c.unit_id === unit.unitId && c.customer_id === unit.customerId)
      .map(c => ({ id: c.id, consultedAt: c.consulted_at, contactType: absenceContactType(projectId, c.contact_type, c.channel, c.structured_tags as Json | null),
        legacyGrade: typeof c.structured_tags?.legacy_grade === 'string' ? c.structured_tags.legacy_grade : null }));
    const unitContracts = contracts.error ? null : contracts.data.filter(c => c.unit_id === unit.unitId);
    // 현재 계약이 보이지 않으면(RLS·경합) 확인 불가로 둔다
    const holderChanged = !unitContracts || !unitContracts.some(c => c.contract_id === unit.contractId) ? null
      : unitContracts.some(c => c.contract_id !== unit.contractId);
    const gradeHistory: DGradeHistory[] | null = history.error ? null : history.data
      .filter(h => h.unit_id === unit.unitId && h.contract_id === unit.contractId)
      .map(h => ({ id: h.history_id, changedAt: h.changed_at, previousValue: h.previous_value, newValue: h.new_value }));
    byUnit.set(unit.unitId, deriveDGradeReasons({
      currentGrade: unit.currentGrade,
      sourceTags: approvedUnitSourceTags(projectId, unit.buildingNo, unit.unitNo),
      holderChanged, funding: unit.funding, moveIn: unit.moveIn, contacts: own, gradeHistory,
    }));
  }
  return { error: contacts.error && contracts.error && history.error, byUnit, unavailable: [...unavailable] };
}
