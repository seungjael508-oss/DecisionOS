import { describe, expect, it } from "vitest";
import { classifyImportRows } from "@/lib/import/classify";
import { planImportWrites } from "@/lib/import/apply";
import { occupancyHintsFromText } from "@/lib/import/occupancy-hints";
import { hasAllowedImportName } from "@/lib/import/limits";
import { mapImportHeaders } from "@/lib/import/map-columns";
import { parseImportFile } from "@/lib/import/parse";
import { requireProjectAdmin } from "@/lib/move-in/access";
import type { ImportCatalog, ImportSourceRow } from "@/lib/import/types";

const PROJECT_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1";
const PROJECT_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1";
const mapping = mapImportHeaders(["동", "호수", "공급형", "계약자", "전화번호"]);

function source(partial: Partial<ImportSourceRow> & Pick<ImportSourceRow, "rowNumber">): ImportSourceRow {
  return {
    buildingNo: "101",
    unitNo: "1001",
    unitType: "84A",
    holderName: "계약자A",
    phoneNormalized: "01011112222",
    contractDate: null,
    overdueText: null,
    nextStepText: null,
    hasConsultationNote: false,
    ...partial,
  };
}

const catalogA: ImportCatalog = {
  projectId: PROJECT_A,
  units: [
    {
      unitId: "u1",
      projectId: PROJECT_A,
      buildingNo: "101",
      unitNo: "1001",
      unitType: "84A",
    },
    {
      unitId: "u2",
      projectId: PROJECT_A,
      buildingNo: "102",
      unitNo: "1503",
      unitType: "84A",
    },
    {
      unitId: "u3",
      projectId: PROJECT_A,
      buildingNo: "103",
      unitNo: "804",
      unitType: "59B",
    },
  ],
  customers: [
    { id: "c-a", name: "계약자A", phoneNormalized: "01011112222" },
    { id: "c-b", name: "계약자B", phoneNormalized: "01033334444" },
  ],
  contracts: [
    {
      contractId: "ct-1",
      unitId: "u1",
      customerId: "c-a",
      status: "ACTIVE",
    },
    {
      contractId: "ct-2",
      unitId: "u2",
      customerId: "c-a",
      status: "ACTIVE",
    },
    {
      contractId: "ct-3",
      unitId: "u3",
      customerId: "c-a",
      status: "COMPLETED",
    },
  ],
  occupancies: [
    {
      unitId: "u1",
      contractId: "ct-1",
      occupancyIntent: "SELF_MOVE_IN",
      fundingStatus: "NORMAL",
      moveInStatus: "PLANNED",
    },
    {
      unitId: "u2",
      contractId: "ct-2",
      occupancyIntent: "SALE",
      fundingStatus: "NORMAL",
      moveInStatus: "CONTACTED",
    },
    {
      unitId: "u3",
      contractId: "ct-3",
      occupancyIntent: "MONTHLY_RENT",
      fundingStatus: "FUNDING_SHORTAGE",
      moveInStatus: "DELAYED",
    },
  ],
};

describe("import file validation", () => {
  it("rejects xlsm and allows xlsx/csv", () => {
    expect(hasAllowedImportName("아셀.xlsm")).toBe(false);
    expect(hasAllowedImportName("holders.xlsx")).toBe(true);
    expect(hasAllowedImportName("holders.csv")).toBe(true);
    expect(hasAllowedImportName("holders.xls")).toBe(false);
  });

  it("rejects a mismatched mime type", async () => {
    const parsed = await parseImportFile(
      "holders.csv",
      new TextEncoder().encode("동,호수,계약자\n101,1001,계약자A"),
      "application/pdf",
    );
    expect(parsed.ok).toBe(false);
  });

  it("parses anonymized csv without storing consultation text", async () => {
    const csv = [
      "동,호수,공급형,계약자,전화번호,연체구분,향후진행,상담내용",
      "101,1001,84A,계약자A,010-1111-2222,,입주의사,비공개메모",
    ].join("\n");
    const parsed = await parseImportFile(
      "holders.csv",
      new TextEncoder().encode(csv),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.rows[0]?.holderName).toBe("계약자A");
    expect(parsed.rows[0]?.hasConsultationNote).toBe(true);
    expect(JSON.stringify(parsed.rows)).not.toContain("비공개메모");
  });
});

