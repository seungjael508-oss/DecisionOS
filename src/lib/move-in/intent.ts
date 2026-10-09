import type { FundingStatus } from "@/lib/move-in/labels";
import type { LegacyGrade } from "@/lib/move-in/consultation";
import type { OccupancyIntent, OperationalIntent } from "@/lib/move-in/labels";

export const EXPLICIT_INTENT_SELECTION_VALUES = [
  "MOVE_IN",
  "SALE",
  "JEONSE",
  "MONTHLY_RENT",
  "TERMINATION",
  "ABANDONMENT",
  "UNDECIDED",
] as const;
export type ExplicitIntentSelection = (typeof EXPLICIT_INTENT_SELECTION_VALUES)[number];
export const EXPLICIT_INTENT_SELECTION_OPTIONS: ReadonlyArray<{ value: ExplicitIntentSelection; label: string }> = [
  { value: "MOVE_IN", label: "입주" },
  { value: "SALE", label: "매매" },
  { value: "JEONSE", label: "전세" },
  { value: "MONTHLY_RENT", label: "월세" },
  { value: "TERMINATION", label: "해지" },
  { value: "ABANDONMENT", label: "포기" },
  { value: "UNDECIDED", label: "미확정" },
];

export type ExplicitIntentMapping = {
  occupancyIntent: OccupancyIntent | null;
  operationalIntent: OperationalIntent;
};

export function mapExplicitIntent(selection: ExplicitIntentSelection): ExplicitIntentMapping {
  if (selection === "MOVE_IN") return { occupancyIntent: "SELF_MOVE_IN", operationalIntent: "MOVE_IN" };
  if (selection === "SALE") return { occupancyIntent: "SALE", operationalIntent: "SALE_TRANSFER" };
  if (selection === "JEONSE") return { occupancyIntent: "JEONSE", operationalIntent: "RENT" };
  if (selection === "MONTHLY_RENT") return { occupancyIntent: "MONTHLY_RENT", operationalIntent: "RENT" };
  if (selection === "TERMINATION") return { occupancyIntent: null, operationalIntent: "TERMINATION" };
  if (selection === "ABANDONMENT") return { occupancyIntent: null, operationalIntent: "ABANDONMENT" };
  return { occupancyIntent: "UNDECIDED", operationalIntent: "UNDECIDED" };
}

/** Maps the persisted two-axis snapshot back to the single UI choice. */
export function explicitSelectionFromPersistedIntent(
  operationalIntent: OperationalIntent | string | null | undefined,
  occupancyIntent: OccupancyIntent | null | undefined,
): ExplicitIntentSelection | "" {
  if (!operationalIntent && !occupancyIntent) return "";
  const effective = resolveEffectiveMoveInIntent(operationalIntent, occupancyIntent);
  if (effective.value === "MOVE_IN") return "MOVE_IN";
  if (effective.value === "SALE_TRANSFER") return "SALE";
  if (effective.value === "RENT") {
    if (effective.rentalType === "JEONSE") return "JEONSE";
    if (effective.rentalType === "MONTHLY_RENT") return "MONTHLY_RENT";
    return "";
  }
  if (effective.value === "TERMINATION") return "TERMINATION";
  if (effective.value === "ABANDONMENT") return "ABANDONMENT";
  if (effective.value === "UNDECIDED") return "UNDECIDED";
  return "";
}

export type EffectiveIntentValue =
  | "MOVE_IN"
  | "SALE_TRANSFER"
  | "RENT"
  | "TERMINATION"
  | "ABANDONMENT"
  | "UNDECIDED";

export type RentalType = "JEONSE" | "MONTHLY_RENT" | null;

export type EffectiveMoveInIntent = {
  value: EffectiveIntentValue;
  rentalType: RentalType;
  source: "OPERATIONAL" | "OCCUPANCY" | "UNDECIDED";
  legacyConsidering: boolean;
};

function occupancyFallback(value: OccupancyIntent | null | undefined): EffectiveMoveInIntent {
  if (value === "SELF_MOVE_IN") return { value: "MOVE_IN", rentalType: null, source: "OCCUPANCY", legacyConsidering: false };
  if (value === "SALE") return { value: "SALE_TRANSFER", rentalType: null, source: "OCCUPANCY", legacyConsidering: false };
  if (value === "JEONSE") return { value: "RENT", rentalType: "JEONSE", source: "OCCUPANCY", legacyConsidering: false };
  if (value === "MONTHLY_RENT") return { value: "RENT", rentalType: "MONTHLY_RENT", source: "OCCUPANCY", legacyConsidering: false };
  return { value: "UNDECIDED", rentalType: null, source: "UNDECIDED", legacyConsidering: false };
}

