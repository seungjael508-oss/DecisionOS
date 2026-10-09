import { specialUnitKey } from "@/lib/move-in/special-tags";

/**
 * PII-free projection of the approved investment-contract workbook. Only
 * normalized building/unit keys are retained; investor names and contract
 * details never enter the application bundle. The Asel source remains a
 * separate source even though its verified unit key set currently matches
 * this source exactly.
 */
export const INVESTOR_SOURCE_MANIFEST = {
  available: true,
  sourceFileName: "평택 푸르지오 투자계약 36건.xlsx",
  sourceSha256: "d836b44a09d91e40de44534e9bec664f165d5cad0fe5d7dfd164da77809c798b",
  sourceSheet: "Sheet1",
  rowCount: 36,
  exactUnitMatchCount: 36,
  missingUnitCount: 0,
  extraUnitCount: 0,
  duplicateUnitCount: 0,
  aselSourceFileName: "아셀 계약자.xlsx",
  aselSourceSha256: "481d4d599f82d79661209fea1815a230612b8a382db29a07577e2dbe6c126af2",
  aselRowCount: 36,
} as const;

const INVESTOR_UNIT_KEYS = [
  "102-304", "103-204", "103-303", "103-304", "103-404", "103-503", "103-504", "103-604", "103-704",
  "104-202", "104-203", "104-204", "104-301", "104-302", "104-304", "104-402", "104-404",
  "104-502", "105-201", "105-202", "105-203", "105-303", "105-304", "105-403", "105-404", "105-504",
  "106-301", "106-302", "106-402", "106-501", "106-502", "106-601", "106-602", "106-702", "106-1101",
  "107-301",
] as const;

export const INVESTOR_UNIT_KEY_SET: ReadonlySet<string> = new Set(INVESTOR_UNIT_KEYS);

export function loadHwayangInvestorUnitKeys(projectId: string): ReadonlySet<string> {
  if (projectId !== "1283e198-5043-4027-96d6-edcc7a6686c6") return new Set();
  return INVESTOR_UNIT_KEY_SET;
}

export function investorUnitKey(buildingNo: string, unitNo: string) {
  return specialUnitKey(buildingNo, unitNo);
}
