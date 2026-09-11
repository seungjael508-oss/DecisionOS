import { lookupCounselorId } from "@/lib/legacy-migration/map";
import { extractOccupancyCandidates } from "@/lib/legacy-migration/occupancy";
import type {
  LegacyCustomerCandidate,
  LegacyMigrationPreview,
  LegacyMigrationReason,
  LegacyPreviewRow,
  LegacyPreviewStatus,
  LegacyUnitRecord,
  StayJMigrationCatalog,
} from "@/lib/legacy-migration/types";
import { LEGACY_MIGRATION_DB_WRITES } from "@/lib/legacy-migration/types";

function unitKey(buildingNo: string, unitNo: string) {
  return `${buildingNo}|${unitNo}`;
}

function latestHistoryGrade(record: LegacyUnitRecord) {
  const dated = record.consultations
    .filter((item) => item.consultedAt)
    .sort((a, b) => (a.consultedAt ?? "").localeCompare(b.consultedAt ?? ""));
  const last = dated.at(-1);
  return last?.structuredTags.legacy_grade ?? last?.rawEvaluation ?? null;
}

function statusOf(reasons: LegacyMigrationReason[]): LegacyPreviewStatus {
  if (
    reasons.includes("UNIT_NOT_FOUND") ||
    reasons.includes("INVALID_PHONE") ||
    reasons.includes("INVALID_HISTORY_ROW")
  ) {
    return "ERROR";
  }
  if (reasons.length > 0) return "REVIEW_REQUIRED";
  return "READY";
}

export function buildLegacyMigrationPreview(input: {
  records: LegacyUnitRecord[];
  catalog: StayJMigrationCatalog;
  counselorMap: Record<string, string>;
}): LegacyMigrationPreview {
  const unitsByKey = new Map(
    input.catalog.units.map((unit) => [
      unitKey(unit.buildingNo, unit.unitNo),
      unit,
    ]),
  );
  const customerByPhone = new Map(
    input.catalog.customers.map((item) => [item.phoneNormalized, item]),
  );

  const groups = new Map<string, LegacyCustomerCandidate>();
  for (const record of input.records) {
    const key = record.phoneNormalized
      ? `phone:${record.phoneNormalized}`
      : `missing:${unitKey(record.buildingNo, record.unitNo)}`;
    const existing = groups.get(key);
    const unitRef = {
      buildingNo: record.buildingNo,
      unitNo: record.unitNo,
    };
    if (existing) {
      existing.units.push(unitRef);
      continue;
    }
    groups.set(key, {
      key,
      customerName: record.customerName,
      phoneNormalized: record.phoneNormalized,
      stayJCustomerId: record.phoneNormalized
        ? (customerByPhone.get(record.phoneNormalized)?.id ?? null)
        : null,
      units: [unitRef],
    });
  }

  const customerCandidates = [...groups.values()];
  const multiKeys = new Set(
    customerCandidates.filter((item) => item.units.length > 1).map((item) => item.key),
  );

  const rows: LegacyPreviewRow[] = input.records.map((record) => {
    const reasons: LegacyMigrationReason[] = [];
    const catalogUnit = unitsByKey.get(
      unitKey(record.buildingNo, record.unitNo),
    );
    if (!catalogUnit) reasons.push("UNIT_NOT_FOUND");
    if (!record.phoneNormalized) {
      reasons.push("INVALID_PHONE");
      reasons.push("CUSTOMER_IDENTITY");
    }
    const customerKey = record.phoneNormalized
      ? `phone:${record.phoneNormalized}`
      : `missing:${unitKey(record.buildingNo, record.unitNo)}`;
    if (multiKeys.has(customerKey)) reasons.push("MULTI_UNIT_HOLDER");

    const assignee = lookupCounselorId(record.counselorName, input.counselorMap);
    if (assignee.missing) reasons.push("COUNSELOR_MAPPING_REQUIRED");
    const historyUnmapped = record.consultations.some((item) => {
      return lookupCounselorId(item.counselorName, input.counselorMap).missing;
    });
    if (historyUnmapped && !assignee.missing) {
      reasons.push("COUNSELOR_MAPPING_REQUIRED");
    }

    if (record.consultations.some((item) => item.invalid)) {
      reasons.push("INVALID_HISTORY_ROW");
    }

    const latest = latestHistoryGrade(record);
    if (
      record.legacyGrade &&
      latest &&
      record.legacyGrade !== latest
    ) {
      reasons.push("LATEST_GRADE_MISMATCH");
    }
    if (record.resale.length > 0) reasons.push("HOLDER_CHANGE_HISTORY");

    const occupancyCandidates = extractOccupancyCandidates({
      contents: record.consultations.map((item) => item.content),
      deal: record.deal,
      resale: record.resale,
    });

    return {
      buildingNo: record.buildingNo,
      unitNo: record.unitNo,
      unitId: catalogUnit?.unitId ?? null,
      customerName: record.customerName,
      phoneNormalized: record.phoneNormalized,
      stayJCustomerId: record.phoneNormalized
        ? (customerByPhone.get(record.phoneNormalized)?.id ?? null)
        : null,
      counselorName: record.counselorName,
      assigneeProjectMemberId: assignee.id,
      status: statusOf(reasons),
      reasons,
      writeKind: "none",
      legacyGrade: record.legacyGrade,
      latestHistoryGrade: latest,
      occupancyCandidates,
      consultations: record.consultations,
      resale: record.resale,
      deal: record.deal,
      legacySummary: record.legacySummary,
    };
  });

  return {
    dbWrites: LEGACY_MIGRATION_DB_WRITES,
    rows,
    customerCandidates,
  };
}