describe("project unit matching", () => {
  it("matches the same project 동/호", () => {
    const preview = classifyImportRows(
      PROJECT_A,
      [source({ rowNumber: 2 })],
      catalogA,
      mapping,
    );
    expect(preview.rows[0]?.status).toBe("READY");
    expect(preview.rows[0]?.unitId).toBe("u1");
    expect(preview.rows[0]?.writeKind).toBe("none");
  });

  it("does not match the same 동/호 in another project catalog", () => {
    const preview = classifyImportRows(
      PROJECT_B,
      [source({ rowNumber: 2 })],
      catalogA,
      mapping,
    );
    expect(preview.rows[0]?.reasons).toContain("UNIT_NOT_FOUND");
    expect(preview.rows[0]?.status).toBe("ERROR");
  });

  it("marks missing units as UNIT_NOT_FOUND", () => {
    const preview = classifyImportRows(
      PROJECT_A,
      [source({ rowNumber: 2, buildingNo: "999", unitNo: "1" })],
      catalogA,
      mapping,
    );
    expect(preview.rows[0]?.reasons).toContain("UNIT_NOT_FOUND");
  });
});

describe("holder change", () => {
  it("keeps READY when ACTIVE holder matches", () => {
    const preview = classifyImportRows(
      PROJECT_A,
      [source({ rowNumber: 2 })],
      catalogA,
      mapping,
    );
    expect(preview.rows[0]?.status).toBe("READY");
    expect(preview.rows[0]?.writeKind).toBe("none");
    expect(planImportWrites(PROJECT_A, preview.rows, [])).toEqual([]);
  });

  it("requires review when ACTIVE holder differs", () => {
    const preview = classifyImportRows(
      PROJECT_A,
      [
        source({
          rowNumber: 2,
          holderName: "계약자B",
          phoneNormalized: "01033334444",
        }),
      ],
      catalogA,
      mapping,
    );
    expect(preview.rows[0]?.status).toBe("REVIEW_REQUIRED");
    expect(preview.rows[0]?.reasons).toContain("HOLDER_CHANGE");
    expect(preview.rows[0]?.writeKind).toBe("apply_import_row");
    expect(planImportWrites(PROJECT_A, preview.rows, [])).toEqual([]);
    expect(
      planImportWrites(PROJECT_A, preview.rows, [
        { rowNumber: 2, holderDecision: "not_change" },
      ]),
    ).toEqual([]);
    expect(
      planImportWrites(PROJECT_A, preview.rows, [
        { rowNumber: 2, holderDecision: "confirm" },
      ]),
    ).toEqual([
      {
        rowNumber: 2,
        rpc: "apply_move_in_import_row",
        args: {
          p_project_id: PROJECT_A,
          p_unit_id: "u1",
          p_apply_mode: "TRANSFER_HOLDER",
          p_existing_customer_id: "c-b",
          p_new_customer_name: undefined,
          p_new_customer_phone_normalized: undefined,
          p_expected_current_contract_id: "ct-1",
          p_occupancy_intent: undefined,
          p_funding_status: undefined,
          p_move_in_status: undefined,
          p_reason: "IMPORT",
        },
      },
    ]);
  });
});

describe("multi-unit holder", () => {
  it("groups the same customer id across three units without merging namesakes", () => {
    const preview = classifyImportRows(
      PROJECT_A,
      [
        source({
          rowNumber: 2,
          buildingNo: "101",
          unitNo: "1001",
          nextStepText: "입주의사",
        }),
        source({
          rowNumber: 3,
          buildingNo: "102",
          unitNo: "1503",
          nextStepText: "전매",
        }),
        source({
          rowNumber: 4,
          buildingNo: "103",
          unitNo: "804",
          overdueText: "자금여력 없음",
          nextStepText: "월세",
        }),
      ],
      catalogA,
      mapping,
    );
    expect(preview.rows.every((row) => row.excelCustomerId === "c-a" || row.currentCustomerId === "c-a")).toBe(
      true,
    );
    expect(preview.rows[0]?.occupancyHint.occupancyIntent).toBe("SELF_MOVE_IN");
    expect(preview.rows[1]?.occupancyHint.occupancyIntent).toBe("SALE");
    expect(preview.rows[2]?.occupancyHint.occupancyIntent).toBe("MONTHLY_RENT");
    expect(preview.rows[2]?.occupancyHint.fundingStatus).toBe("FUNDING_SHORTAGE");
    expect(preview.rows[0]?.relatedUnits).toHaveLength(3);
    expect(preview.rows.every((row) => !row.reasons.includes("MULTI_UNIT_HOLDER_CONFIRM"))).toBe(
      true,
    );
    const namesake = classifyImportRows(
      PROJECT_A,
      [
        source({
          rowNumber: 2,
          holderName: "동명이인",
          phoneNormalized: "01011112222",
        }),
        source({
          rowNumber: 3,
          buildingNo: "102",
          unitNo: "1503",
          holderName: "동명이인",
          phoneNormalized: "01033334444",
        }),
      ],
      catalogA,
      mapping,
    );
    expect(namesake.rows.some((row) => row.reasons.includes("CUSTOMER_IDENTITY"))).toBe(
      true,
    );
    const ids = new Set(
      namesake.rows.map((row) => row.excelCustomerId ?? row.currentCustomerId),
    );
    expect(ids.size).toBeGreaterThan(1);
  });

  it("does not auto-merge the same name without phone across units", () => {
    const preview = classifyImportRows(
      PROJECT_A,
      [
        source({
          rowNumber: 2,
          holderName: "이름만같음",
          phoneNormalized: null,
        }),
        source({
          rowNumber: 3,
          buildingNo: "102",
          unitNo: "1503",
          holderName: "이름만같음",
          phoneNormalized: null,
        }),
      ],
      catalogA,
      mapping,
    );
    expect(
      preview.rows.every((row) => row.reasons.includes("MULTI_UNIT_HOLDER_CONFIRM")),
    ).toBe(true);
    expect(preview.rows.every((row) => row.status === "REVIEW_REQUIRED")).toBe(true);
    expect(preview.rows.every((row) => row.writeKind === "none")).toBe(true);
  });
});

