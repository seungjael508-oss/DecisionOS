export type ProblemUnitColor = "RED" | "ORANGE" | "YELLOW" | "BLUE" | "GREEN" | "GRAY";

type ProblemUnitPresentationInput = {
  problemCategories?: readonly string[] | null;
  priority?: string | null;
  occupancyIntent?: string | null;
  operationalIntent?: string | null;
};

type ProblemUnitPresentation = {
  color: ProblemUnitColor;
  badgeLabel: string;
  barClassName: string;
  rowClassName: string;
};

const PRESENTATION_BY_CATEGORY: Record<string, Omit<ProblemUnitPresentation, "barClassName" | "rowClassName">> = {
  LEGAL: { color: "RED", badgeLabel: "법률 이슈" },
  REHABILITATION: { color: "RED", badgeLabel: "회생" },
  SEIZURE: { color: "RED", badgeLabel: "압류" },
  LITIGATION: { color: "RED", badgeLabel: "소송" },
  PAYMENT_DEFAULT: { color: "ORANGE", badgeLabel: "납부 연체" },
  CREDIT: { color: "ORANGE", badgeLabel: "신용 이슈" },
  LOAN_BLOCKED: { color: "ORANGE", badgeLabel: "대출 제한" },
  TERMINATION_RISK: { color: "YELLOW", badgeLabel: "해지 위험" },
  ABANDONMENT: { color: "YELLOW", badgeLabel: "관리 이탈" },
  REPEATED_NO_CONTACT: { color: "YELLOW", badgeLabel: "반복 미접촉" },
  SALE: { color: "BLUE", badgeLabel: "매도 관리" },
  TRANSFER: { color: "BLUE", badgeLabel: "전매 관리" },
  JEONSE: { color: "BLUE", badgeLabel: "전세 관리" },
  MONTHLY_RENT: { color: "BLUE", badgeLabel: "월세 관리" },
  MOVE_IN_CONFIRMED: { color: "GREEN", badgeLabel: "입주 확정" },
  PAYMENT_READY: { color: "GREEN", badgeLabel: "납부 준비" },
  UNKNOWN: { color: "GRAY", badgeLabel: "미분류" },
  UNCLASSIFIED: { color: "GRAY", badgeLabel: "미분류" },
};

const PRESENTATION_BY_OPERATIONAL_INTENT: Record<string, Omit<ProblemUnitPresentation, "barClassName" | "rowClassName">> = {
  MOVE_IN: { color: "GREEN", badgeLabel: "입주" },
  CONSIDERING_MOVE_IN: { color: "GRAY", badgeLabel: "입주 고려" },
  SALE_TRANSFER: { color: "BLUE", badgeLabel: "전매/매도" },
  RENT: { color: "BLUE", badgeLabel: "전세/월세" },
  TERMINATION: { color: "YELLOW", badgeLabel: "해지" },
  ABANDONMENT: { color: "YELLOW", badgeLabel: "포기" },
  UNDECIDED: { color: "GRAY", badgeLabel: "미확정" },
};

const COLOR_RANK: Record<ProblemUnitColor, number> = {
  RED: 0,
  ORANGE: 1,
  YELLOW: 2,
  BLUE: 3,
  GREEN: 4,
  GRAY: 5,
};

const COLOR_CLASSES: Record<ProblemUnitColor, Pick<ProblemUnitPresentation, "barClassName" | "rowClassName">> = {
  RED: { barClassName: "bg-red-600", rowClassName: "bg-red-50" },
  ORANGE: { barClassName: "bg-orange-500", rowClassName: "bg-orange-50" },
  YELLOW: { barClassName: "bg-yellow-500", rowClassName: "bg-yellow-50" },
  BLUE: { barClassName: "bg-blue-600", rowClassName: "bg-blue-50" },
  GREEN: { barClassName: "bg-green-600", rowClassName: "bg-green-50" },
  GRAY: { barClassName: "bg-gray-400", rowClassName: "bg-gray-50" },
};

export function getProblemUnitPresentation(
  input: ProblemUnitPresentationInput,
): ProblemUnitPresentation {
  const candidates = [
    ...(input.problemCategories ?? []),
    input.priority ?? "",
    input.occupancyIntent ?? "",
  ]
    .map((value) => value.trim().toUpperCase())
    .map((value) => PRESENTATION_BY_CATEGORY[value])
    .filter((value): value is Omit<ProblemUnitPresentation, "barClassName" | "rowClassName"> => Boolean(value));

  const operationalIntentCandidate = input.operationalIntent
    ? PRESENTATION_BY_OPERATIONAL_INTENT[input.operationalIntent.trim().toUpperCase()]
    : undefined;
  if (operationalIntentCandidate) candidates.push(operationalIntentCandidate);

  const selected = candidates.sort((left, right) => COLOR_RANK[left.color] - COLOR_RANK[right.color])[0]
    ?? PRESENTATION_BY_CATEGORY.UNCLASSIFIED;

  return { ...selected, ...COLOR_CLASSES[selected.color] };
}
