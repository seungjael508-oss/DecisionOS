import { createHash } from 'node:crypto';
import { deriveSpecialManagementReasons, resolveEffectiveMoveInIntent, specialManagementPriority } from '@/lib/move-in/intent';
import { usesAssignedCustomerScope } from '@/lib/move-in/field-access';
import type { AnomalyReason, AuthorizedAccess, CurrentUnitRecord, CurrentUnitSnapshot, DealRecord, DealSummary, LedgerSummaryRow, ContactRecord, ContactStatus, SourceTag, SpecialRecord } from '@/lib/move-in/ledger-types';

export function currentRelationAnomaly(unit: CurrentUnitRecord, projectId: string): AnomalyReason | null {
  if (unit.project_id !== projectId) return 'invalid_relation';
  const active = unit.contracts?.filter(c => c.contract_status === 'ACTIVE') ?? [];
  if (!active.length) return 'no_active_contract';
  if (active.length !== 1) return 'multiple_active_contracts';
  const c = active[0], o = unit.occupancy, h = c.holder;
  if (c.project_id !== projectId || c.unit_id !== unit.unit_id || !h || h.project_id !== projectId || h.id !== c.customer_id ||
      !o || o.project_id !== projectId || o.unit_id !== unit.unit_id || o.contract_id !== c.contract_id) return 'invalid_relation';
  return null;
}
export function isCurrentUnitVisible(unit: CurrentUnitRecord, access: AuthorizedAccess): boolean {
  return unit.project_id === access.projectId && (!usesAssignedCustomerScope(access.projectId, access.role) ||
    unit.contracts.some(c => c.contract_status === 'ACTIVE' && c.holder?.assigned_counselor_id === access.memberId));
}
/** A second read fences holder/assignment/snapshot changes during batching. No previous-holder data enters the DTO. */
export function currentIdentityRevision(unit: CurrentUnitRecord): string {
  const active = unit.contracts.filter(c => c.contract_status === 'ACTIVE');
  return JSON.stringify([unit.project_id, unit.unit_id, active.map(c => [c.contract_id, c.customer_id, c.updated_at, c.holder?.assigned_counselor_id]),
    unit.occupancy?.contract_id, unit.occupancy?.updated_at]);
}
export function resolveCurrentUnitSnapshot(input: {
  unit: CurrentUnitRecord; access: AuthorizedAccess; special: SpecialRecord | null; sourceTags: readonly SourceTag[]; now: Date;
}): { kind: 'ok'; snapshot: CurrentUnitSnapshot } | { kind: 'anomaly'; reason: AnomalyReason } {
  const { unit, access, now } = input;
  const reason = currentRelationAnomaly(unit, access.projectId);
  if (reason) return { kind: 'anomaly', reason };
  const c = unit.contracts.find(c => c.contract_status === 'ACTIVE')!, o = unit.occupancy!;
  const special = input.special?.project_id === access.projectId && input.special.unit_id === unit.unit_id && input.special.contract_id === c.contract_id &&
    (access.role !== 'COUNSELOR' || c.holder!.assigned_counselor_id === access.memberId) ? input.special : null;
  const intent = resolveEffectiveMoveInIntent(o.operational_intent, o.occupancy_intent);
  const reasons = deriveSpecialManagementReasons({ effectiveIntent: intent, legacyGrade: o.legacy_grade, fundingStatus: o.funding_status, manuallyFlagged: special?.manually_flagged });
  const sourceTags = [...new Set(input.sourceTags)];
  const sourceReasons = sourceTags.filter(t => t !== 'ONLINE');
  const rank = Math.min(specialManagementPriority(reasons), sourceReasons.length ? 4 : Infinity);
  const current = {
    projectId: access.projectId, unitId: unit.unit_id, currentContractId: c.contract_id, currentCustomerId: c.customer_id,
    currentGrade: o.legacy_grade, funding: o.funding_status, moveIn: o.move_in_status,
    operationalIntent: o.operational_intent, occupancyIntent: o.occupancy_intent,
    effectiveIntent: intent.value, rentalType: intent.rentalType, legacyConsidering: intent.legacyConsidering,
    balancePaidAt: o.balance_paid_at, plannedMoveInDate: o.planned_move_in_date, actualMoveInDate: o.actual_move_in_date,
    specialReasons: [...reasons, ...sourceReasons], specialPriority: Number.isFinite(rank) ? rank : null, sourceTags,
    sourceUpdatedAt: [c.updated_at, o.updated_at, special?.updated_at].filter((v): v is string => !!v).sort().at(-1)!,
  };
  return { kind: 'ok', snapshot: { ...current, fetchedAt: now.toISOString(), revision: createHash('sha256').update(JSON.stringify(current)).digest('hex') } };
}
function currentDeal(snapshot: CurrentUnitSnapshot, deal: DealRecord | null): DealSummary | null {
  if (!deal || deal.project_id !== snapshot.projectId || deal.unit_id !== snapshot.unitId ||
      deal.contract_id !== snapshot.currentContractId || deal.customer_id !== snapshot.currentCustomerId) return null;
  return {
    id: deal.id, consentStatus: deal.consent_status, dealStatus: deal.deal_status,
    enabledTypes: [...(deal.sale_enabled ? ['SALE'] : []), ...(deal.jeonse_enabled ? ['JEONSE'] : []), ...(deal.monthly_rent_enabled ? ['MONTHLY_RENT'] : [])],
    officeIds: [...new Set((deal.offices ?? []).map(o => o.brokerage_office_id))], updatedAt: deal.updated_at,
    askingSalePriceKrw: deal.asking_sale_price_krw, jeonseDepositKrw: deal.jeonse_deposit_krw,
    monthlyRentDepositKrw: deal.monthly_rent_deposit_krw, monthlyRentAmountKrw: deal.monthly_rent_amount_krw,
    saleListingStatus: deal.sale_listing_status, jeonseListingStatus: deal.jeonse_listing_status, monthlyRentListingStatus: deal.monthly_rent_listing_status,
  };
}
const isAbsentAttempt = (c: ContactRecord) => c.structured_tags?.legacy_grade === '부재';
const latestOf = (rows: readonly ContactRecord[]) => rows.reduce<ContactRecord | null>((a, c) => !a || c.consulted_at > a.consulted_at || (c.consulted_at === a.consulted_at && c.id > a.id) ? c : a, null);
/**
 * 현재 ACTIVE 계약자 본인 상담만으로 접촉상태를 계산한다(이전 계약자 기록은 버림).
 * 부재는 시도일만 갱신하고 최종 접촉일에는 넣지 않는다. occupancy.last_contact_at은
 * 구 RPC가 부재 시각으로 덮어쓴 값일 수 있어, 부재 시각과 같으면 실제 접촉으로 보지 않는다.
 */