export function resolveEffectiveMoveInIntent(
  operationalIntent: OperationalIntent | string | null | undefined,
  occupancyIntent: OccupancyIntent | null | undefined,
): EffectiveMoveInIntent {
  const legacyConsidering = operationalIntent === "CONSIDERING_MOVE_IN";
  if (legacyConsidering || operationalIntent === "UNDECIDED" || !operationalIntent) {
    const fallback = occupancyFallback(occupancyIntent);
    return { ...fallback, legacyConsidering };
  }
  if (operationalIntent === "MOVE_IN") return { value: "MOVE_IN", rentalType: null, source: "OPERATIONAL", legacyConsidering: false };
  if (operationalIntent === "SALE_TRANSFER") return { value: "SALE_TRANSFER", rentalType: null, source: "OPERATIONAL", legacyConsidering: false };
  if (operationalIntent === "RENT") {
    return {
      value: "RENT",
      rentalType: occupancyIntent === "JEONSE" || occupancyIntent === "MONTHLY_RENT" ? occupancyIntent : null,
      source: "OPERATIONAL",
      legacyConsidering: false,
    };
  }
  if (operationalIntent === "TERMINATION" || operationalIntent === "ABANDONMENT") {
    return { value: operationalIntent, rentalType: null, source: "OPERATIONAL", legacyConsidering: false };
  }
  return { ...occupancyFallback(occupancyIntent), legacyConsidering };
}

export const SPECIAL_REASON_VALUES = [
  "TERMINATION",
  "ABANDONMENT",
  "GRADE_D",
  "LOAN_LIMIT_SHORTAGE",
  "FUNDING_SHORTAGE",
  "EXISTING_HOME_UNSOLD",
  "MANUAL",
  "UNDECIDED",
] as const;
export type SpecialManagementReason = (typeof SPECIAL_REASON_VALUES)[number];

export const SPECIAL_REASON_LABELS: Record<SpecialManagementReason, string> = {
  TERMINATION: "해지",
  ABANDONMENT: "포기",
  GRADE_D: "D등급",
  LOAN_LIMIT_SHORTAGE: "대출 한도부족",
  FUNDING_SHORTAGE: "자금부족",
  EXISTING_HOME_UNSOLD: "기존주택 미처분",
  MANUAL: "수동지정",
  UNDECIDED: "미확정",
};

export function deriveSpecialManagementReasons(input: {
  effectiveIntent: EffectiveMoveInIntent | EffectiveIntentValue;
  legacyGrade?: LegacyGrade | string | null;
  fundingStatus?: FundingStatus | string | null;
  manuallyFlagged?: boolean | null;
}): SpecialManagementReason[] {
  const effective = typeof input.effectiveIntent === "string" ? input.effectiveIntent : input.effectiveIntent.value;
  const reasons: SpecialManagementReason[] = [];
  if (effective === "TERMINATION") reasons.push("TERMINATION");
  if (effective === "ABANDONMENT") reasons.push("ABANDONMENT");
  if (input.legacyGrade === "D") reasons.push("GRADE_D");
  if (input.fundingStatus === "LOAN_LIMIT_SHORTAGE") reasons.push("LOAN_LIMIT_SHORTAGE");
  if (input.fundingStatus === "FUNDING_SHORTAGE") reasons.push("FUNDING_SHORTAGE");
  if (input.fundingStatus === "EXISTING_HOME_UNSOLD") reasons.push("EXISTING_HOME_UNSOLD");
  if (input.manuallyFlagged) reasons.push("MANUAL");
  if (effective === "UNDECIDED") reasons.push("UNDECIDED");
  return reasons;
}

export function specialManagementPriority(reasons: readonly SpecialManagementReason[]): number {
  const ranks: Record<SpecialManagementReason, number> = {
    TERMINATION: 0,
    ABANDONMENT: 0,
    GRADE_D: 1,
    LOAN_LIMIT_SHORTAGE: 2,
    FUNDING_SHORTAGE: 2,
    EXISTING_HOME_UNSOLD: 3,
    MANUAL: 4,
    UNDECIDED: 5,
  };
  return reasons.length ? Math.min(...reasons.map((reason) => ranks[reason])) : Number.POSITIVE_INFINITY;
}

export type SpecialManagementFilter = "all" | "termination_abandonment" | "grade_d" | "funding_risk" | "undecided" | "manual";

export function matchesSpecialManagementFilter(reasons: readonly SpecialManagementReason[], filter: SpecialManagementFilter) {
  if (filter === "all") return reasons.length > 0;
  if (filter === "termination_abandonment") return reasons.includes("TERMINATION") || reasons.includes("ABANDONMENT");
  if (filter === "grade_d") return reasons.includes("GRADE_D");
  if (filter === "funding_risk") return reasons.includes("LOAN_LIMIT_SHORTAGE") || reasons.includes("FUNDING_SHORTAGE") || reasons.includes("EXISTING_HOME_UNSOLD");
  if (filter === "undecided") return reasons.includes("UNDECIDED");
  return reasons.includes("MANUAL");
}
