import type { Database } from "@/lib/supabase/types";

export type OccupancyIntent = Database["public"]["Enums"]["occupancy_intent"];
export type FundingStatus = Database["public"]["Enums"]["funding_status"];
export type MoveInStatus = Database["public"]["Enums"]["move_in_status"];
export type ProjectMemberRole = Database["public"]["Enums"]["project_member_role"];

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

export function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
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
