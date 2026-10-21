// 오늘 관리 업무 유형·오늘 할 일. 오늘 관리대상 사유 코드(DB 판정)와 원장 행(같은 판정 함수)만 쓴다.

export const TODAY_TASK_TYPES = ["call", "visit", "absence", "c_undecided", "d_special", "follow_up", "done"] as const;
export type TodayTaskType = (typeof TODAY_TASK_TYPES)[number];
export const TODAY_TASK_TYPE_LABELS: Record<TodayTaskType, string> = {
  call: "전화상담", visit: "방문상담", absence: "장기 부재 3회 이상", c_undecided: "C등급 미정",
  d_special: "D등급 특별관리", follow_up: "후속관리", done: "처리 완료",
};

const VISIT_REASONS = new Set(["VISIT_NEEDED", "REVISIT_NEEDED", "VISIT_SCHEDULED"]);
const FOLLOW_UP_REASONS = new Set(["NEXT_CONTACT_DUE", "SALE_TRACKING", "C_GRADE_FUNDING"]);
const UNDECIDED_INTENTS = new Set(["UNDECIDED", "CONSIDERING_MOVE_IN"]);

export function parseTodayTaskType(value: string | null | undefined): TodayTaskType | null {
  return (TODAY_TASK_TYPES as readonly string[]).includes(value ?? "") ? value as TodayTaskType : null;
}

/** 미처리 세대의 업무 유형(여러 개 가능). 방문 사유가 있으면 방문, 그 외 재접촉·후속 사유는 전화로 본다. */
export function todayTaskTypesOf(reasonCodes: readonly string[], row: { currentGrade: string | null; effectiveIntent: string | null }): TodayTaskType[] {
  const types = new Set<TodayTaskType>();
  const visit = reasonCodes.some((code) => VISIT_REASONS.has(code));
  if (visit) types.add("visit");
  if (reasonCodes.some((code) => !VISIT_REASONS.has(code) && code !== "VISIT_DONE")) types.add("call");
  if (reasonCodes.includes("ABSENCE_STREAK")) types.add("absence");
  if (row.currentGrade === "C" && UNDECIDED_INTENTS.has(row.effectiveIntent ?? "")) types.add("c_undecided");
  if (row.currentGrade === "D") types.add("d_special");
  if (reasonCodes.some((code) => FOLLOW_UP_REASONS.has(code))) types.add("follow_up");
  return [...types];
}

const TODO_BY_REASON: Record<string, string> = {
  VISIT_NEEDED: "방문상담", REVISIT_NEEDED: "재방문", VISIT_SCHEDULED: "예정 방문", VISIT_DONE: "방문 결과 확인",
  ABSENCE_STREAK: "장기 부재 방문 연결", NEXT_CONTACT_DUE: "다음 관리일 후속 상담", ABSENCE_RETRY: "부재 재전화",
  D_GRADE_STALE: "D등급 재접촉 전화", C_GRADE_STALE: "C등급 재접촉 전화", C_GRADE_FUNDING: "자금 관리 상담", SALE_TRACKING: "매매·임대 후속 확인",
};
const TODO_ORDER = ["VISIT_NEEDED", "REVISIT_NEEDED", "VISIT_SCHEDULED", "ABSENCE_STREAK", "NEXT_CONTACT_DUE", "D_GRADE_STALE", "C_GRADE_STALE", "ABSENCE_RETRY", "C_GRADE_FUNDING", "SALE_TRACKING", "VISIT_DONE"];

/** 오늘 할 일(우선순위 순, 중복 제거). 사유가 여러 개면 함께 보여준다. */
export function todayTodoText(reasonCodes: readonly string[]): string {
  const todos = TODO_ORDER.filter((code) => reasonCodes.includes(code)).map((code) => TODO_BY_REASON[code]);
  return [...new Set(todos)].join(" · ") || "상담";
}

/** 오늘 관리 전용 URL 키. 나머지 키는 원장 필터(같은 판정 함수)로 넘긴다. */
export const TODAY_ONLY_PARAM_KEYS = ["filter", "dReason", "task", "moveInNotice", "taskUnit", "taskNext"] as const;

export function ledgerParamsFromTodayQuery(query: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if ((TODAY_ONLY_PARAM_KEYS as readonly string[]).includes(key) || value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) params.append(key, item);
  }
  return params;
}