export function resolveContactState(snapshot: CurrentUnitSnapshot, contacts: readonly ContactRecord[], occupancyLastContactAt: string | null, legacyGrade: string | null) {
  const own = contacts.filter(c => c.project_id === snapshot.projectId && c.unit_id === snapshot.unitId && c.customer_id === snapshot.currentCustomerId);
  const latest = latestOf(own), latestReal = latestOf(own.filter(c => !isAbsentAttempt(c)));
  const absentTimes = new Set(own.filter(isAbsentAttempt).map(c => Date.parse(c.consulted_at)));
  const occupancyReal = occupancyLastContactAt && !absentTimes.has(Date.parse(occupancyLastContactAt)) ? occupancyLastContactAt : null;
  const lastContact = [latestReal?.consulted_at ?? null, occupancyReal].filter((v): v is string => !!v).sort((a, b) => Date.parse(a) - Date.parse(b)).at(-1) ?? null;
  // 이력이 없는 기존 부재 등급 세대는 저장된 값을 근거로 부재로 표시(등급은 바꾸지 않음)
  const contactStatus: ContactStatus = latest ? (isAbsentAttempt(latest) ? 'ABSENT' : 'CONTACTED') : lastContact ? 'CONTACTED' : legacyGrade === '부재' ? 'ABSENT' : 'NONE';
  return { latest, lastContact, lastAttempt: latest?.consulted_at ?? null, contactStatus };
}
export function toLedgerSummaryRow(unit: CurrentUnitRecord, snapshot: CurrentUnitSnapshot, deal: DealRecord | null, contacts: readonly ContactRecord[]): LedgerSummaryRow {
  const holder = unit.contracts.find(c => c.contract_id === snapshot.currentContractId)!.holder!;
  const contact = resolveContactState(snapshot, contacts, unit.occupancy!.last_contact_at, unit.occupancy!.legacy_grade);
  const currentContact = contact.latest;
  const dealSummary = currentDeal(snapshot, deal);
  const dealTypes = snapshot.effectiveIntent === 'SALE_TRANSFER' ? ['SALE'] : snapshot.effectiveIntent === 'RENT' ? [snapshot.rentalType ?? 'RENT'] : [];
  return {
    ...snapshot, buildingNo: unit.building_no, unitNo: unit.unit_no, unitType: unit.unit_type,
    customerName: holder.name, phone: holder.phone, phoneQuality: holder.phone_quality, assigneeId: holder.assigned_counselor_id,
    lastContact: contact.lastContact, lastAttempt: contact.lastAttempt, contactStatus: contact.contactStatus,
    nextContact: unit.occupancy!.next_contact_at ?? currentContact?.next_action_at ?? null,
    dealTypes, dealSummary, deal: dealSummary && { consentStatus: dealSummary.consentStatus, dealStatus: dealSummary.dealStatus, enabledTypes: dealSummary.enabledTypes, officeIds: dealSummary.officeIds },
    views: [...(snapshot.effectiveIntent === 'SALE_TRANSFER' ? ['sale' as const] : []), ...(snapshot.effectiveIntent === 'RENT' ? ['rental' as const] : []), ...(snapshot.specialReasons.length ? ['special' as const] : [])],
    paymentAvailability: 'unregistered', payment: 'UNREGISTERED', balance: null,
  };
}
