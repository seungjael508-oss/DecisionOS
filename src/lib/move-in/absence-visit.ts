import { OCCUPANCY_INTENT_VALUES, type OccupancyIntent } from "@/lib/move-in/labels";

export type VisitTargetStatus = "VISIT_NEEDED" | "REVISIT_NEEDED" | "VISITED";
export type VisitResult = Exclude<VisitTargetStatus, "VISIT_NEEDED">;

export const VISIT_TARGET_STATUS_LABELS: Record<VisitTargetStatus, string> = {
  VISIT_NEEDED: "방문상담 필요",
  REVISIT_NEEDED: "재방문 필요",
  VISITED: "방문 완료",
};

export const VISIT_RESULT_VALUES: readonly VisitResult[] = ["VISITED", "REVISIT_NEEDED"];

export function isVisitTargetStatus(value: unknown): value is VisitTargetStatus {
  return value === "VISIT_NEEDED" || value === "REVISIT_NEEDED" || value === "VISITED";
}

export type RecordVisitResultInput = {
  projectId: string;
  visitTargetId: string;
  contractId: string;
  result: string;
  content: string;
  occupancyIntent: string | null;
  /** 재방문 필요(방문 부재)일 때만. 내일(KST) 이후 날짜의 timestamptz 문자열 */
  nextVisitAt?: string | null;
};

export type RecordVisitResultError = "invalid_target" | "invalid_result" | "content_required" | "intent_required" | "intent_not_allowed" | "next_visit_invalid";

export type RecordVisitResultArgs = {
  p_project_id: string;
  p_visit_target_id: string;
  p_expected_contract_id: string;
  p_result: VisitResult;
  p_content: string;
  p_occupancy_intent: OccupancyIntent | null;
  p_next_visit_at: string | null;
};

const kstDay = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(date);

/** 방문 완료는 의향 필수, 재방문 필요(방문 부재)는 의향을 기록하지 않는다. 기본등급은 받지 않는다. */
export function buildRecordVisitResultArgs(
  input: RecordVisitResultInput,
  now = new Date(),
): RecordVisitResultArgs | { error: RecordVisitResultError } {
  const content = input.content.trim();
  if (!input.projectId || !input.visitTargetId || !input.contractId) return { error: "invalid_target" };
  if (input.result !== "VISITED" && input.result !== "REVISIT_NEEDED") return { error: "invalid_result" };
  if (!content) return { error: "content_required" };
  const intent = input.occupancyIntent || null;
  if (input.result === "VISITED") {
    if (!intent || !(OCCUPANCY_INTENT_VALUES as readonly string[]).includes(intent)) return { error: "intent_required" };
  } else if (intent) {
    return { error: "intent_not_allowed" };
  }
  // 다음 방문일은 재방문 필요일 때만, 내일(KST) 이후 날짜만 받는다(DB도 다시 검증)
  const nextVisit = input.nextVisitAt ? new Date(input.nextVisitAt) : null;
  if (nextVisit && (input.result !== "REVISIT_NEEDED" || Number.isNaN(nextVisit.getTime()) || kstDay(nextVisit) <= kstDay(now))) {
    return { error: "next_visit_invalid" };
  }
  return {
    p_project_id: input.projectId,
    p_visit_target_id: input.visitTargetId,
    p_expected_contract_id: input.contractId,
    p_result: input.result,
    p_content: content,
    p_occupancy_intent: intent as OccupancyIntent | null,
    p_next_visit_at: nextVisit ? nextVisit.toISOString() : null,
  };
}
