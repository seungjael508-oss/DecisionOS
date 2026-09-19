import { isLegacyGrade, LEGACY_GRADE_VALUES, type LegacyGrade } from "@/lib/move-in/consultation";
import {
  FUNDING_STATUS_LABELS,
  MOVE_IN_STATUS_LABELS,
  OCCUPANCY_INTENT_LABELS,
  type FundingStatus,
  type MoveInStatus,
  type OccupancyIntent,
} from "@/lib/move-in/labels";

export type UnitListRow = {
  unitId: string;
  buildingNo: string;
  unitNo: string;
  customerName: string | null;
  phoneQuality?: string | null;
  customerPhone?: string | null;
  latestGrade?: string | null;
  latestConsultation?: string | null;
  latestPreviousHolder?: boolean;
  occupancyIntent: OccupancyIntent | null;
  fundingStatus: FundingStatus | null;
  moveInStatus: MoveInStatus | null;
  balancePaidAt: string | null;
  actualMoveInDate: string | null;
  plannedMoveInDate: string | null;
  lastContactAt: string | null;
  nextContactAt: string | null;
};

export type UnitListFilters = {
  buildingNo: string;
  unitNo: string;
  customerName: string;
  occupancyIntent: OccupancyIntent | "";
  fundingStatus: FundingStatus | "";
  moveInStatus: MoveInStatus | "";
  // 동호수 관리 화면 등급 빠른필터. 기존 테스트가 grade 없이 UnitListFilters를 만들기 때문에 optional로 둔다.
  grade?: LegacyGrade | "";
};

export const DEFAULT_UNIT_LIST_FILTERS: UnitListFilters = {
  buildingNo: "",
  unitNo: "",
  customerName: "",
  occupancyIntent: "",
  fundingStatus: "",
  moveInStatus: "",
  grade: "",
};

export function sortUnits(rows: UnitListRow[]) {
  return [...rows].sort((a, b) => {
    const building = a.buildingNo.localeCompare(b.buildingNo, "ko", { numeric: true });
    if (building !== 0) return building;
    return a.unitNo.localeCompare(b.unitNo, "ko", { numeric: true });
  });
}

export function filterUnits(rows: UnitListRow[], filters: UnitListFilters) {
  const building = filters.buildingNo.trim();
  const unit = filters.unitNo.trim();
  const name = filters.customerName.trim();

  return rows.filter((row) => {
    if (building && !row.buildingNo.includes(building)) return false;
    if (unit && !row.unitNo.includes(unit)) return false;
    if (name && !(row.customerName ?? "").includes(name)) return false;
    if (filters.occupancyIntent && row.occupancyIntent !== filters.occupancyIntent) {
      return false;
    }
    if (filters.fundingStatus && row.fundingStatus !== filters.fundingStatus) {
      return false;
    }
    if (filters.moveInStatus && row.moveInStatus !== filters.moveInStatus) {
      return false;
    }
    if (filters.grade && row.latestGrade !== filters.grade) {
      return false;
    }
    return true;
  });
}

/** 등급별 세대 수. 버튼 라벨은 이 값을 그대로 써야 하며 하드코딩하지 않는다. */
export function gradeCounts(rows: UnitListRow[]): Record<LegacyGrade, number> {
  const counts = Object.fromEntries(
    LEGACY_GRADE_VALUES.map((grade) => [grade, 0]),
  ) as Record<LegacyGrade, number>;
  for (const row of rows) {
    if (row.latestGrade && isLegacyGrade(row.latestGrade)) {
      counts[row.latestGrade] += 1;
    }
  }
  return counts;
}

export type UnitSortKey = "unit" | "name" | "grade";
export type SortDirection = "asc" | "desc";

export const UNIT_SORT_OPTIONS: { key: UnitSortKey; direction: SortDirection; label: string }[] = [
  { key: "unit", direction: "asc", label: "동호수 오름차순" },
  { key: "unit", direction: "desc", label: "동호수 내림차순" },
  { key: "name", direction: "asc", label: "이름 가나다순" },
  { key: "name", direction: "desc", label: "이름 역순" },
  { key: "grade", direction: "asc", label: "등급순 (A→상담거절)" },
  { key: "grade", direction: "desc", label: "등급순 (상담거절→A)" },
];

// 현장 상담 우선순위 순서. 미확인은 등급 정렬에서만 쓰는 fallback 구간이다.
const GRADE_SORT_ORDER = [...LEGACY_GRADE_VALUES, "미확인"] as const;

