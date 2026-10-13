import type { Database, Json } from "@/lib/supabase/types";
import type { FundingStatus, MoveInStatus, OccupancyIntent, OperationalIntent } from "@/lib/move-in/labels";

export const CONSULTATION_PURPOSES = ["성향파악", "입주안내", "잔금독촉", "매칭안내", "기타"] as const;

export const CONSULTATION_TYPES = [
  "OUTBOUND",
  "INBOUND",
  "VISIT",
  "MESSAGE",
] as const;

export type ConsultationType = (typeof CONSULTATION_TYPES)[number];

export const CONSULTATION_TYPE_LABELS: Record<ConsultationType, string> = {
  OUTBOUND: "아웃바운드",
  INBOUND: "인바운드",
  VISIT: "대면",
  MESSAGE: "문자",
};

export const LEGACY_GRADE_VALUES = [
  "A",
  "B",
  "C",
  "D",
  "부재",
  "상담거절",
] as const;

export type LegacyGrade = (typeof LEGACY_GRADE_VALUES)[number];


export function isConsultationType(value: string): value is ConsultationType {
  return (CONSULTATION_TYPES as readonly string[]).includes(value);
}

export function isLegacyGrade(value: string): value is LegacyGrade {
  return (LEGACY_GRADE_VALUES as readonly string[]).includes(value);
}

export function extractLegacyGrade(tags: Json | null | undefined): LegacyGrade | null {
  if (!tags || typeof tags !== "object" || Array.isArray(tags)) return null;
  const value = tags.legacy_grade;
  if (typeof value !== "string") return null;
  return isLegacyGrade(value) ? value : null;
}

export function consultationKindLabel(
  contactType: string | null,
  purpose: string | null,
): string {
  if (purpose === "OUTBOUND") return CONSULTATION_TYPE_LABELS.OUTBOUND;
  if (purpose === "INBOUND") return CONSULTATION_TYPE_LABELS.INBOUND;
  if (purpose === "VISIT" || contactType === "VISIT") {
    return CONSULTATION_TYPE_LABELS.VISIT;
  }
  if (purpose === "MESSAGE" || contactType === "MESSAGE") {
    return CONSULTATION_TYPE_LABELS.MESSAGE;
  }
  if (contactType === "CALL") return "콜";
  if (contactType === "CONSULTATION") return "상담";
  return purpose || contactType || "상담";
}

export function counselorDisplayName(
  memberId: string | null,
  currentMemberId: string,
): string {
  if (!memberId) return "—";
  if (memberId === currentMemberId) return "나";
  return "담당상담사";
}

export type CreateMoveInConsultationInput = {
  projectId: string;
  unitId: string;
  customerId: string;
  expectedContractId?: string;
  consultationType: ConsultationType;
  content: string;
  purpose?: string;
  legacyGrade?: LegacyGrade | "";
  nextContactAt?: string;
  clearNextContactAt?: boolean;
  occupancyIntent?: OccupancyIntent | "";
  fundingStatus?: FundingStatus | "";
  moveInStatus?: MoveInStatus | "";
  operationalIntent?: OperationalIntent | "";
  plannedMoveInDate?: string;
  balancePaidAt?: string;
  actualMoveInDate?: string;
  reason?: string;
};

export type CreateMoveInConsultationArgs =
  Database["public"]["Functions"]["create_move_in_consultation"]["Args"];

/** 운영 저장은 계약 경합 방어 18인자 RPC만 사용. 17인자 이하 호출(authenticated EXECUTE 회수됨)로 내려가지 않는다. */
export type GuardedMoveInConsultationArgs = Extract<CreateMoveInConsultationArgs, { p_expected_contract_id: string }>;

export function buildCreateMoveInConsultationArgs(
  input: CreateMoveInConsultationInput,
): GuardedMoveInConsultationArgs | { error: "empty_content" | "invalid_purpose" | "invalid_contract" } {
  // 계약 ID가 없으면 어떤 RPC도 호출하지 않고 즉시 거절(구버전 fallback 금지)
  if (typeof input.expectedContractId !== "string" || !input.expectedContractId.trim()) {
    return { error: "invalid_contract" };
  }
  const content = input.content.trim();
  if (!content) return { error: "empty_content" };

  if (input.purpose && !(CONSULTATION_PURPOSES as readonly string[]).includes(input.purpose)) {
    return { error: "invalid_purpose" };
  }
  const reason = input.reason?.trim();

  // No defaults on the guarded overload: all 18 JSON keys must survive serialization.
  // An empty select maps to null, preserving the current snapshot and its as-of timestamp.
  return {
    p_project_id: input.projectId,
    p_unit_id: input.unitId,
    p_customer_id: input.customerId,
    p_consultation_type: input.consultationType,
    p_content: content,
    p_expected_contract_id: input.expectedContractId,
    p_legacy_grade: input.legacyGrade || null,
    p_next_contact_at: input.nextContactAt || null,
    p_occupancy_intent: input.occupancyIntent || null,
    p_funding_status: input.fundingStatus || null,
    p_move_in_status: input.moveInStatus || null,
    p_planned_move_in_date: input.plannedMoveInDate || null,
    p_balance_paid_at: input.balancePaidAt || null,
    p_actual_move_in_date: input.actualMoveInDate || null,
    p_reason: reason || null,
    p_business_purpose: input.purpose || null,
    p_clear_next_contact_at: input.clearNextContactAt === true,
    p_operational_intent: input.operationalIntent || null,
  };
}


// Only audited visit-sheet coordinates may establish a legacy channel.
export function confirmedLegacyVisitKey(projectId: string, tags: Json | null): string | null {
  if (projectId !== "1283e198-5043-4027-96d6-edcc7a6686c6" || !tags || typeof tags !== "object" || Array.isArray(tags)) return null;
  const row = tags.legacy_row_number;
  if (tags.legacy_source !== "hwayang_legacy" || tags.legacy_file_id !== "F003" ||
      tags.legacy_sheet_index !== 4 || typeof row !== "number" || !Number.isInteger(row) || row < 2 || row > 30) return null;
  const key = `hwayang-260915:F003:4:${row}`;
  return tags.legacy_source_key === key ? key : null;
}
