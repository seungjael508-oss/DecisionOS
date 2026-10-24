import type { MoveInAccess } from '@/lib/move-in/access';
import type { LedgerFilterRow } from '@/lib/move-in/ledger-filters';
import type { EffectiveIntentValue, RentalType } from '@/lib/move-in/intent';
import type { FundingStatus, MoveInStatus, OccupancyIntent, OperationalIntent } from '@/lib/move-in/labels';
import type { UnitDealTypedFields } from '@/lib/move-in/deals';
import type { DGradeReason } from '@/lib/move-in/d-grade-reasons';
import type { TradeFundingStatus, TradeFundingType } from '@/lib/move-in/trade-funding';
import type { ProblemFlag } from '@/lib/move-in/problem-household';

export type AuthorizedAccess = Extract<MoveInAccess, { ok: true }>;
export type SourceTag = 'ASEL' | 'INVESTOR' | 'DELINQUENT' | 'ONLINE';
export type HolderRecord = { id: string; project_id: string; name: string | null; phone: string | null; phone_quality: string | null; assigned_counselor_id: string | null };
export type ContractRecord = { project_id: string; unit_id: string; contract_id: string; customer_id: string; contract_status: string; updated_at: string; holder: HolderRecord | null };
export type OccupancyRecord = {
  project_id: string; unit_id: string; contract_id: string; legacy_grade: string | null;
  occupancy_intent: OccupancyIntent; operational_intent: OperationalIntent; funding_status: FundingStatus; move_in_status: MoveInStatus;
  last_contact_at: string | null; next_contact_at: string | null; balance_paid_at: string | null;
  planned_move_in_date: string | null; actual_move_in_date: string | null; updated_at: string;
  /** C·D 거래 자금조달 유형(A11). 값 검증은 스냅샷에서 한다 */
  trade_funding_type?: string | null; trade_funding_status?: string | null;
  /** 문제세대(A14). 값 검증은 스냅샷에서 한다 */
  problem_flags?: string[] | null; problem_lock_released?: boolean | null; problem_note?: string | null;
};
/** Narrow DB selection; never a unit detail/history DTO. */
export type CurrentUnitRecord = { project_id: string; unit_id: string; building_no: string; unit_no: string; unit_type: string | null; contracts: ContractRecord[]; occupancy: OccupancyRecord | null };
export type SpecialRecord = { project_id: string; unit_id: string; contract_id: string; manually_flagged: boolean; visit_required?: boolean; updated_at: string };
export type DealRecord = {
  project_id: string; unit_id: string; contract_id: string; customer_id: string; id: string;
  consent_status: string; deal_status: string; sale_enabled: boolean; jeonse_enabled: boolean; monthly_rent_enabled: boolean;
  asking_sale_price_krw: number | null; jeonse_deposit_krw: number | null; monthly_rent_deposit_krw: number | null; monthly_rent_amount_krw: number | null;
  sale_listing_status: UnitDealTypedFields['saleListingStatus']; jeonse_listing_status: UnitDealTypedFields['jeonseListingStatus']; monthly_rent_listing_status: UnitDealTypedFields['monthlyRentListingStatus'];
  updated_at: string; offices: { brokerage_office_id: string }[];
};
/** content는 세대별 최신 상담에만 서버에서 채운다(접촉상태 판정용, 브라우저로 보내지 않음). */
export type ContactRecord = { project_id: string; unit_id: string; customer_id: string; id: string; consulted_at: string; next_action_at: string | null; structured_tags?: { legacy_grade?: unknown } | null; content?: string | null; contact_type?: string | null; channel?: string | null };
/** 최신 상담 기준 접촉상태(contact-outcome 판정). 등급(legacy_grade)과는 별개인 화면 파생값. */
export type ContactStatus = 'CONTACTED' | 'REFUSED' | 'ABSENT' | 'NONE';
export type DealSummary = UnitDealTypedFields & { id: string; consentStatus: string; dealStatus: string; enabledTypes: string[]; officeIds: string[]; updatedAt: string };
export type CurrentUnitSnapshot = {
  projectId: string; unitId: string; currentContractId: string; currentCustomerId: string;
  currentGrade: string | null; funding: FundingStatus; moveIn: MoveInStatus;
  operationalIntent: OperationalIntent; occupancyIntent: OccupancyIntent;
  effectiveIntent: EffectiveIntentValue; rentalType: RentalType; legacyConsidering: boolean;
  balancePaidAt: string | null; plannedMoveInDate: string | null; actualMoveInDate: string | null;
  tradeFundingType: TradeFundingType | null; tradeFundingStatus: TradeFundingStatus | null;
  /** 문제세대 적색 표기. problemLockReleased = 관리자 최종 해제 승인(입주완료 처리 허용) */
  problemFlags: ProblemFlag[]; problemLockReleased: boolean; problemNote: string | null;
  specialReasons: string[]; specialPriority: number | null; sourceTags: SourceTag[];
  sourceUpdatedAt: string; fetchedAt: string; revision: string;
};
export type LedgerSummaryRow = LedgerFilterRow & CurrentUnitSnapshot & {
  unitType: string | null; phoneQuality: string | null; lastContact: string | null;
  contactStatus: ContactStatus; lastAttempt: string | null;
  dealSummary: DealSummary | null; paymentAvailability: 'unregistered';
  contractAddress?: string | null;
  /** D등급 관리 사유(서버 판정, D가 아니면 빈 배열) */
  dGradeReasons: DGradeReason[];
  /** 현재 계약자 연속 전화 부재 횟수(마지막 실제 접촉 이후) */
  absenceStreak: number;
  /** 같은 세대에 현재 계약 외 계약이 있음(명의변경·해지 등). 발코니·옵션을 자동 연결하지 않는다 */
  contractHistory?: boolean;
  /** 금액·잔금 가상계좌(서버 판정). 계좌는 권한 있는 역할에게만 채운다 */
  finance?: LedgerFinance;
};
/** 세대 상세 잔금 가상계좌(아파트 분양 잔금 전용). restricted = 열람 권한 없음, unknown = 현재 계약 결속 미확인 */
export type BalanceAccountView = { kind: 'ok'; bank: string; number: string } | { kind: 'restricted' } | { kind: 'unknown' };
/** 발코니·옵션 1종의 금액. null이면 미확인(자료 없음·계약자 불일치·전매) */
export type LedgerFinancePart = { amount: number; paid: number; unpaid: number; overdue: boolean; /** 초과입금·미환불 있음(확인 필요) */ excess: boolean };
/** 완납·일부 납부·미납·연체·미확인. 분양대금이 확인되지 않거나 확인된 금액만으로 완납을 단정할 수 없으면 미확인 */
export type LedgerPaymentStatus = 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERDUE' | 'UNKNOWN';
export type LedgerFinance = {
  status: LedgerPaymentStatus;
  salePrice: number | null; salePaid: number | null; saleBalance: number | null;
  balcony: LedgerFinancePart | null; option: LedgerFinancePart | null;
  /** 확인된 금액의 미납 합계(분양 잔금 + 발코니·옵션 미납). 분양대금 미확인이면 null */
  totalUnpaid: number | null;
  /** 발코니·옵션 중 미확인이 있어 전체 미납이 일부 금액만 합친 값인지 */
  partial: boolean;
  /** 분양 잔금 전용 가상계좌(발코니·옵션 계좌 아님) */
  account: { bank: string; number: string } | null;
  accountRestricted: boolean;
};
/** 브라우저로 직렬화하지 않는 서버 전용 필드(851세대 초기 HTML 크기 절감). 클라이언트에서 읽으면 타입 오류. */
export const LEDGER_SERVER_ONLY_KEYS = ['revision', 'sourceUpdatedAt', 'fetchedAt', 'paymentAvailability', 'dealSummary'] as const;
export type LedgerClientRow = Omit<LedgerSummaryRow, (typeof LEDGER_SERVER_ONLY_KEYS)[number]>;
export type AnomalyReason = 'no_active_contract' | 'multiple_active_contracts' | 'invalid_relation' | 'duplicate_unit' | 'changed_during_read';
export type QueryCounts = { current: number; contacts: number; deals: number; special: number; recheck: number };
export type ProjectionResult<T> = {
  error: boolean; rows: T[]; anomalyCount: number; anomalies: Partial<Record<AnomalyReason, number>>;
  snapshotAsOf: string; queryCounts: QueryCounts;
  /** 근거 조회 실패로 이번 응답에서 판정하지 못한 D등급 관리 사유 */
  dGradeReasonUnavailable?: DGradeReason[];
};
