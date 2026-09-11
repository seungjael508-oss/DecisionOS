import { filterCallRows, type CallListRow } from "@/lib/move-in/calls";
import type { Json } from "@/lib/supabase/types";

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
  contractId: string;
  consentStatus: ConsentStatus | null;
  dealStatus: DealStatus | null;
  saleEnabled: boolean;
  jeonseEnabled: boolean;
  monthlyRentEnabled: boolean;
  brokerageCount: number;
  updatedAt: string | null;
  officeIds: string[];
};

export type DealListFilters = {
  q: string;
  consentStatus: ConsentStatus | "";
  dealStatus: DealStatus | "";
  saleEnabled: "" | "1";
  jeonseEnabled: "" | "1";
  monthlyRentEnabled: "" | "1";
  brokerageOfficeId: string;
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
  p_sale_note?: string;
  p_jeonse_note?: string;
  p_monthly_rent_note?: string;
  p_details?: string;
  p_brokerages: Json;
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
    return true;
  });
}

export function buildSaveMoveInUnitDealArgs(
  input: SaveMoveInUnitDealInput,
): SaveMoveInUnitDealArgs {
  return {
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
}
