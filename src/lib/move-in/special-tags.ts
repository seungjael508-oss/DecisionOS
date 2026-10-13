export const SPECIAL_MANAGEMENT_TAG_VALUES = [
  "D_GRADE",
  "DELINQUENT",
  "ASEL",
  "INVESTOR",
] as const;

export type SpecialManagementTag = (typeof SPECIAL_MANAGEMENT_TAG_VALUES)[number];

export const SPECIAL_MANAGEMENT_TAG_LABELS: Record<SpecialManagementTag, string> = {
  D_GRADE: "D등급",
  DELINQUENT: "연체자",
  ASEL: "아셀",
  INVESTOR: "투자",
};

export function isSpecialManagementTag(value: string): value is SpecialManagementTag {
  return (SPECIAL_MANAGEMENT_TAG_VALUES as readonly string[]).includes(value);
}

/** Current authorized unit projection used to derive the D tag. */
export type SpecialTagRow = {
  unitId: string;
  buildingNo: string;
  unitNo: string;
  latestGrade: string | null;
  customerName?: string | null;
};

export type AselSourceRow = {
  buildingNo: string;
  unitNo: string;
};

export type DelinquentSourceRow = {
  buildingNo: string;
  unitNo: string;
  overdueCategory: string | null;
  investmentGroup: string | null;
};

export type SpecialTagSourceIndex = Map<string, {
  delinquent: boolean;
  overdueCategory: string | null;
  asel: boolean;
  investor: boolean;
}>;

export type SpecialTagResult = {
  tags: SpecialManagementTag[];
  overdueCategory: string | null;
};

/** Canonicalizes spreadsheet values such as 0704 and 704 to one unit key. */
export function specialUnitKey(buildingNo: string, unitNo: string): string {
  const canonical = (value: string) => {
    const trimmed = value.trim();
    const withoutLeadingZeros = trimmed.replace(/^0+(?=\d)/, "");
    return withoutLeadingZeros || "0";
  };
  return `${canonical(buildingNo)}-${canonical(unitNo)}`;
}

export function buildSpecialTagIndex(input: {
  aselRows: readonly AselSourceRow[];
  delinquentRows: readonly DelinquentSourceRow[];
  investorRows?: readonly AselSourceRow[];
}): SpecialTagSourceIndex {
  const index: SpecialTagSourceIndex = new Map();
  const get = (buildingNo: string, unitNo: string) => {
    const key = specialUnitKey(buildingNo, unitNo);
    const current = index.get(key) ?? {
      delinquent: false,
      overdueCategory: null,
      asel: false,
      investor: false,
    };
    index.set(key, current);
    return current;
  };

  for (const source of input.aselRows) {
    get(source.buildingNo, source.unitNo).asel = true;
  }
  for (const source of input.delinquentRows) {
    const current = get(source.buildingNo, source.unitNo);
    current.delinquent = true;
    if (!current.overdueCategory && source.overdueCategory?.trim()) {
      current.overdueCategory = source.overdueCategory.trim();
    }
    if (source.investmentGroup?.trim() === "아셀") current.asel = true;
  }
  for (const source of input.investorRows ?? []) {
    get(source.buildingNo, source.unitNo).investor = true;
  }
  return index;
}

export function deriveSpecialManagementTags(
  row: SpecialTagRow,
  sourceIndex: SpecialTagSourceIndex,
): SpecialTagResult {
  const source = sourceIndex.get(specialUnitKey(row.buildingNo, row.unitNo));
  const tags: SpecialManagementTag[] = [];
  if (row.latestGrade === "D") tags.push("D_GRADE");
  if (source?.delinquent) tags.push("DELINQUENT");
  if (source?.asel) tags.push("ASEL");
  if (source?.investor) tags.push("INVESTOR");
  return { tags, overdueCategory: source?.overdueCategory ?? null };
}

export function filterRowsBySpecialTags<T extends { specialTags: readonly SpecialManagementTag[] }>(
  rows: readonly T[],
  selectedTags: readonly SpecialManagementTag[],
): T[] {
  if (selectedTags.length === 0) return [...rows];
  return rows.filter((row) => selectedTags.every((tag) => row.specialTags.includes(tag)));
}
