import type { Database, Json } from "@/lib/supabase/types";
import type { FundingStatus, MoveInStatus, OccupancyIntent } from "@/lib/move-in/labels";

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
  consultationType: ConsultationType;
  content: string;
  purpose?: string;
  legacyGrade?: LegacyGrade | "";
  nextContactAt?: string;
  occupancyIntent?: OccupancyIntent | "";
  fundingStatus?: FundingStatus | "";
  moveInStatus?: MoveInStatus | "";
  plannedMoveInDate?: string;
  balancePaidAt?: string;
  actualMoveInDate?: string;
  reason?: string;
};

export type CreateMoveInConsultationArgs =
  Database["public"]["Functions"]["create_move_in_consultation"]["Args"];

export function buildCreateMoveInConsultationArgs(
  input: CreateMoveInConsultationInput,
): CreateMoveInConsultationArgs | { error: "empty_content" | "invalid_purpose" } {
  const content = input.content.trim();
  if (!content) return { error: "empty_content" };

  if (!input.purpose || !(CONSULTATION_PURPOSES as readonly string[]).includes(input.purpose)) {
    return { error: "invalid_purpose" };
  }

  const args: CreateMoveInConsultationArgs = {
    p_business_purpose: input.purpose,
    p_project_id: input.projectId,
    p_unit_id: input.unitId,
    p_customer_id: input.customerId,
    p_consultation_type: input.consultationType,
    p_content: content,
  };

  if (input.legacyGrade) args.p_legacy_grade = input.legacyGrade;
  if (input.nextContactAt) args.p_next_contact_at = input.nextContactAt;
  if (input.occupancyIntent) args.p_occupancy_intent = input.occupancyIntent;
  if (input.fundingStatus) args.p_funding_status = input.fundingStatus;
  if (input.moveInStatus) args.p_move_in_status = input.moveInStatus;
  if (input.plannedMoveInDate) {
    args.p_planned_move_in_date = input.plannedMoveInDate;
  }
  if (input.balancePaidAt) args.p_balance_paid_at = input.balancePaidAt;
  if (input.actualMoveInDate) args.p_actual_move_in_date = input.actualMoveInDate;
  const reason = input.reason?.trim();
  if (reason) args.p_reason = reason;

  return args;
}
