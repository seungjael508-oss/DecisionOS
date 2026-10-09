import type {
  LegacyMigrationPreview,
  LegacyQualityReport,
} from "@/lib/legacy-migration/types";

function bump(map: Record<string, number>, key: string) {
  map[key] = (map[key] ?? 0) + 1;
}

export function buildLegacyQualityReport(
  preview: LegacyMigrationPreview,
  now = new Date(),
): LegacyQualityReport {
  const gradeDistribution: Record<string, number> = {};
  const counselorUnitCounts: Record<string, number> = {};
  const frequency = { "0": 0, "1": 0, "2": 0, "3+": 0 };
  let consultationCount = 0;
  let consultedLast7Days = 0;
  let noContactOver30Days = 0;
  let repeatedAbsenceCount = 0;
  let resaleCount = 0;
  let dealCount = 0;
  let ready = 0;
  let reviewRequired = 0;
  let error = 0;
  let unitNotFoundCount = 0;
  let counselorMappingFailureCount = 0;
  let missingPhoneCount = 0;

  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  for (const row of preview.rows) {
    if (row.status === "READY") ready += 1;
    if (row.status === "REVIEW_REQUIRED") reviewRequired += 1;
    if (row.status === "ERROR") error += 1;
    if (row.reasons.includes("UNIT_NOT_FOUND")) unitNotFoundCount += 1;
    if (row.reasons.includes("COUNSELOR_MAPPING_REQUIRED")) {
      counselorMappingFailureCount += 1;
    }
    if (!row.phoneNormalized) missingPhoneCount += 1;
    bump(counselorUnitCounts, row.counselorName ?? "(미배정)");
    if (row.resale.length > 0) resaleCount += 1;
    if (row.deal) dealCount += 1;

    const count = row.consultations.length;
    consultationCount += count;
    if (count === 0) frequency["0"] += 1;
    else if (count === 1) frequency["1"] += 1;
    else if (count === 2) frequency["2"] += 1;
    else frequency["3+"] += 1;

    const absences = row.consultations.filter(
      (item) => item.structuredTags.legacy_grade === "부재",
    ).length;
    if (absences >= 2) repeatedAbsenceCount += 1;

    for (const item of row.consultations) {
      const grade =
        item.structuredTags.legacy_grade ?? item.rawEvaluation ?? "(없음)";
      bump(gradeDistribution, grade);
    }

    const latest = row.consultations
      .map((item) => item.consultedAt)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1);
    if (latest) {
      const age = now.getTime() - new Date(latest).getTime();
      if (age <= sevenDays) consultedLast7Days += 1;
      if (age >= thirtyDays) noContactOver30Days += 1;
    } else if (count === 0) {
      noContactOver30Days += 1;
    }
  }

  return {
    unitCount: preview.rows.length,
    uniqueCustomerCount: preview.customerCandidates.length,
    missingPhoneCount,
    multiUnitHolderCount: preview.customerCandidates.filter(
      (item) => item.units.length > 1,
    ).length,
    consultationCount,
    averageConsultations:
      preview.rows.length === 0
        ? 0
        : Number((consultationCount / preview.rows.length).toFixed(2)),
    gradeDistribution,
    counselorUnitCounts,
    resaleCount,
    dealCount,
    ready,
    reviewRequired,
    error,
    unitNotFoundCount,
    counselorMappingFailureCount,
    consultationFrequency: frequency,
    consultedLast7Days,
    noContactOver30Days,
    repeatedAbsenceCount,
  };
}
