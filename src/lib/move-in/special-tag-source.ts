import {
  buildSpecialTagIndex,
  type SpecialTagSourceIndex,
} from "@/lib/move-in/special-tags";

/**
 * Redacted, unit-key-only projection of the approved Hwayang workbooks.
 * Customer names and contact details are intentionally not shipped to the UI.
 * F001 is the delinquent-unit source and F002 is the 36-unit Asel contract
 * source. The investment-contract workbook is tracked independently by
 * investment-source.ts even though its verified unit key set currently
 * matches the Asel source.
 */
const HWAYANG_PROJECT_ID = "1283e198-5043-4027-96d6-edcc7a6686c6";

export const SPECIAL_TAG_SOURCE_MANIFEST = {
  delinquent: {
    fileId: "F001",
    sha256: "1ebef8d0f1b7549bb9a5bb5553d7c25a5277e86a61f30b8241d1d8ac1e857ada",
    rowCount: 30,
  },
  asel: {
    fileId: "F002",
    sourceFileName: "아셀 계약자.xlsx",
    sha256: "481d4d599f82d79661209fea1815a230612b8a382db29a07577e2dbe6c126af2",
    rowCount: 36,
  },
} as const;

const ASEL_SOURCE_ROWS = [
  [106, 1101], [107, 301], [103, 504], [103, 404], [105, 504], [106, 501],
  [102, 304], [103, 704], [103, 604], [106, 502], [106, 602], [106, 702],
  [106, 601], [104, 502], [106, 301], [103, 304], [105, 403], [105, 404],
  [103, 303], [103, 204], [104, 402], [104, 404], [106, 402], [103, 503],
  [105, 303], [104, 301], [106, 302], [104, 302], [104, 203], [105, 202],
  [105, 304], [104, 304], [104, 204], [105, 203], [105, 201], [104, 202],
] as const;

const DELINQUENT_SOURCE_ROWS = [
  [101, 701, "기연체자", null],
  [101, 1004, "기연체자", null],
  [103, 1803, "기연체자", null],
  [105, 202, "신용하락", "아셀"],
  [108, 502, "신용하락", null],
  [101, 202, "중도금 미발생", null],
  [102, 304, "중도금 미발생", "아셀"],
  [102, 504, "중도금 미발생", null],
  [102, 1203, "신용하락", null],
  [103, 504, "중도금 미발생", "아셀"],
  [103, 1004, "중도금 미발생", null],
  [103, 1504, "중도금 미발생", null],
  [103, 2204, "기연체자", null],
  [104, 402, "중도금 미발생", "아셀"],
  [108, 2801, "기연체자", null],
  [103, 304, "중도금 미발생", "아셀"],
  [103, 403, "중도금 미발생", null],
  [104, 202, "중도금 미발생", "아셀"],
  [104, 301, "중도금 미발생", "아셀"],
  [104, 302, "중도금 미발생", "아셀"],
  [104, 404, "중도금 미발생", "아셀"],
  [105, 403, "중도금 미발생", "아셀"],
  [106, 302, "중도금 미발생", "아셀"],
  [106, 502, "중도금 미발생", "아셀"],
  [106, 602, "중도금 미발생", "아셀"],
  [106, 1001, "중도금 미발생", null],
  [106, 1201, "중도금 미발생", null],
  [108, 401, "중도금 미발생", null],
  [101, 501, "기연체자", null],
  [104, 2804, "기표중지(6회차)", null],
] as const;

export function loadHwayangSpecialTagSourceIndex(projectId: string): SpecialTagSourceIndex {
  if (projectId !== HWAYANG_PROJECT_ID) return new Map();
  return buildSpecialTagIndex({
    aselRows: ASEL_SOURCE_ROWS.map(([buildingNo, unitNo]) => ({
      buildingNo: String(buildingNo),
      unitNo: String(unitNo),
    })),
    delinquentRows: DELINQUENT_SOURCE_ROWS.map(([buildingNo, unitNo, overdueCategory, investmentGroup]) => ({
      buildingNo: String(buildingNo),
      unitNo: String(unitNo),
      overdueCategory,
      investmentGroup,
    })),
  });
}
