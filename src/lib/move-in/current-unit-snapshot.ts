import { createHash } from 'node:crypto';
import { deriveSpecialManagementReasons, resolveEffectiveMoveInIntent, specialManagementPriority } from '@/lib/move-in/intent';
import { usesAssignedCustomerScope } from '@/lib/move-in/field-access';
import type { AnomalyReason, AuthorizedAccess, CurrentUnitRecord, CurrentUnitSnapshot, DealRecord, DealSummary, LedgerSummaryRow, ContactRecord, SourceTag, SpecialRecord } from '@/lib/move-in/ledger-types';

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
export function toLedgerSummaryRow(unit: CurrentUnitRecord, snapshot: CurrentUnitSnapshot, deal: DealRecord | null, contact: ContactRecord | null): LedgerSummaryRow {
  const holder = unit.contracts.find(c => c.contract_id === snapshot.currentContractId)!.holder!;
  const currentContact = contact?.project_id === snapshot.projectId && contact.unit_id === snapshot.unitId && contact.customer_id === snapshot.currentCustomerId ? contact : null;
  const dealSummary = currentDeal(snapshot, deal);
  const dealTypes = snapshot.effectiveIntent === 'SALE_TRANSFER' ? ['SALE'] : snapshot.effectiveIntent === 'RENT' ? [snapshot.rentalType ?? 'RENT'] : [];
  return {
    ...snapshot, buildingNo: unit.building_no, unitNo: unit.unit_no, unitType: unit.unit_type,
    customerName: holder.name, phone: holder.phone, phoneQuality: holder.phone_quality, assigneeId: holder.assigned_counselor_id,
    lastContact: currentContact?.consulted_at ?? unit.occupancy!.last_contact_at,
    nextContact: unit.occupancy!.next_contact_at ?? currentContact?.next_action_at ?? null,
    dealTypes, dealSummary, deal: dealSummary && { consentStatus: dealSummary.consentStatus, dealStatus: dealSummary.dealStatus, enabledTypes: dealSummary.enabledTypes, officeIds: dealSummary.officeIds },
    views: [...(snapshot.effectiveIntent === 'SALE_TRANSFER' ? ['sale' as const] : []), ...(snapshot.effectiveIntent === 'RENT' ? ['rental' as const] : []), ...(snapshot.specialReasons.length ? ['special' as const] : [])],
    paymentAvailability: 'unregistered', payment: 'UNREGISTERED', balance: null,
  };
}
