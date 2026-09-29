import { describe, expect, it } from "vitest";
import {
  filterTodayQueueRows,
  joinMoveInTodayQueueRows,
  type MoveInTodayQueueSourceRow,
} from "@/lib/move-in/queries";

function source(overrides: Partial<MoveInTodayQueueSourceRow> = {}): MoveInTodayQueueSourceRow {
  return {
    unitId: "u1",
    contractId: "contract-current",
    legacyGrade: "C",
    occupancyIntent: null,
    fundingStatus: null,
    moveInStatus: null,
    lastContactAt: null,
    nextContactAt: "2026-09-29T00:00:00.000Z",
    reasonCodes: ["FOLLOW_UP_DUE"],
    problemCategories: ["UNKNOWN"],
    priority: "MEDIUM",
    sourceFingerprint: "source-1",
    ...overrides,
  };
}

const current = [{
  unitId: "u1",
  currentContractId: "contract-current",
  customerName: "Synthetic holder",
  operationalIntent: "SALE_TRANSFER" as const,
  operationalIntentAsOf: "2026-09-29T00:00:00.000Z",
}];

describe("Today Queue operational-intent projection", () => {
  it("attaches the Korean-displayable intent only for matching unit and active contract", () => {
    const rows = joinMoveInTodayQueueRows([source()], current);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      unitId: "u1",
      contractId: "contract-current",
      operationalIntent: "SALE_TRANSFER",
    });
  });

  it("does not attach a current-holder intent to a stale Queue contract", () => {
    const rows = joinMoveInTodayQueueRows([source({ contractId: "former-contract" })], current);
    expect(rows).toHaveLength(1);
    expect(rows[0].operationalIntent).toBeNull();
    expect(rows[0].operationalIntentAsOf).toBeNull();
  });

  it("retains the authoritative queue reasons: intent alone adds no Queue reason", () => {
    const rows = joinMoveInTodayQueueRows([source({ reasonCodes: ["SALE_TRACKING"] })], current);
    expect(rows[0].reasonCodes).toEqual(["SALE_TRACKING"]);
    expect(rows[0].reasonCodes).not.toContain("SALE_TRANSFER");
  });

  it("does not create or remove Queue membership for TERMINATION or ABANDONMENT", () => {
    for (const operationalIntent of ["TERMINATION", "ABANDONMENT"] as const) {
      const rows = joinMoveInTodayQueueRows([source()], [{ ...current[0], operationalIntent }]);
      expect(rows).toHaveLength(1);
      expect(rows[0].reasonCodes).toEqual(["FOLLOW_UP_DUE"]);
    }
  });

  it("applies the existing Today filter inside already-authoritative Queue rows", () => {
    const rows = [
      ...joinMoveInTodayQueueRows([source({ unitId: "due" })], [{ ...current[0], unitId: "due" }]),
      ...joinMoveInTodayQueueRows([source({ unitId: "funding", reasonCodes: ["C_GRADE_FUNDING"] })], [{ ...current[0], unitId: "funding" }]),
    ];
    expect(filterTodayQueueRows(rows, "next_contact").map((row) => row.unitId)).toEqual(["due"]);
    expect(filterTodayQueueRows(rows, "funding").map((row) => row.unitId)).toEqual(["funding"]);
  });
});
