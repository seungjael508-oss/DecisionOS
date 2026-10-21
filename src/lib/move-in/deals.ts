import { filterCallRows, type CallListRow } from "@/lib/move-in/calls";
import type { Json } from "@/lib/supabase/types";
import {
  deriveSpecialManagementReasons,
  matchesSpecialManagementFilter,
  resolveEffectiveMoveInIntent,
  specialManagementPriority,
  type EffectiveIntentValue,
  type SpecialManagementFilter,
  type SpecialManagementReason,
} from "@/lib/move-in/intent";
import type { FundingStatus, OperationalIntent } from "@/lib/move-in/labels";

export const CONSENT_STATUS_VALUES = ["CONSENTED", "NOT_CONSENTED"] as const;
export type ConsentStatus = (typeof CONSENT_STATUS_VALUES)[number];

export const DEAL_STATUS_VALUES = ["IN_PROGRESS", "COMPLETED"] as const;
export type DealStatus = (typeof DEAL_STATUS_VALUES)[number];

export const CONSENT_STATUS_LABELS: Record<ConsentStatus, string> = {
  CONSENTED: "동의",
  NOT_CONSENTED: "미동의",
};

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  IN_PROGRESS: "진행중",
  COMPLETED: "거래완료",
};

export type DealListRow = CallListRow & {
  assignedCounselorName?: string | null;
  contractId: string;
  consentStatus: ConsentStatus | null;
  dealStatus: DealStatus | null;
  saleEnabled: boolean;
  jeonseEnabled: boolean;
  monthlyRentEnabled: boolean;
  brokerageCount: number;
  updatedAt: string | null;
  officeIds: string[];
  unitType?: string | null;
  currentContractId?: string | null;
  effectiveIntent?: EffectiveIntentValue;
  rentalType?: "JEONSE" | "MONTHLY_RENT" | null;
  legacyConsidering?: boolean;
  specialReasons?: SpecialManagementReason[];
  specialPriority?: number;
  manuallyFlagged?: boolean;
  visitRequired?: boolean;
  abandonmentDocumentReceived?: boolean;
  terminationDocumentReceived?: boolean;
  legalConsultationRequired?: boolean;
  legalConsultationStatus?: string | null;
  processingStatus?: string | null;
  specialMemo?: string | null;
  lastContactAt?: string | null;
  nextContactAt?: string | null;
  typed?: UnitDealTypedFields;
};

export const DEAL_TAB_VALUES = ["sale", "rental", "special"] as const;
export type DealTab = (typeof DEAL_TAB_VALUES)[number];

export const DEAL_FUNDING_FILTER_VALUES = [
  "NORMAL", "UNKNOWN", "NO_LOAN_NEEDED", "LOAN_NEEDED", "LOAN_CONSULTING",
  "LOAN_APPROVED", "LOAN_LIMIT_SHORTAGE", "FUNDING_SHORTAGE", "EXISTING_HOME_UNSOLD",
] as const satisfies readonly FundingStatus[];

export type UnitDealTypedFields = {
  askingSalePriceKrw: number | null;
  jeonseDepositKrw: number | null;
  monthlyRentDepositKrw: number | null;
  monthlyRentAmountKrw: number | null;
  saleListingStatus: "NOT_LISTED" | "PREPARING" | "LISTED" | "PAUSED" | null;
  jeonseListingStatus: "NOT_LISTED" | "PREPARING" | "LISTED" | "PAUSED" | null;
  monthlyRentListingStatus: "NOT_LISTED" | "PREPARING" | "LISTED" | "PAUSED" | null;
};

export const UNIT_DEAL_LISTING_STATUS_VALUES = ["NOT_LISTED", "PREPARING", "LISTED", "PAUSED"] as const;
export type UnitDealListingStatus = (typeof UNIT_DEAL_LISTING_STATUS_VALUES)[number];

export function isUnitDealListingStatus(value: string): value is UnitDealListingStatus {
  return (UNIT_DEAL_LISTING_STATUS_VALUES as readonly string[]).includes(value);
}

export const EMPTY_UNIT_DEAL_TYPED_FIELDS: UnitDealTypedFields = {
  askingSalePriceKrw: null,
  jeonseDepositKrw: null,
  monthlyRentDepositKrw: null,
  monthlyRentAmountKrw: null,
  saleListingStatus: null,
  jeonseListingStatus: null,
  monthlyRentListingStatus: null,
};

export type DealListFilters = {
  q: string;
  consentStatus: ConsentStatus | "";
  dealStatus: DealStatus | "";
  saleEnabled: "" | "1";
  jeonseEnabled: "" | "1";
  monthlyRentEnabled: "" | "1";
  brokerageOfficeId: string;
  tab?: DealTab;
  fundingStatus?: FundingStatus[];
  specialReason?: SpecialManagementFilter | "";
  sort?: "priority" | "unit" | "name";
  direction?: "asc" | "desc";
};

