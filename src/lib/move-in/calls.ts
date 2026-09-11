import { todayReasons } from "@/lib/move-in/filters";
import type { FundingStatus, MoveInStatus, OccupancyIntent } from "@/lib/move-in/labels";
import type { LegacyGrade } from "@/lib/move-in/consultation";

export type CallListRow = {
  unitId: string;
  buildingNo: string;
  unitNo: string;
  customerId: string;
  customerName: string | null;
  customerPhone: string | null;
  phoneNormalized: string | null;
  assignedCounselorId: string | null;
  latestGrade: LegacyGrade | null;
  occupancyIntent: OccupancyIntent | null;
  fundingStatus: FundingStatus | null;
  moveInStatus: MoveInStatus | null;
  lastConsultedAt: string | null;
  nextContactAt: string | null;
};

export type CallListFilters = {
  q: string;
  counselorId: string;
  legacyGrade: LegacyGrade | "";
  occupancyIntent: OccupancyIntent | "";
  fundingStatus: FundingStatus | "";
  moveInStatus: MoveInStatus | "";
  nextContactDue: boolean;
};

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function parseDongHoQuery(
  q: string,
): { buildingNo: string; unitNo: string } | null {
  const match = q.trim().match(/^(\d+)\s*[-/]\s*(\d+)$/);
  if (!match) return null;
  return { buildingNo: match[1], unitNo: match[2] };
}

export function sortCallRows(rows: CallListRow[]) {
  return [...rows].sort((a, b) => {
    const building = a.buildingNo.localeCompare(b.buildingNo, "ko");
    if (building !== 0) return building;
    return a.unitNo.localeCompare(b.unitNo, "ko");
  });
}

export function filterCallRows(
  rows: CallListRow[],
  filters: CallListFilters,
  now = new Date(),
) {
  const q = filters.q.trim();
  const dongHo = parseDongHoQuery(q);
  const phoneQuery = digitsOnly(q);

  return rows.filter((row) => {
    if (dongHo) {
      if (row.buildingNo !== dongHo.buildingNo || row.unitNo !== dongHo.unitNo) {
        return false;
      }
    } else if (q) {
      const name = row.customerName ?? "";
      const phone = digitsOnly(row.phoneNormalized ?? row.customerPhone ?? "");
      const matchesText =
        row.buildingNo.includes(q) ||
        row.unitNo.includes(q) ||
        name.includes(q) ||
        (phoneQuery.length > 0 && phone.includes(phoneQuery));
      if (!matchesText) return false;
    }

    if (filters.counselorId && row.assignedCounselorId !== filters.counselorId) {
      return false;
    }
    if (filters.legacyGrade && row.latestGrade !== filters.legacyGrade) {
      return false;
    }
    if (filters.occupancyIntent && row.occupancyIntent !== filters.occupancyIntent) {
      return false;
    }
    if (filters.fundingStatus && row.fundingStatus !== filters.fundingStatus) {
      return false;
    }
    if (filters.moveInStatus && row.moveInStatus !== filters.moveInStatus) {
      return false;
    }
    if (filters.nextContactDue) {
      if (
        !todayReasons(
          {
            nextContactAt: row.nextContactAt,
            moveInStatus: row.moveInStatus,
            fundingStatus: row.fundingStatus,
          },
          now,
        ).includes("NEXT_CONTACT")
      ) {
        return false;
      }
    }
    return true;
  });
}

export function sortConsultationsNewestFirst<T extends { consultedAt: string }>(
  rows: T[],
) {
  return [...rows].sort((a, b) => b.consultedAt.localeCompare(a.consultedAt));
}
