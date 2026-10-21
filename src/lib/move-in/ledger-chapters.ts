/**
 * 통합원장 상단 '입주촉진 집중관리' 챕터. 이미 권한 검증·현재 ACTIVE 계약 기준으로 투영된 원장 행만 나눈다
 * (서버 재조회·추정 없음). 챕터는 다른 원장 필터와 AND로 결합된다.
 */
export const LEDGER_CHAPTERS = ["all", "c_undecided", "d_undecided", "cd_sale_rent", "absence_visit"] as const;
export type LedgerChapter = typeof LEDGER_CHAPTERS[number];

export const LEDGER_CHAPTER_LABELS: Record<LedgerChapter, string> = {
  all: "전체 원장",
  c_undecided: "C등급 미정",
  d_undecided: "D등급 미정",
  cd_sale_rent: "C·D 전매·임대",
  absence_visit: "장기 부재 3회+",
};

/** 장기 부재 = 현재 계약자 연속 전화 부재 3회 이상(D등급 관리사유 '장기 부재 3회 이상'·자동 D 전환과 같은 규칙) */
export const LEDGER_ABSENCE_STREAK_MIN = 3;

export type LedgerChapterRow = {
  unitId: string;
  currentGrade: string | null;
  effectiveIntent: string | null;
  absenceStreak?: number | null;
};

export function isLedgerChapter(value: string | null | undefined): value is LedgerChapter {
  return !!value && (LEDGER_CHAPTERS as readonly string[]).includes(value);
}

export function matchesLedgerChapter(row: LedgerChapterRow, chapter: LedgerChapter): boolean {
  if (chapter === "all") return true;
  // 미정 = 확정 입주의향 없음(기존 '미확정' 빠른필터와 같은 effectiveIntent UNDECIDED)
  if (chapter === "c_undecided") return row.currentGrade === "C" && row.effectiveIntent === "UNDECIDED";
  if (chapter === "d_undecided") return row.currentGrade === "D" && row.effectiveIntent === "UNDECIDED";
  if (chapter === "cd_sale_rent") return (row.currentGrade === "C" || row.currentGrade === "D")
    && (row.effectiveIntent === "SALE_TRANSFER" || row.effectiveIntent === "RENT");
  return (row.absenceStreak ?? 0) >= LEDGER_ABSENCE_STREAK_MIN;
}

/** 챕터별 대상 세대 수(세대 단위, 같은 세대 중복 행은 1번만) */
export function countLedgerChapters(rows: readonly LedgerChapterRow[]): Record<LedgerChapter, number> {
  const units = new Map<string, LedgerChapterRow>();
  for (const row of rows) if (!units.has(row.unitId)) units.set(row.unitId, row);
  return Object.fromEntries(LEDGER_CHAPTERS.map(chapter =>
    [chapter, [...units.values()].filter(row => matchesLedgerChapter(row, chapter)).length])) as Record<LedgerChapter, number>;
}