export type DealBrokerageInput = {
  brokerageOfficeId: string;
  brokerageContactId: string | null;
};

export type UnitDealRecord = {
  consentStatus: ConsentStatus;
  dealStatus: DealStatus;
  saleEnabled: boolean;
  jeonseEnabled: boolean;
  monthlyRentEnabled: boolean;
  saleNote: string;
  jeonseNote: string;
  monthlyRentNote: string;
  details: string;
  brokerages: DealBrokerageInput[];
  typed?: UnitDealTypedFields;
};

export type SaveMoveInUnitDealInput = {
  projectId: string;
  unitId: string;
  contractId: string;
  customerId: string;
} & UnitDealRecord;

export type SaveMoveInUnitDealArgs = {
  p_project_id: string;
  p_unit_id: string;
  p_contract_id: string;
  p_customer_id: string;
  p_consent_status: string;
  p_deal_status: string;
  p_sale_enabled: boolean;
  p_jeonse_enabled: boolean;
  p_monthly_rent_enabled: boolean;
  p_sale_note?: string | null;
  p_jeonse_note?: string | null;
  p_monthly_rent_note?: string | null;
  p_details?: string | null;
  p_brokerages: Json;
  p_asking_sale_price_krw?: number | null;
  p_jeonse_deposit_krw?: number | null;
  p_monthly_rent_deposit_krw?: number | null;
  p_monthly_rent_amount_krw?: number | null;
  p_sale_listing_status?: UnitDealTypedFields["saleListingStatus"];
  p_jeonse_listing_status?: UnitDealTypedFields["jeonseListingStatus"];
  p_monthly_rent_listing_status?: UnitDealTypedFields["monthlyRentListingStatus"];
};

export function isConsentStatus(value: string): value is ConsentStatus {
  return (CONSENT_STATUS_VALUES as readonly string[]).includes(value);
}

export function isDealStatus(value: string): value is DealStatus {
  return (DEAL_STATUS_VALUES as readonly string[]).includes(value);
}

export function filterDealRows(rows: DealListRow[], filters: DealListFilters) {
  const matchedIds = new Set(
    filterCallRows(rows, {
      q: filters.q,
      counselorId: "",
      legacyGrade: "",
      occupancyIntent: "",
      fundingStatus: "",
      moveInStatus: "",
      nextContactDue: false,
    }).map((row) => row.unitId),
  );

  const tab = filters.tab ?? "sale";
  const funding = new Set(filters.fundingStatus ?? []);
  return rows.filter((row) => {
    if (!matchedIds.has(row.unitId)) return false;
    if (filters.consentStatus && row.consentStatus !== filters.consentStatus) {
      return false;
    }
    if (filters.dealStatus && row.dealStatus !== filters.dealStatus) {
      return false;
    }
    if (filters.saleEnabled === "1" && !row.saleEnabled) return false;
    if (filters.jeonseEnabled === "1" && !row.jeonseEnabled) return false;
    if (filters.monthlyRentEnabled === "1" && !row.monthlyRentEnabled) return false;
    if (
      filters.brokerageOfficeId &&
      !row.officeIds.includes(filters.brokerageOfficeId)
    ) {
      return false;
    }
    if (funding.size && (!row.fundingStatus || !funding.has(row.fundingStatus))) return false;
    const reasons = row.specialReasons ?? [];
    if (tab === "sale" && row.effectiveIntent && row.effectiveIntent !== "SALE_TRANSFER") return false;
    if (tab === "rental" && row.effectiveIntent && row.effectiveIntent !== "RENT") return false;
    if (tab === "special" && reasons.length === 0) return false;
    if (filters.specialReason && !matchesSpecialManagementFilter(reasons, filters.specialReason)) return false;
    return true;
  });
}

export function enrichDealIntent(input: {
  operationalIntent: OperationalIntent | string | null;
  occupancyIntent: DealListRow["occupancyIntent"];
  legacyGrade: string | null;
  fundingStatus: FundingStatus | string | null;
  manuallyFlagged?: boolean | null;
  visitRequired?: boolean | null;
}): Pick<DealListRow, "effectiveIntent" | "rentalType" | "legacyConsidering" | "specialReasons" | "specialPriority"> {
  const effective = resolveEffectiveMoveInIntent(input.operationalIntent, input.occupancyIntent);
  const specialReasons = deriveSpecialManagementReasons({
    effectiveIntent: effective,
    legacyGrade: input.legacyGrade,
    fundingStatus: input.fundingStatus,
    manuallyFlagged: input.manuallyFlagged,
    visitRequired: input.visitRequired,
  });
  return {
    effectiveIntent: effective.value,
    rentalType: effective.rentalType,
    legacyConsidering: effective.legacyConsidering,
    specialReasons,
    specialPriority: specialManagementPriority(specialReasons),
  };
}

