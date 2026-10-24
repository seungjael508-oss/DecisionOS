/** 문제세대 분류(A14). 관리자만 지정·해제하며, 해제 승인 전에는 입주완료 처리가 DB에서 차단된다. */
export const PROBLEM_FLAGS = ['SEIZURE', 'LITIGATION', 'D_GRADE', 'ASEL', 'TERMINATED'] as const;
export type ProblemFlag = (typeof PROBLEM_FLAGS)[number];
export const PROBLEM_FLAG_LABELS: Record<ProblemFlag, string> = {
  SEIZURE: '가압류', LITIGATION: '소송', D_GRADE: 'D등급', ASEL: '아셀', TERMINATED: '계약해지',
};
/** 관리자 화면 안내용 분류 기준 */
export const PROBLEM_FLAG_HINTS: Record<ProblemFlag, string> = {
  SEIZURE: '채권 가압류 설정 — 입주증 발급·키 교부 엄격 제한',
  LITIGATION: '분쟁 중 — 관리자 승인 전까지 입주 보류',
  D_GRADE: '법적 제한 D등급 — 입주증 발급·키 교부 엄격 제한',
  ASEL: '아셀 특약 — 관리자 승인 전까지 입주 보류',
  TERMINATED: '입주 절차 중 계약 해지 처리',
};
/** DB 트리거 errcode. 저장 실패 안내를 구분하는 데만 쓴다 */
export const PROBLEM_LOCK_ERRCODE = 'SJ423';

export function isProblemFlag(value: unknown): value is ProblemFlag {
  return typeof value === 'string' && (PROBLEM_FLAGS as readonly string[]).includes(value);
}
/** 알 수 없는 값은 버리고 고정 순서로 정리(DB와 같은 순서) */
export function normalizeProblemFlags(values: readonly unknown[] | null | undefined): ProblemFlag[] {
  const set = new Set((values ?? []).filter(isProblemFlag));
  return PROBLEM_FLAGS.filter(f => set.has(f));
}
export type ProblemState = { problemFlags: readonly ProblemFlag[]; problemLockReleased: boolean };
/** 적색 표기 대상(해제 승인 후에도 표기는 유지) */
export function isProblemHousehold(row: Partial<ProblemState>) { return (row.problemFlags?.length ?? 0) > 0; }
/** 입주완료 처리 차단 여부 = 문제세대이면서 관리자 최종 해제 승인 전 */
export function isProblemLocked(row: Partial<ProblemState>) { return isProblemHousehold(row) && !row.problemLockReleased; }
export function problemReasonText(flags: readonly ProblemFlag[]) { return flags.map(f => PROBLEM_FLAG_LABELS[f]).join(' · '); }