describe("holder identity", () => {
  it("does not treat a different name without phone as holder change", () => {
    const preview = classifyImportRows(
      PROJECT_A,
      [source({ rowNumber: 2, holderName: "계약자B", phoneNormalized: null })],
      catalogA,
      mapping,
    );
    expect(preview.rows[0]?.reasons).toContain("CUSTOMER_IDENTITY");
    expect(preview.rows[0]?.reasons).not.toContain("HOLDER_CHANGE");
    expect(planImportWrites(PROJECT_A, preview.rows, [])).toEqual([]);
  });

  it("requires a new customer review when the phone is unknown", () => {
    const preview = classifyImportRows(
      PROJECT_A,
      [
        source({
          rowNumber: 2,
          holderName: "신규인",
          phoneNormalized: "01099998888",
        }),
      ],
      catalogA,
      mapping,
    );
    expect(preview.rows[0]?.reasons).toContain("NEW_CUSTOMER_REQUIRED");
    expect(preview.rows[0]?.reasons).toContain("HOLDER_CHANGE");
    expect(preview.rows[0]?.writeKind).toBe("apply_import_row");
    expect(planImportWrites(PROJECT_A, preview.rows, [])).toEqual([]);
    expect(
      planImportWrites(PROJECT_A, preview.rows, [
        { rowNumber: 2, holderDecision: "confirm", allowNewCustomer: true },
      ]),
    ).toHaveLength(1);
  });
});

describe("active contract conflict", () => {
  it("reviews duplicate ACTIVE contracts on the same unit", () => {
    const preview = classifyImportRows(
      PROJECT_A,
      [source({ rowNumber: 2 })],
      {
        ...catalogA,
        contracts: [
          ...catalogA.contracts,
          {
            contractId: "ct-dup",
            unitId: "u1",
            customerId: "c-b",
            status: "ACTIVE",
          },
        ],
      },
      mapping,
    );
    expect(preview.rows[0]?.status).toBe("REVIEW_REQUIRED");
    expect(preview.rows[0]?.reasons).toContain("ACTIVE_CONTRACT_CONFLICT");
    expect(planImportWrites(PROJECT_A, preview.rows, [])).toEqual([]);
  });
});

describe("atomicity", () => {
  it("plans one import RPC for transfer plus occupancy", () => {
    const preview = classifyImportRows(
      PROJECT_A,
      [
        source({
          rowNumber: 2,
          holderName: "계약자B",
          phoneNormalized: "01033334444",
          nextStepText: "입주의사",
        }),
      ],
      catalogA,
      mapping,
    );
    expect(preview.rows[0]?.reasons).not.toContain("ATOMIC_WRITE_REQUIRED");
    expect(preview.rows[0]?.reasons).toContain("HOLDER_CHANGE");
    expect(preview.rows[0]?.writeKind).toBe("apply_import_row");
    const writes = planImportWrites(PROJECT_A, preview.rows, [
      { rowNumber: 2, holderDecision: "confirm" },
    ]);
    expect(writes).toHaveLength(1);
    expect(writes[0]?.rpc).toBe("apply_move_in_import_row");
    expect(writes[0]?.args.p_apply_mode).toBe("TRANSFER_HOLDER_AND_UPDATE_OCCUPANCY");
    expect(writes[0]?.args.p_occupancy_intent).toBe("SELF_MOVE_IN");
  });

  it("plans one import RPC for create contract plus occupancy", () => {
    const vacant: ImportCatalog = {
      ...catalogA,
      contracts: catalogA.contracts.filter((item) => item.unitId !== "u1"),
      occupancies: catalogA.occupancies.filter((item) => item.unitId !== "u1"),
    };
    const preview = classifyImportRows(
      PROJECT_A,
      [source({ rowNumber: 2, nextStepText: "입주의사" })],
      vacant,
      mapping,
    );
    expect(preview.rows[0]?.reasons).not.toContain("ATOMIC_WRITE_REQUIRED");
    expect(preview.rows[0]?.writeKind).toBe("apply_import_row");
    const writes = planImportWrites(PROJECT_A, preview.rows, []);
    expect(writes).toHaveLength(1);
    expect(writes[0]?.rpc).toBe("apply_move_in_import_row");
    expect(writes[0]?.args.p_apply_mode).toBe("CREATE_CONTRACT_AND_UPDATE_OCCUPANCY");
    expect(writes[0]?.args.p_occupancy_intent).toBe("SELF_MOVE_IN");
  });
});