export function sortDealRows(rows: DealListRow[], sort: DealListFilters["sort"] = "priority", direction: DealListFilters["direction"] = "asc") {
  const sign = direction === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => {
    if (sort === "name") return ((a.customerName ?? "").localeCompare(b.customerName ?? "", "ko") || a.buildingNo.localeCompare(b.buildingNo, "ko", { numeric: true })) * sign;
    if (sort === "unit") {
      return (a.buildingNo.localeCompare(b.buildingNo, "ko", { numeric: true }) || a.unitNo.localeCompare(b.unitNo, "ko", { numeric: true })) * sign;
    }
    const aPriority = a.specialPriority ?? Number.POSITIVE_INFINITY;
    const bPriority = b.specialPriority ?? Number.POSITIVE_INFINITY;
    if (aPriority !== bPriority) return (aPriority - bPriority) * sign;
    return (a.buildingNo.localeCompare(b.buildingNo, "ko", { numeric: true }) || a.unitNo.localeCompare(b.unitNo, "ko", { numeric: true })) * sign;
  });
}

export function parseDealTab(value: string | null | undefined): DealTab {
  return DEAL_TAB_VALUES.includes(value as DealTab) ? value as DealTab : "sale";
}

export function parseDealFundingFilter(value: string | null | undefined): FundingStatus[] {
  if (!value) return [];
  return [...new Set(value.split(",").map((item) => item.trim()).filter((item): item is FundingStatus => (DEAL_FUNDING_FILTER_VALUES as readonly string[]).includes(item)))];
}

export function parseSpecialReasonFilter(value: string | null | undefined): SpecialManagementFilter | "" {
  return value === "termination_abandonment" || value === "grade_d" || value === "funding_risk" || value === "undecided" || value === "manual" ? value : "";
}

export type DealContractRelation = {
  contractId: string;
  customerId: string;
};

export function validateDealProjectionRelation(input: {
  currentContractId: string | null | undefined;
  currentCustomerId: string | null | undefined;
  activeContracts: readonly DealContractRelation[];
  deal?: { contract_id: string; customer_id: string } | null;
}) {
  if (input.activeContracts.length !== 1) {
    return { include: false, anomaly: true, staleDeal: false } as const;
  }
  const current = input.activeContracts[0];
  if (input.currentContractId !== current.contractId || input.currentCustomerId !== current.customerId) {
    return { include: false, anomaly: true, staleDeal: false } as const;
  }
  const staleDeal = Boolean(input.deal && (input.deal.contract_id !== current.contractId || input.deal.customer_id !== current.customerId));
  return { include: true, anomaly: false, staleDeal, current } as const;
}

export function resolveDealContactTimes(input: {
  latestHolderConsultation?: { consultedAt: string; nextActionAt: string | null } | null;
  occupancyLastContactAt: string | null | undefined;
  occupancyNextContactAt: string | null | undefined;
}) {
  return {
    lastContactAt: input.latestHolderConsultation?.consultedAt ?? input.occupancyLastContactAt ?? null,
    nextContactAt: input.occupancyNextContactAt ?? input.latestHolderConsultation?.nextActionAt ?? null,
  };
}

export function buildSaveMoveInUnitDealArgs(
  input: SaveMoveInUnitDealInput,
): SaveMoveInUnitDealArgs {
  const args: SaveMoveInUnitDealArgs = {
    p_project_id: input.projectId,
    p_unit_id: input.unitId,
    p_contract_id: input.contractId,
    p_customer_id: input.customerId,
    p_consent_status: input.consentStatus,
    p_deal_status: input.dealStatus,
    p_sale_enabled: input.saleEnabled,
    p_jeonse_enabled: input.jeonseEnabled,
    p_monthly_rent_enabled: input.monthlyRentEnabled,
    p_sale_note: input.saleNote || undefined,
    p_jeonse_note: input.jeonseNote || undefined,
    p_monthly_rent_note: input.monthlyRentNote || undefined,
    p_details: input.details || undefined,
    p_brokerages: input.brokerages.map((item) => ({
      brokerage_office_id: item.brokerageOfficeId,
      brokerage_contact_id: item.brokerageContactId,
    })),
  };
  if (input.typed) {
    // The 21-argument overload has no defaults: JSON must retain empty text keys.
    args.p_sale_note = input.saleNote || null;
    args.p_jeonse_note = input.jeonseNote || null;
    args.p_monthly_rent_note = input.monthlyRentNote || null;
    args.p_details = input.details || null;
    args.p_asking_sale_price_krw = input.typed.askingSalePriceKrw;
    args.p_jeonse_deposit_krw = input.typed.jeonseDepositKrw;
    args.p_monthly_rent_deposit_krw = input.typed.monthlyRentDepositKrw;
    args.p_monthly_rent_amount_krw = input.typed.monthlyRentAmountKrw;
    args.p_sale_listing_status = input.typed.saleListingStatus;
    args.p_jeonse_listing_status = input.typed.jeonseListingStatus;
    args.p_monthly_rent_listing_status = input.typed.monthlyRentListingStatus;
  }
  return args;
}
