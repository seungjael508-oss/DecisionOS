import type { Database } from "@/lib/supabase/types";

export type OccupancyIntent = Database["public"]["Enums"]["occupancy_intent"];
export type FundingStatus = Database["public"]["Enums"]["funding_status"];
export type MoveInStatus = Database["public"]["Enums"]["move_in_status"];
export type OperationalIntent = Database["public"]["Enums"]["operational_intent"];
export type ProjectMemberRole = Database["public"]["Enums"]["project_member_role"];

/** Existing holder/sibling contract policy: completed contracts remain sold. */
export const VALID_HOLDER_CONTRACT_STATUSES = ["ACTIVE", "COMPLETED"] as const;

export const OCCUPANCY_INTENT_LABELS: Record<OccupancyIntent, string> = {
  SELF_MOVE_IN: "실입주",
  SALE: "매도",
  JEONSE: "전세",
  MONTHLY_RENT: "월세",
  UNDECIDED: "미정",
};

export const FUNDING_STATUS_LABELS: Record<FundingStatus, string> = {
  NORMAL: "정상",
  LOAN_NEEDED: "대출필요",
  FUNDING_SHORTAGE: "자금부족",
  EXISTING_HOME_UNSOLD: "기존주택 미처분",
  UNKNOWN: "미확인",
};

export const MOVE_IN_STATUS_LABELS: Record<MoveInStatus, string> = {
  NOT_CONTACTED: "미접촉",
  CONTACTED: "접촉완료",
  PLANNED: "입주예정",
  DELAYED: "지연",
  BALANCE_PAID: "잔금완납",
  MOVED_IN: "입주완료",
};

export const OPERATIONAL_INTENT_VALUES = [
  "MOVE_IN",
  "CONSIDERING_MOVE_IN",
  "SALE_TRANSFER",
  "RENT",
  "TERMINATION",
  "ABANDONMENT",
  "UNDECIDED",
] as const satisfies readonly OperationalIntent[];

export const OPERATIONAL_INTENT_LABELS: Record<OperationalIntent, string> = {
  MOVE_IN: "입주",
  CONSIDERING_MOVE_IN: "입주 고려",
  SALE_TRANSFER: "전매/매도",
  RENT: "전세/월세",
  TERMINATION: "해지",
  ABANDONMENT: "포기",
  UNDECIDED: "미확정",
};

export const OCCUPANCY_INTENT_VALUES = Object.keys(
  OCCUPANCY_INTENT_LABELS,
) as OccupancyIntent[];

export const FUNDING_STATUS_VALUES = Object.keys(
  FUNDING_STATUS_LABELS,
) as FundingStatus[];

export const MOVE_IN_STATUS_VALUES = Object.keys(
  MOVE_IN_STATUS_LABELS,
) as MoveInStatus[];

export function formatUnitLabel(buildingNo: string, unitNo: string) {
  return `${buildingNo}동 ${unitNo}호`;
}

const KST_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Seoul",
  calendar: "iso8601",
  numberingSystem: "latn",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const parts = Object.fromEntries(
    KST_DATE_TIME_FORMATTER.formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}.${parts.month}.${parts.day} ${parts.hour}:${parts.minute}`;
}

export const CONTACT_TYPE_LABELS: Record<string, string> = {
  CALL: "콜",
  CONSULTATION: "상담",
  MESSAGE: "메시지",
  VISIT: "방문",
};

export function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(date);
}
