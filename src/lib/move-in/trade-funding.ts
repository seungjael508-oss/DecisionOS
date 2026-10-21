/**
 * C·D등급 거래(전매·임대) 자금조달 유형. 입주 자금·대출 진행 단계(funding_status: 대출필요·대출상담·대출승인 등)와 별개 칸이다.
 * 대출 후 잔금 납부·거래 = 자금 마련 방식(분류). 대출 승인 여부는 분류가 아니라 후속 확인 항목이다.
 * 전매·전세·월세 거래 유형은 unit_deal(복수 선택)에서 따로 관리한다.
 */
export const TRADE_FUNDING_TYPES = ["OWN_FUNDS_AFTER_BALANCE", "BALANCE_SHORTAGE", "LOAN_REQUIRED", "UNCONFIRMED"] as const;
export type TradeFundingType = (typeof TRADE_FUNDING_TYPES)[number];
export const TRADE_FUNDING_STATUSES = ["CANDIDATE", "CONFIRMED"] as const;
export type TradeFundingStatus = (typeof TRADE_FUNDING_STATUSES)[number];

export const TRADE_FUNDING_TYPE_LABELS: Record<TradeFundingType, string> = {
  OWN_FUNDS_AFTER_BALANCE: "자기자금 잔금 납부 후 거래",
  BALANCE_SHORTAGE: "잔금 부족으로 거래 추진",
  LOAN_REQUIRED: "대출 후 잔금 납부·거래",
  UNCONFIRMED: "미확인",
};
export const TRADE_FUNDING_STATUS_LABELS: Record<TradeFundingStatus, string> = {
  CANDIDATE: "상담 확인 전 후보",
  CONFIRMED: "상담 확인",
};

/** 유형별 관리 규칙(후속 확인 항목). 미확인은 자금조달 방식 재상담 */
export const TRADE_FUNDING_FOLLOW_UP: Record<TradeFundingType, string> = {
  OWN_FUNDS_AFTER_BALANCE: "잔금 준비일·거래 진행 확인",
  BALANCE_SHORTAGE: "부족액·매수자·임차인 확보 확인",
  LOAN_REQUIRED: "대출 상담·승인 여부·잔금 예정일 확인",
  UNCONFIRMED: "자금조달 방식 재상담",
};

/** 원장·오늘 관리 필터 값(축 안은 OR). 유형 4개 + 상담 확인 전 후보 */
export const TRADE_FUNDING_FILTER_VALUES = [...TRADE_FUNDING_TYPES, "CANDIDATE"] as const;
export type TradeFundingFilterValue = (typeof TRADE_FUNDING_FILTER_VALUES)[number];
export const TRADE_FUNDING_FILTER_LABELS: Record<TradeFundingFilterValue, string> = {
  ...TRADE_FUNDING_TYPE_LABELS,
  CANDIDATE: TRADE_FUNDING_STATUS_LABELS.CANDIDATE,
};

const TRADE_INTENTS = new Set(["SALE_TRANSFER", "RENT"]);

export function isTradeFundingType(value: unknown): value is TradeFundingType {
  return typeof value === "string" && (TRADE_FUNDING_TYPES as readonly string[]).includes(value);
}
export function isTradeFundingStatus(value: unknown): value is TradeFundingStatus {
  return typeof value === "string" && (TRADE_FUNDING_STATUSES as readonly string[]).includes(value);
}

export type TradeFundingRow = {
  currentGrade: string | null;
  effectiveIntent: string | null;
  tradeFundingType?: TradeFundingType | null;
  tradeFundingStatus?: TradeFundingStatus | null;
};

/**
 * 필터 값. 저장된 유형(+후보면 CANDIDATE). 유형이 없으면 거래 의향(전매·임대) 세대만 '미확인',
 * 그 밖의 세대는 값 없음(빈 배열 → 어떤 자금유형 선택에도 걸리지 않음). 등급은 보지 않는다(C·D는 등급 필터와 AND).
 */
export function tradeFundingFilterValues(row: TradeFundingRow): TradeFundingFilterValue[] {
  if (row.tradeFundingType) return [row.tradeFundingType, ...(row.tradeFundingStatus === "CANDIDATE" ? ["CANDIDATE" as const] : [])];
  return TRADE_INTENTS.has(row.effectiveIntent ?? "") ? ["UNCONFIRMED"] : [];
}

/** C·D 거래 자금 후속관리 대상 = 현재 등급 C·D이고 (자금유형이 있거나 거래 의향이 있음). 등급이 바뀌면 분류는 남지만 대상에서 빠진다 */
export function isCdTradeFundingTarget(row: TradeFundingRow): boolean {
  return (row.currentGrade === "C" || row.currentGrade === "D") && tradeFundingFilterValues(row).length > 0;
}

/** 오늘 할 일 문구(후속관리 대상만). 후보는 상담 확인을 먼저 한다 */
export function tradeFundingTodo(row: TradeFundingRow): string | null {
  if (!isCdTradeFundingTarget(row)) return null;
  const type = row.tradeFundingType ?? "UNCONFIRMED";
  return `${row.tradeFundingStatus === "CANDIDATE" ? "자금유형 후보 상담 확인 · " : ""}${TRADE_FUNDING_FOLLOW_UP[type]}`;
}

export type TradeFundingSummary = { targets: number } & Record<TradeFundingFilterValue, number>;

/** 세대 단위 집계(C·D 후속관리 대상만, 같은 세대 중복 행은 1번) */
export function summarizeTradeFunding(rows: readonly (TradeFundingRow & { unitId: string })[]): TradeFundingSummary {
  const units = new Map<string, TradeFundingRow>();
  for (const row of rows) if (!units.has(row.unitId)) units.set(row.unitId, row);
  const summary = { targets: 0, ...Object.fromEntries(TRADE_FUNDING_FILTER_VALUES.map((v) => [v, 0])) } as TradeFundingSummary;
  for (const row of units.values()) {
    if (!isCdTradeFundingTarget(row)) continue;
    summary.targets++;
    for (const value of tradeFundingFilterValues(row)) summary[value]++;
  }
  return summary;
}

export function tradeFundingSummaryText(summary: TradeFundingSummary): string {
  return `후속관리 대상 ${summary.targets}세대 · ${TRADE_FUNDING_FILTER_VALUES.map((v) => `${TRADE_FUNDING_FILTER_LABELS[v]} ${summary[v]}`).join(" · ")}`;
}
