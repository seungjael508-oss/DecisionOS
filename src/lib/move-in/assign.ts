import { digitsOnly, type CallListRow } from "@/lib/move-in/calls";
import { gradeSortRank } from "@/lib/move-in/filters";
import type { LegacyGrade } from "@/lib/move-in/consultation";

// 동호수 관리 화면(filters.ts)과 동일하게 서버에서 받은 rows를 브라우저에서만 필터링한다.
// 필터 변경마다 router.push/refresh나 Supabase 재조회를 하지 않는다.
export type AssignFilters = {
  grade: LegacyGrade | "";
  buildingNo: string;
  unitNo: string;
  customerName: string;
  customerPhone: string;
  counselorId: string;
  unassignedOnly: boolean;
};

export const DEFAULT_ASSIGN_FILTERS: AssignFilters = {
  grade: "",
  buildingNo: "",
  unitNo: "",
  customerName: "",
  customerPhone: "",
  counselorId: "",
  unassignedOnly: false,
};

// 모든 조건은 AND로 조합된다 (예: D + 105동 + 미배정).
// 미배정만 체크 시에는 담당상담사 필터를 무시한다 (동시에 켜면 항상 0건이 되어 혼란을 준다).
export function filterAssignRows(
  rows: CallListRow[],
  filters: AssignFilters,
): CallListRow[] {
  const building = filters.buildingNo.trim();
  const unit = filters.unitNo.trim();
  const name = filters.customerName.trim();
  const phone = digitsOnly(filters.customerPhone.trim());

  return rows.filter((row) => {
    if (filters.grade && row.latestGrade !== filters.grade) return false;
    if (building && !row.buildingNo.includes(building)) return false;
    if (unit && !row.unitNo.includes(unit)) return false;
    if (name && !(row.customerName ?? "").includes(name)) return false;
    if (phone) {
      const rowPhone = digitsOnly(row.phoneNormalized ?? row.customerPhone ?? "");
      if (!rowPhone.includes(phone)) return false;
    }
    if (filters.unassignedOnly) {
      if (row.assignedCounselorId) return false;
    } else if (filters.counselorId && row.assignedCounselorId !== filters.counselorId) {
      return false;
    }
    return true;
  });
}

export type AssignSortKey = "unit" | "name" | "grade";
export type AssignSortDirection = "asc" | "desc";

export const ASSIGN_SORT_OPTIONS: {
  key: AssignSortKey;
  direction: AssignSortDirection;
  label: string;
}[] = [
  { key: "unit", direction: "asc", label: "동호수 오름차순" },
  { key: "unit", direction: "desc", label: "동호수 내림차순" },
  { key: "name", direction: "asc", label: "계약자명 가나다순" },
  { key: "name", direction: "desc", label: "계약자명 역순" },
  { key: "grade", direction: "asc", label: "등급순 (A→상담거절)" },
  { key: "grade", direction: "desc", label: "등급순 (상담거절→A)" },
];

/** Excel 스타일 컬럼 정렬. filters.ts의 sortUnitRows와 동일한 규칙(등급은 gradeSortRank 공용). */
export function sortAssignRows(
  rows: CallListRow[],
  sortKey: AssignSortKey,
  direction: AssignSortDirection,
): CallListRow[] {
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

  return [...rows].sort(
    (a, b) => (gradeSortRank(a.latestGrade) - gradeSortRank(b.latestGrade)) * sign,
  );
}

export function uniqueCustomerIds(ids: string[]) {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const id of ids) {
    const trimmed = id.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    unique.push(trimmed);
  }
  return unique;
}

export function canSubmitAssignment(customerIds: string[], assigneeId: string) {
  return uniqueCustomerIds(customerIds).length > 0 && assigneeId.trim().length > 0;
}

// UUID 일부를 노출하는 "상담사 xxxx" 표기는 금지한다.
// display_name이 없으면(다른 프로젝트, 아직 미등록) 이 문구로 대체한다.
export const UNKNOWN_FIELD_MEMBER_LABEL = "이름 미등록";

export function fieldMemberLabel(displayName: string | null | undefined): string {
  return displayName?.trim() || UNKNOWN_FIELD_MEMBER_LABEL;
}

export function isValidFieldMemberDisplayName(value: string) {
  const trimmed = value.trim();
  return trimmed.length >= 2 && trimmed.length <= 30;
}
