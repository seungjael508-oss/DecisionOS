import type { FundingStatus, MoveInStatus, OccupancyIntent } from "@/lib/move-in/labels";

export const IMPORT_ROW_STATUSES = ["READY", "REVIEW_REQUIRED", "ERROR"] as const;
export type ImportRowStatus = (typeof IMPORT_ROW_STATUSES)[number];

export const IMPORT_REVIEW_REASONS = [
  "HOLDER_CHANGE",
  "CUSTOMER_IDENTITY",
  "MULTI_UNIT_HOLDER_CONFIRM",
  "ACTIVE_CONTRACT_CONFLICT",
  "NEW_CUSTOMER_REQUIRED",
  "ATOMIC_WRITE_REQUIRED",
  "UNIT_NOT_FOUND",
  "INVALID_ROW",
] as const;
export type ImportReviewReason = (typeof IMPORT_REVIEW_REASONS)[number];

export const IMPORT_REASON_LABELS: Record<ImportReviewReason, string> = {
  HOLDER_CHANGE: "명의변경 의심",
  CUSTOMER_IDENTITY: "동일인 확인 필요",
  MULTI_UNIT_HOLDER_CONFIRM: "다세대 동일인 확인",
  ACTIVE_CONTRACT_CONFLICT: "ACTIVE 계약 충돌",
  NEW_CUSTOMER_REQUIRED: "신규 계약자 필요",
  ATOMIC_WRITE_REQUIRED: "원자적 반영 필요",
  UNIT_NOT_FOUND: "동호수 없음",
  INVALID_ROW: "필수 컬럼 없음",
};

export const IMPORT_APPLY_MODES = [
  "NO_OP",
  "CREATE_CONTRACT",
  "TRANSFER_HOLDER",
  "UPDATE_OCCUPANCY",
  "CREATE_CONTRACT_AND_UPDATE_OCCUPANCY",
  "TRANSFER_HOLDER_AND_UPDATE_OCCUPANCY",
] as const;
export type ImportApplyMode = (typeof IMPORT_APPLY_MODES)[number];

export const IMPORT_WRITE_KINDS = ["none", "apply_import_row"] as const;
export type ImportWriteKind = (typeof IMPORT_WRITE_KINDS)[number];

export type ImportSourceRow = {
  rowNumber: number;
  buildingNo: string;
  unitNo: string;
  unitType: string | null;
  holderName: string;
  phoneNormalized: string | null;
  contractDate: string | null;
  overdueText: string | null;
  nextStepText: string | null;
  hasConsultationNote: boolean;
};

export type OccupancyHint = {
  occupancyIntent: OccupancyIntent | null;
  fundingStatus: FundingStatus | null;
  moveInStatus: MoveInStatus | null;
  needsReview: boolean;
};

export type ImportCatalogUnit = {
  unitId: string;
  projectId: string;
  buildingNo: string;
  unitNo: string;
  unitType: string | null;
};

export type ImportCatalogCustomer = {
  id: string;
  name: string;
  phoneNormalized: string;
};

export type ImportCatalogContract = {
  contractId: string;
  unitId: string;
  customerId: string;
  status: "ACTIVE" | "CANCELLED" | "COMPLETED";
};

export type ImportCatalogOccupancy = {
  unitId: string;
  contractId: string;
  occupancyIntent: OccupancyIntent;
  fundingStatus: FundingStatus;
  moveInStatus: MoveInStatus;
};

export type ImportCatalog = {
  projectId: string;
  units: ImportCatalogUnit[];
  customers: ImportCatalogCustomer[];
  contracts: ImportCatalogContract[];
  occupancies: ImportCatalogOccupancy[];
};

export type ClassifiedImportRow = {
  rowNumber: number;
  status: ImportRowStatus;
  reasons: ImportReviewReason[];
  writeKind: ImportWriteKind;
  applyMode: ImportApplyMode;
  buildingNo: string;
  unitNo: string;
  unitId: string | null;
  holderName: string;
  phoneNormalized: string | null;
  excelCustomerId: string | null;
  currentCustomerId: string | null;
  currentCustomerName: string | null;
  currentContractId: string | null;
  occupancyHint: OccupancyHint;
  hasConsultationNote: boolean;
  message: string;
  relatedUnits: Array<{ buildingNo: string; unitNo: string }>;
};

export type ImportPreview = {
  total: number;
  ready: number;
  reviewRequired: number;
  error: number;
  rows: ClassifiedImportRow[];
  mapping: Record<string, string | null>;
};

export type HolderDecision = "confirm" | "not_change";

export type ImportApplyDecision = {
  rowNumber: number;
  holderDecision?: HolderDecision;
  allowNewCustomer?: boolean;
};