function gradeSortRank(grade: string | null | undefined): number {
  if (grade && isLegacyGrade(grade)) return GRADE_SORT_ORDER.indexOf(grade);
  return GRADE_SORT_ORDER.indexOf("미확인");
}

/** Excel 스타일 컬럼 정렬. 동호수는 숫자 비교, 이름은 null을 방향과 무관하게 항상 마지막에 둔다. */
export function sortUnitRows(
  rows: UnitListRow[],
  sortKey: UnitSortKey,
  direction: SortDirection,
): UnitListRow[] {
  const sign = direction === "asc" ? 1 : -1;

  if (sortKey === "unit") {
    return [...rows].sort((a, b) => {
      const building = a.buildingNo.localeCompare(b.buildingNo, "ko", { numeric: true });
      if (building !== 0) return building * sign;
      return a.unitNo.localeCompare(b.unitNo, "ko", { numeric: true }) * sign;
    });
  }

  if (sortKey === "name") {
    return [...rows].sort((a, b) => {
      if (!a.customerName && !b.customerName) return 0;
      if (!a.customerName) return 1;
      if (!b.customerName) return -1;
      return a.customerName.localeCompare(b.customerName, "ko") * sign;
    });
  }

  return [...rows].sort((a, b) => {
    return (gradeSortRank(a.latestGrade) - gradeSortRank(b.latestGrade)) * sign;
  });
}

/** 인쇄 헤더용 요약. 고객 개인정보는 담지 않고 적용된 필터 조건만 표기한다. */
export function describeActiveFilters(filters: UnitListFilters): string {
  const parts: string[] = [];
  if (filters.grade) parts.push(`등급: ${filters.grade}`);
  if (filters.buildingNo.trim()) parts.push(`동: ${filters.buildingNo.trim()}`);
  if (filters.unitNo.trim()) parts.push(`호수: ${filters.unitNo.trim()}`);
  if (filters.customerName.trim()) parts.push(`이름: ${filters.customerName.trim()}`);
  if (filters.occupancyIntent) parts.push(`입주의향: ${OCCUPANCY_INTENT_LABELS[filters.occupancyIntent]}`);
  if (filters.fundingStatus) parts.push(`자금상태: ${FUNDING_STATUS_LABELS[filters.fundingStatus]}`);
  if (filters.moveInStatus) parts.push(`입주진행: ${MOVE_IN_STATUS_LABELS[filters.moveInStatus]}`);
  return parts.length === 0 ? "전체" : parts.join(" · ");
}

export type TodayReason =
  | "NEXT_CONTACT"
  | "DELAYED"
  | "FUNDING_SHORTAGE"
  | "EXISTING_HOME_UNSOLD";

export function todayReasons(
  row: Pick<
    UnitListRow,
    "nextContactAt" | "moveInStatus" | "fundingStatus"
  >,
  now = new Date(),
): TodayReason[] {
  const reasons: TodayReason[] = [];
  if (row.nextContactAt) {
    const next = new Date(row.nextContactAt);
    if (!Number.isNaN(next.getTime()) && next.getTime() <= now.getTime()) {
      reasons.push("NEXT_CONTACT");
    }
  }
  if (row.moveInStatus === "DELAYED") reasons.push("DELAYED");
  if (row.fundingStatus === "FUNDING_SHORTAGE") {
    reasons.push("FUNDING_SHORTAGE");
  }
  if (row.fundingStatus === "EXISTING_HOME_UNSOLD") {
    reasons.push("EXISTING_HOME_UNSOLD");
  }
  return reasons;
}

export const TODAY_REASON_LABELS: Record<TodayReason, string> = {
  NEXT_CONTACT: "오늘 재콜",
  DELAYED: "입주 지연",
  FUNDING_SHORTAGE: "자금부족",
  EXISTING_HOME_UNSOLD: "기존주택 미처분",
};

export type TodayFilter = "all" | "next_contact" | "delayed" | "funding";

export function filterTodayRows(
  rows: UnitListRow[],
  filter: TodayFilter,
  now = new Date(),
) {
  return rows.filter((row) => {
    const reasons = todayReasons(row, now);
    if (reasons.length === 0) return false;
    if (filter === "next_contact") return reasons.includes("NEXT_CONTACT");
    if (filter === "delayed") return reasons.includes("DELAYED");
    if (filter === "funding") {
      return (
        reasons.includes("FUNDING_SHORTAGE") ||
        reasons.includes("EXISTING_HOME_UNSOLD")
      );
    }
    return true;
  });
}
