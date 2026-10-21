/**
 * D등급 관리 사유(복수). 기본등급(A/B/C/D)은 바꾸지 않는 화면 파생값이며, 근거를 확인할 수 없으면 분류하지 않는다.
 * 입력은 모두 서버에서 현재 ACTIVE 계약 기준으로 걸러진 값이어야 한다(이전 계약자 기록 금지).
 */
export const D_GRADE_REASONS = ["ASEL", "DELINQUENT", "C_DOWNGRADE", "MOVE_IN_DIFFICULTY", "ABSENCE_STREAK"] as const;
export type DGradeReason = typeof D_GRADE_REASONS[number];

export const D_GRADE_REASON_LABELS: Record<DGradeReason, string> = {
  ASEL: "아셀",
  DELINQUENT: "연체",
  C_DOWNGRADE: "C등급 하향",
  MOVE_IN_DIFFICULTY: "입주 곤란",
  ABSENCE_STREAK: "장기 부재 3회 이상",
};

/** 특별관리 '자금 위험'과 같은 자금 상태 + 입주 지연. 대출필요(LOAN_NEEDED)는 진행 단계라 제외 */
const MOVE_IN_DIFFICULTY_FUNDING = new Set(["LOAN_LIMIT_SHORTAGE", "FUNDING_SHORTAGE", "EXISTING_HOME_UNSOLD"]);
const ABSENCE_STREAK_MIN = 3;
const GRADES = new Set(["A", "B", "C", "D"]);

export type DGradeContact = { id: string; consultedAt: string; contactType: string | null; legacyGrade: string | null };
export type DGradeHistory = { id: string; changedAt: string; previousValue: string | null; newValue: string | null };

export type DGradeReasonInput = {
  currentGrade: string | null;
  /** 원본 명단(동·호수) 연결 결과. ASEL·DELINQUENT만 사용 */
  sourceTags: readonly string[];
  /** 현재 계약 외 계약이 이 세대에 있었는지. null = 확인 불가 → 아셀·연체 분류 안 함 */
  holderChanged: boolean | null;
  funding: string | null;
  moveIn: string | null;
  /** 현재 계약자 본인 상담만. null = 조회 실패 → 장기 부재·C등급 하향 분류 안 함 */
  contacts: readonly DGradeContact[] | null;
  /** 현재 계약의 legacy_grade 변경 이력. null = 조회 실패 → C등급 하향 분류 안 함 */
  gradeHistory: readonly DGradeHistory[] | null;
};

const ms = (value: string) => Date.parse(value);

/**
 * 마지막 실제 접촉(부재 외 상담, 문자 제외) 이후 전화 부재 건수. DB 자동 전환 규칙과 같다(같은 시각은 실제 접촉 우선).
 * contactType은 absenceContactType으로 정규화한 값(레거시 이관 상담 = 전화)을 넣는다.
 */
export function currentAbsenceStreak(contacts: readonly DGradeContact[]): number {
  const lastReal = contacts.filter(c => c.legacyGrade !== "부재" && c.contactType !== "MESSAGE").reduce((max, c) => Math.max(max, ms(c.consultedAt)), -Infinity);
  return contacts.filter(c => c.legacyGrade === "부재" && c.contactType === "CALL" && ms(c.consultedAt) > lastReal).length;
}

/**
 * 실제 등급 기록으로 현재 D에 이르기 직전 등급이 C였는지.
 * 기록의 마지막 등급이 D가 아니거나(근거 없는 D), D 이전 등급 기록이 없으면 null(분류 안 함).
 */
