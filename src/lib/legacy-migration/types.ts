import type { LegacyGrade } from "@/lib/move-in/consultation";
import type { FundingStatus, OccupancyIntent } from "@/lib/move-in/labels";

export const LEGACY_MIGRATION_DB_WRITES = 0 as const;

export const LEGACY_PORTAL_READ_ACTIONS = [
  "checkPassword",
  "getAllUnits",
  "getCounselors",
  "getConsultTypes",
  "getEvaluationOptions",
  "getRealtyList",
  "getPrugioListingsAll",
  "getSummaryData",
] as const;

export type LegacyPortalReadAction = (typeof LEGACY_PORTAL_READ_ACTIONS)[number];

export const LEGACY_PORTAL_WRITE_ACTIONS = [
  "addConsultation",
  "assignCounselor",
  "bulkAssign",
  "saveRealtyPublic",
  "saveDeal",
  "saveDealRegistration",
  "saveSummaryOther",
  "setDealColorMark",
  "syncChanges",
] as const;

export const LEGACY_MIGRATION_REASONS = [
  "CUSTOMER_IDENTITY",
  "MULTI_UNIT_HOLDER",
  "COUNSELOR_MAPPING_REQUIRED",
  "UNIT_NOT_FOUND",
  "LATEST_GRADE_MISMATCH",
  "HOLDER_CHANGE_HISTORY",
  "INVALID_PHONE",
  "INVALID_HISTORY_ROW",
] as const;

export type LegacyMigrationReason = (typeof LEGACY_MIGRATION_REASONS)[number];

export const LEGACY_PREVIEW_STATUSES = [
  "READY",
  "REVIEW_REQUIRED",
  "ERROR",
] as const;

export type LegacyPreviewStatus = (typeof LEGACY_PREVIEW_STATUSES)[number];

export type OccupancyCandidate =
  | Extract<OccupancyIntent, "SALE" | "JEONSE" | "MONTHLY_RENT" | "SELF_MOVE_IN">
  | Extract<FundingStatus, "EXISTING_HOME_UNSOLD" | "FUNDING_SHORTAGE">;

export type LegacyHistoryRow = {
  date?: unknown;
  counselor?: unknown;
  type?: unknown;
  content?: unknown;
  evaluation?: unknown;
  [key: string]: unknown;
};

export type LegacyResale = {
  date?: unknown;
  seller?: unknown;
  buyer?: unknown;
  reason?: unknown;
  [key: string]: unknown;
};

export type LegacyDeal = {
  consent?: unknown;
  status?: unknown;
  jeonse?: unknown;
  wolse?: unknown;
  maemae?: unknown;
  notes?: unknown;
  jeonseNote?: unknown;
  wolseNote?: unknown;
  maemaeNote?: unknown;
  features?: unknown;
  realtyList?: unknown;
  colorMark?: unknown;
  updatedAt?: unknown;
  updatedBy?: unknown;
  [key: string]: unknown;
};

export type LegacyPortalUnit = {
  dong?: unknown;
  ho?: unknown;
  name?: unknown;
  phone?: unknown;
  address1?: unknown;
  address2?: unknown;
  areaSupply?: unknown;
  areaExclusive?: unknown;
  price?: unknown;
  dueAmount?: unknown;
  paidAmount?: unknown;
  overdue?: unknown;
  counselor?: unknown;
  contractType?: unknown;
  balancePaid?: unknown;
  evaluation?: unknown;
  summary?: unknown;
  history?: unknown;
  resale?: unknown;
  deal?: unknown;
  [key: string]: unknown;
};

export type LegacyConsultation = {
  consultedAt: string | null;
  counselorName: string | null;
  rawType: string | null;
  contactType: string;
  purpose: string;
  content: string;
  rawEvaluation: string | null;
  structuredTags: {
    legacy_grade?: LegacyGrade;
    legacy_grade_raw?: string;
    legacy_source: "old_crm";
  };
  invalid: boolean;
};

export type LegacyUnitRecord = {
  buildingNo: string;
  unitNo: string;
  unitType: string | null;
  customerName: string;
  phoneRaw: string | null;
  phoneNormalized: string | null;
  address1: string | null;
  address2: string | null;
  counselorName: string | null;
  legacyGrade: string | null;
  contractType: string | null;
  overdueAmount: number | null;
  dueAmount: number | null;
  paidAmount: number | null;
  balancePaidRaw: string | null;
  balancePaidAt: null;
  legacySummary: string | null;
  consultations: LegacyConsultation[];
  resale: LegacyResale[];
  deal: LegacyDeal | null;
};

export type StayJMigrationCatalog = {
  projectId: string;
  units: Array<{
    unitId: string;
    buildingNo: string;
    unitNo: string;
    unitType: string | null;
  }>;
  customers: Array<{
    id: string;
    name: string;
    phoneNormalized: string;
  }>;
};

export type LegacyCustomerCandidate = {
  key: string;
  customerName: string;
  phoneNormalized: string | null;
  stayJCustomerId: string | null;
  units: Array<{ buildingNo: string; unitNo: string }>;
};

export type LegacyPreviewRow = {
  buildingNo: string;
  unitNo: string;
  unitId: string | null;
  customerName: string;
  phoneNormalized: string | null;
  stayJCustomerId: string | null;
  counselorName: string | null;
  assigneeProjectMemberId: string | null;
  status: LegacyPreviewStatus;
  reasons: LegacyMigrationReason[];
  writeKind: "none";
  legacyGrade: string | null;
  latestHistoryGrade: string | null;
  occupancyCandidates: OccupancyCandidate[];
  consultations: LegacyConsultation[];
  resale: LegacyResale[];
  deal: LegacyDeal | null;
  legacySummary: string | null;
};

export type LegacyMigrationPreview = {
  dbWrites: 0;
  rows: LegacyPreviewRow[];
  customerCandidates: LegacyCustomerCandidate[];
};

export type LegacyQualityReport = {
  unitCount: number;
  uniqueCustomerCount: number;
  missingPhoneCount: number;
  multiUnitHolderCount: number;
  consultationCount: number;
  averageConsultations: number;
  gradeDistribution: Record<string, number>;
  counselorUnitCounts: Record<string, number>;
  resaleCount: number;
  dealCount: number;
  ready: number;
  reviewRequired: number;
  error: number;
  unitNotFoundCount: number;
  counselorMappingFailureCount: number;
  consultationFrequency: {
    "0": number;
    "1": number;
    "2": number;
    "3+": number;
  };
  consultedLast7Days: number;
  noContactOver30Days: number;
  repeatedAbsenceCount: number;
};
