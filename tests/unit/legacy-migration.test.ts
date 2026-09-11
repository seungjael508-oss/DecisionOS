import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { normalizePhone } from "@/lib/import/normalize";
import {
  LEGACY_MIGRATION_DB_WRITES,
  LEGACY_PORTAL_READ_ACTIONS,
  LEGACY_PORTAL_WRITE_ACTIONS,
  buildLegacyMigrationPreview,
  buildLegacyQualityReport,
  extractOccupancyCandidates,
  mapHistoryType,
  normalizeLegacyUnits,
} from "@/lib/legacy-migration";
import type {
  LegacyPortalUnit,
  StayJMigrationCatalog,
} from "@/lib/legacy-migration";

const fixtureDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/legacy-migration",
);

function loadFixtureUnits(): LegacyPortalUnit[] {
  return JSON.parse(
    readFileSync(join(fixtureDir, "units.json"), "utf8"),
  ) as LegacyPortalUnit[];
}

const CATALOG: StayJMigrationCatalog = {
  projectId: "20000000-0000-4000-8000-000000000001",
  units: [
    {
      unitId: "u-101-1001",
      buildingNo: "101",
      unitNo: "1001",
      unitType: "84A",
    },
    {
      unitId: "u-102-1503",
      buildingNo: "102",
      unitNo: "1503",
      unitType: "84A",
    },
    {
      unitId: "u-103-804",
      buildingNo: "103",
      unitNo: "804",
      unitType: "59B",
    },
  ],
  customers: [
    {
      id: "c-a",
      name: "고객A",
      phoneNormalized: "01000000001",
    },
  ],
};

const COUNSELOR_MAP = {
  상담사A: "40000000-0000-4000-8000-00000000000a",
};

describe("legacy migration phone normalize", () => {
  it("normalizes dotted and dashed phones to digits", () => {
    expect(normalizePhone("010-0000-0001")).toBe("01000000001");
    expect(normalizePhone("010.0000.0001")).toBe("01000000001");
  });

  it("rejects too-short phones as invalid", () => {
    expect(normalizePhone("123-456")).toBeNull();
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
  });
});

describe("legacy migration normalize + preview", () => {
  const units = loadFixtureUnits();
  const normalized = normalizeLegacyUnits(units);
  const preview = buildLegacyMigrationPreview({
    records: normalized,
    catalog: CATALOG,
    counselorMap: COUNSELOR_MAP,
  });

  it("keeps the same phone as one customer with multiple units", () => {
    const multi = preview.customerCandidates.filter(
      (item) => item.phoneNormalized === "01000000001",
    );
    expect(multi).toHaveLength(1);
    expect(multi[0]?.units).toEqual([
      { buildingNo: "101", unitNo: "1001" },
      { buildingNo: "102", unitNo: "1503" },
    ]);
    expect(
      preview.rows
        .filter((row) => row.phoneNormalized === "01000000001")
        .every((row) => row.reasons.includes("MULTI_UNIT_HOLDER")),
    ).toBe(true);
  });

  it("does not merge the same name with a different phone", () => {
    const namedA = preview.customerCandidates.filter(
      (item) => item.customerName === "고객A",
    );
    expect(namedA).toHaveLength(2);
    expect(namedA.map((item) => item.phoneNormalized).sort()).toEqual([
      "01000000001",
      "01000000099",
    ]);
  });

  it("preserves every history row as a consultation without rewriting content", () => {
    const first = normalized.find(
      (row) => row.buildingNo === "101" && row.unitNo === "1001",
    );
    expect(first?.consultations).toHaveLength(3);
    expect(first?.consultations.map((item) => item.content)).toEqual([
      "1회차 상담 원문",
      "2회차 부재",
      "3회차 전세 문의",
    ]);
    expect(first?.legacySummary).toBe("원본 summary는 대체하지 않음");
  });

  it("stores legacy grade and source without dropping A/B/C/D/부재/상담거절", () => {
    const grades = normalized.flatMap((row) =>
      row.consultations.map((item) => item.structuredTags?.legacy_grade),
    );
    expect(grades).toEqual(
      expect.arrayContaining(["A", "B", "C", "부재", "상담거절"]),
    );
    expect(
      normalized
        .flatMap((row) => row.consultations)
        .every((item) => item.structuredTags?.legacy_source === "old_crm"),
    ).toBe(true);
  });

  it("flags counselor mapping failure without inventing a FK", () => {
    const row = preview.rows.find(
      (item) => item.buildingNo === "103" && item.unitNo === "804",
    );
    expect(row?.reasons).toContain("COUNSELOR_MAPPING_REQUIRED");
    expect(row?.assigneeProjectMemberId).toBeNull();
    expect(row?.status).toBe("REVIEW_REQUIRED");
  });

  it("flags unit not found instead of auto-creating", () => {
    const row = preview.rows.find(
      (item) => item.buildingNo === "999" && item.unitNo === "1",
    );
    expect(row?.status).toBe("ERROR");
    expect(row?.reasons).toContain("UNIT_NOT_FOUND");
    expect(row?.unitId).toBeNull();
  });

  it("flags invalid history rows while still preserving them", () => {
    const row = preview.rows.find(
      (item) => item.buildingNo === "999" && item.unitNo === "1",
    );
    expect(row?.reasons).toContain("INVALID_HISTORY_ROW");
    const source = normalized.find(
      (item) => item.buildingNo === "999" && item.unitNo === "1",
    );
    expect(source?.consultations).toHaveLength(1);
    expect(source?.consultations[0]?.content).toBe("날짜 없는 이력");
  });

  it("preserves resale history as holder-change candidates without customer_id writes", () => {
    const row = preview.rows.find(
      (item) => item.buildingNo === "101" && item.unitNo === "1001",
    );
    expect(row?.reasons).toContain("HOLDER_CHANGE_HISTORY");
    expect(row?.resale).toEqual([
      {
        date: "2024-01-15",
        seller: "이전계약자",
        buyer: "고객A",
        reason: "전매",
      },
    ]);
  });

  it("preserves deal payload for P1 without dropping it", () => {
    const row = normalized.find(
      (item) => item.buildingNo === "102" && item.unitNo === "1503",
    );
    expect(row?.deal).toEqual({
      consent: "동의",
      status: "진행중",
      jeonse: true,
      wolse: false,
      maemae: false,
      notes: "전세 후보",
      features: "남향",
      realtyList: [{ bizName: "익명공인중개사" }],
    });
  });

  it("does not fabricate balance_paid_at from 완납 text", () => {
    const row = normalized.find(
      (item) => item.buildingNo === "101" && item.unitNo === "1001",
    );
    expect(row?.balancePaidRaw).toBe("완납");
    expect(row?.balancePaidAt).toBeNull();
  });

  it("flags latest grade mismatch without auto-correcting", () => {
    const row = preview.rows.find(
      (item) => item.buildingNo === "102" && item.unitNo === "1503",
    );
    expect(row?.reasons).toContain("LATEST_GRADE_MISMATCH");
    expect(row?.legacyGrade).toBe("A");
    expect(row?.latestHistoryGrade).toBe("B");
  });

  it("flags missing phone as invalid without merging by name", () => {
    const row = preview.rows.find(
      (item) => item.buildingNo === "104" && item.unitNo === "201",
    );
    expect(row?.reasons).toContain("INVALID_PHONE");
    expect(row?.reasons).toContain("CUSTOMER_IDENTITY");
    expect(row?.status).toBe("ERROR");
  });

  it("keeps preview as analysis-only with zero DB writes", () => {
    expect(LEGACY_MIGRATION_DB_WRITES).toBe(0);
    expect(preview.dbWrites).toBe(0);
    expect(preview.rows.every((row) => row.writeKind === "none")).toBe(true);
  });

  it("builds the quality report from preview rows", () => {
    const report = buildLegacyQualityReport(preview, new Date("2026-09-11T00:00:00+09:00"));
    expect(report.unitCount).toBe(units.length);
    expect(report.uniqueCustomerCount).toBe(preview.customerCandidates.length);
    expect(report.consultationCount).toBeGreaterThanOrEqual(5);
    expect(report.missingPhoneCount).toBeGreaterThanOrEqual(1);
    expect(report.multiUnitHolderCount).toBeGreaterThanOrEqual(1);
    expect(report.resaleCount).toBe(1);
    expect(report.dealCount).toBe(1);
    expect(report.consultationFrequency["3+"]).toBeGreaterThanOrEqual(1);
  });
});