export function downgradedFromC(contacts: readonly DGradeContact[], history: readonly DGradeHistory[]): boolean | null {
  type Point = { at: number; order: number; id: string; grade: string };
  const points: Point[] = [];
  for (const c of contacts) if (c.legacyGrade && GRADES.has(c.legacyGrade)) points.push({ at: ms(c.consultedAt), order: 1, id: c.id, grade: c.legacyGrade });
  for (const h of history) {
    if (h.previousValue && GRADES.has(h.previousValue)) points.push({ at: ms(h.changedAt), order: 0, id: h.id, grade: h.previousValue });
    if (h.newValue && GRADES.has(h.newValue)) points.push({ at: ms(h.changedAt), order: 2, id: h.id, grade: h.newValue });
  }
  const sequence = points.filter(p => Number.isFinite(p.at)).sort((a, b) => a.at - b.at || a.order - b.order || a.id.localeCompare(b.id));
  if (sequence.at(-1)?.grade !== "D") return null;
  let i = sequence.length - 1;
  while (i >= 0 && sequence[i].grade === "D") i--;
  return i < 0 ? null : sequence[i].grade === "C";
}

export function deriveDGradeReasons(input: DGradeReasonInput): DGradeReason[] {
  if (input.currentGrade !== "D") return [];
  const reasons: DGradeReason[] = [];
  if (input.holderChanged === false && input.sourceTags.includes("ASEL")) reasons.push("ASEL");
  if (input.holderChanged === false && input.sourceTags.includes("DELINQUENT")) reasons.push("DELINQUENT");
  if (input.contacts && input.gradeHistory && downgradedFromC(input.contacts, input.gradeHistory) === true) reasons.push("C_DOWNGRADE");
  if ((input.funding && MOVE_IN_DIFFICULTY_FUNDING.has(input.funding)) || input.moveIn === "DELAYED") reasons.push("MOVE_IN_DIFFICULTY");
  if (input.contacts && currentAbsenceStreak(input.contacts) >= ABSENCE_STREAK_MIN) reasons.push("ABSENCE_STREAK");
  return reasons;
}

export function isDGradeReason(value: string): value is DGradeReason {
  return (D_GRADE_REASONS as readonly string[]).includes(value);
}

/** URL dReason=ASEL,DELINQUENT → 검증된 사유 목록(중복·알 수 없는 값 제거, 정의 순서) */
export function parseDGradeReasonParam(value: string | readonly string[] | null | undefined): DGradeReason[] {
  const raw = (Array.isArray(value) ? value : [value ?? ""]).flatMap(v => String(v).split(",")).map(v => v.trim());
  return D_GRADE_REASONS.filter(reason => raw.includes(reason));
}

/** D등급 AND (선택 사유 OR). 선택이 없으면 통과. */
export function matchesDGradeReasonFilter(
  row: { currentGrade: string | null; dGradeReasons?: readonly string[] | null },
  selected: readonly string[],
): boolean {
  if (!selected.length) return true;
  return row.currentGrade === "D" && selected.some(reason => (row.dGradeReasons ?? []).includes(reason));
}

export type DGradeReasonSummary = {
  dTotal: number;
  byReason: Record<DGradeReason, number>;
  /** 사유 1개 이상 세대(세대 단위, 중복 없음) */
  classified: number;
  /** D이지만 확인된 사유가 없는 세대 */
  unclassified: number;
  /** 사유 2개 이상 세대 */
  multiple: number;
};

/** 세대 단위 집계. 같은 세대가 여러 행으로 들어와도 1번만 센다. */
export function summarizeDGradeReasons(
  rows: readonly { unitId: string; currentGrade: string | null; dGradeReasons?: readonly string[] | null }[],
): DGradeReasonSummary {
  const byUnit = new Map<string, Set<DGradeReason>>();
  for (const row of rows) {
    if (row.currentGrade !== "D") continue;
    const set = byUnit.get(row.unitId) ?? new Set<DGradeReason>();
    for (const reason of row.dGradeReasons ?? []) if (isDGradeReason(reason)) set.add(reason);
    byUnit.set(row.unitId, set);
  }
  const byReason = Object.fromEntries(D_GRADE_REASONS.map(r => [r, 0])) as Record<DGradeReason, number>;
  let classified = 0, multiple = 0;
  for (const set of byUnit.values()) {
    for (const reason of set) byReason[reason]++;
    if (set.size) classified++;
    if (set.size > 1) multiple++;
  }
  return { dTotal: byUnit.size, byReason, classified, unclassified: byUnit.size - classified, multiple };
}
