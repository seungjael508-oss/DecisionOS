import type { MoveInAccess } from '@/lib/move-in/access';
import type { LedgerFilterRow } from '@/lib/move-in/ledger-filters';
import type { EffectiveIntentValue, RentalType } from '@/lib/move-in/intent';
import type { FundingStatus, MoveInStatus, OccupancyIntent, OperationalIntent } from '@/lib/move-in/labels';
import type { UnitDealTypedFields } from '@/lib/move-in/deals';

export type AuthorizedAccess = Extract<MoveInAccess, { ok: true }>;
export type SourceTag = 'ASEL' | 'INVESTOR' | 'DELINQUENT' | 'ONLINE';
export type HolderRecord = { id: string; project_id: string; name: string | null; phone: string | null; phone_quality: string | null; assigned_counselor_id: string | null };
export type ContractRecord = { project_id: string; unit_id: string; contract_id: string; customer_id: string; contract_status: string; updated_at: string; holder: HolderRecord | null };
export type OccupancyRecord = {
  project_id: string; unit_id: string; contract_id: string; legacy_grade: string | null;
  occupancy_intent: OccupancyIntent; operational_intent: OperationalIntent; funding_status: FundingStatus; move_in_status: MoveInStatus;
  last_contact_at: string | null; next_contact_at: string | null; balance_paid_at: string | null;
  planned_move_in_date: string | null; actual_move_in_date: string | null; updated_at: string;
};
/** Narrow DB selection; never a unit detail/history DTO. */
export type CurrentUnitRecord = { project_id: string; unit_id: string; building_no: string; unit_no: string; unit_type: string | null; contracts: ContractRecord[]; occupancy: OccupancyRecord | null };
export type SpecialRecord = { project_id: string; unit_id: string; contract_id: string; manually_flagged: boolean; updated_at: string };
export type DealRecord = {
  project_id: string; unit_id: string; contract_id: string; customer_id: string; id: string;
  consent_status: string; deal_status: string; sale_enabled: boolean; jeonse_enabled: boolean; monthly_rent_enabled: boolean;
  asking_sale_price_krw: number | null; jeonse_deposit_krw: number | null; monthly_rent_deposit_krw: number | null; monthly_rent_amount_krw: number | null;
  sale_listing_status: UnitDealTypedFields['saleListingStatus']; jeonse_listing_status: UnitDealTypedFields['jeonseListingStatus']; monthly_rent_listing_status: UnitDealTypedFields['monthlyRentListingStatus'];
  updated_at: string; offices: { brokerage_office_id: string }[];
};
export type ContactRecord = { project_id: string; unit_id: string; customer_id: string; id: string; consulted_at: string; next_action_at: string | null };
export type DealSummary = UnitDealTypedFields & { id: string; consentStatus: string; dealStatus: string; enabledTypes: string[]; officeIds: string[]; updatedAt: string };
export type CurrentUnitSnapshot = {
  projectId: string; unitId: string; currentContractId: string; currentCustomerId: string;
  currentGrade: string | null; funding: FundingStatus; moveIn: MoveInStatus;
  operationalIntent: OperationalIntent; occupancyIntent: OccupancyIntent;
  effectiveIntent: EffectiveIntentValue; rentalType: RentalType; legacyConsidering: boolean;
  balancePaidAt: string | null; plannedMoveInDate: string | null; actualMoveInDate: string | null;
  specialReasons: string[]; specialPriority: number | null; sourceTags: SourceTag[];
  sourceUpdatedAt: string; fetchedAt: string; revision: string;
};
export type LedgerSummaryRow = LedgerFilterRow & CurrentUnitSnapshot & {
  unitType: string | null; phoneQuality: string | null; lastContact: string | null;
  dealSummary: DealSummary | null; paymentAvailability: 'unregistered';
};
export type AnomalyReason = 'no_active_contract' | 'multiple_active_contracts' | 'invalid_relation' | 'duplicate_unit' | 'changed_during_read';
export type QueryCounts = { current: number; contacts: number; deals: number; special: number; recheck: number };
export type ProjectionResult<T> = {
  error: boolean; rows: T[]; anomalyCount: number; anomalies: Partial<Record<AnomalyReason, number>>;
  snapshotAsOf: string; queryCounts: QueryCounts;
};