describe("legacy occupancy candidates", () => {
  it("emits preview-only occupancy candidates and never auto-confirms", () => {
    expect(
      extractOccupancyCandidates({
        contents: ["전세 문의", "입주예정"],
        deal: { jeonse: true, wolse: false, maemae: false },
        resale: [{ reason: "전매" }],
      }),
    ).toEqual(
      expect.arrayContaining(["SALE", "JEONSE", "SELF_MOVE_IN"]),
    );
  });

  it("does not treat overdue text as funding shortage", () => {
    expect(
      extractOccupancyCandidates({
        contents: ["연체 있음"],
        deal: null,
        resale: [],
      }),
    ).toEqual([]);
  });
});

describe("legacy history type mapping", () => {
  it("maps known portal types to channel/purpose without rewriting content", () => {
    expect(mapHistoryType("아웃바운드")).toEqual({
      contactType: "CALL",
      purpose: "OUTBOUND",
    });
    expect(mapHistoryType("방문")).toEqual({
      contactType: "VISIT",
      purpose: "VISIT",
    });
    expect(mapHistoryType("알 수 없는 유형")).toEqual({
      contactType: "CONSULTATION",
      purpose: "알 수 없는 유형",
    });
  });
});

describe("legacy portal client allowlist", () => {
  it("only allows documented read APIs", () => {
    expect(LEGACY_PORTAL_READ_ACTIONS).toEqual([
      "checkPassword",
      "getAllUnits",
      "getCounselors",
      "getConsultTypes",
      "getEvaluationOptions",
      "getRealtyList",
      "getPrugioListingsAll",
      "getSummaryData",
    ]);
    expect(LEGACY_PORTAL_WRITE_ACTIONS).toEqual(
      expect.arrayContaining([
        "addConsultation",
        "assignCounselor",
        "saveRealtyPublic",
        "saveDeal",
      ]),
    );
  });
});

describe("legacy migration source files stay write-free", () => {
  it("does not import supabase or issue SQL writes", () => {
    const dir = join(
      dirname(fileURLToPath(import.meta.url)),
      "../../src/lib/legacy-migration",
    );
    const files = [
      "index.ts",
      "normalize.ts",
      "preview.ts",
      "report.ts",
      "portal-client.ts",
    ];
    const joined = files
      .map((file) => readFileSync(join(dir, file), "utf8"))
      .join("\n");
    expect(joined).not.toMatch(/from ["']@\/lib\/supabase/);
    expect(joined).not.toMatch(/\.insert\(/);
    expect(joined).not.toMatch(/\.update\(/);
    expect(joined).not.toMatch(/createClient/);
  });
});