describe("new contract", () => {
  it("plans apply_move_in_import_row when the customer exists and the unit is vacant", () => {
    const vacant: ImportCatalog = {
      ...catalogA,
      contracts: catalogA.contracts.filter((item) => item.unitId !== "u1"),
      occupancies: catalogA.occupancies.filter((item) => item.unitId !== "u1"),
    };
    const preview = classifyImportRows(
      PROJECT_A,
      [source({ rowNumber: 2 })],
      vacant,
      mapping,
    );
    expect(preview.rows[0]?.status).toBe("READY");
    expect(preview.rows[0]?.writeKind).toBe("apply_import_row");
    expect(planImportWrites(PROJECT_A, preview.rows, [])).toEqual([
      {
        rowNumber: 2,
        rpc: "apply_move_in_import_row",
        args: {
          p_project_id: PROJECT_A,
          p_unit_id: "u1",
          p_apply_mode: "CREATE_CONTRACT",
          p_existing_customer_id: "c-a",
          p_new_customer_name: undefined,
          p_new_customer_phone_normalized: undefined,
          p_expected_current_contract_id: undefined,
          p_occupancy_intent: undefined,
          p_funding_status: undefined,
          p_move_in_status: undefined,
          p_reason: "IMPORT",
        },
      },
    ]);
  });
});

describe("duplicate import", () => {
  it("does not plan a second contract when the holder already matches", () => {
    const first = classifyImportRows(
      PROJECT_A,
      [source({ rowNumber: 2 })],
      catalogA,
      mapping,
    );
    const second = classifyImportRows(
      PROJECT_A,
      [source({ rowNumber: 2 })],
      catalogA,
      mapping,
    );
    expect(first.rows[0]?.writeKind).toBe("none");
    expect(second.rows[0]?.writeKind).toBe("none");
    expect(planImportWrites(PROJECT_A, second.rows, [])).toEqual([]);
  });
});

describe("occupancy candidates", () => {
  it("maps clear phrases without auto-saving", () => {
    expect(occupancyHintsFromText(["입주의사"]).occupancyIntent).toBe("SELF_MOVE_IN");
    expect(occupancyHintsFromText(["월세예정"]).occupancyIntent).toBe("MONTHLY_RENT");
    expect(occupancyHintsFromText(["전매"]).occupancyIntent).toBe("SALE");
    expect(occupancyHintsFromText(["자금여력 없음"]).fundingStatus).toBe(
      "FUNDING_SHORTAGE",
    );
    expect(occupancyHintsFromText(["불명확한 문장"]).needsReview).toBe(true);
  });
});

describe("import permissions", () => {
  it("allows PROJECT_ADMIN and blocks COUNSELOR", () => {
    expect(
      requireProjectAdmin({
        ok: true,
        projectId: PROJECT_A,
        projectName: "현장",
        role: "PROJECT_ADMIN",
        memberId: "m-admin",
        userId: "u-admin",
      }),
    ).toBe(true);
    expect(
      requireProjectAdmin({
        ok: true,
        projectId: PROJECT_A,
        projectName: "현장",
        role: "COUNSELOR",
        memberId: "m-c",
        userId: "u-c",
      }),
    ).toBe(false);
  });

  it("plans only apply_move_in_import_row", () => {
    const vacant: ImportCatalog = {
      ...catalogA,
      contracts: catalogA.contracts.filter((item) => item.unitId !== "u1"),
      occupancies: catalogA.occupancies.filter((item) => item.unitId !== "u1"),
    };
    const preview = classifyImportRows(
      PROJECT_A,
      [source({ rowNumber: 2 })],
      vacant,
      mapping,
    );
    const writes = planImportWrites(PROJECT_A, preview.rows, []);
    expect(writes.every((write) => write.rpc === "apply_move_in_import_row")).toBe(true);
  });
});
