import { describe, expect, it } from "vitest";
import type { CallListRow } from "@/lib/move-in/calls";
import { parseDongHoQuery } from "@/lib/move-in/calls";
import {
  CONSENT_STATUS_LABELS,
  DEAL_STATUS_LABELS,
  buildSaveMoveInUnitDealArgs,
  filterDealRows,
  type DealListFilters,
  type DealListRow,
} from "@/lib/move-in/deals";

function callRow(
  partial: Partial<CallListRow> & Pick<CallListRow, "unitId" | "customerId">,
): CallListRow {
  return {
    buildingNo: "101",
    unitNo: "202",
    customerName: "이OO",
    customerPhone: "010-1234-5678",
    phoneNormalized: "01012345678",
    assignedCounselorId: "member-a",
    latestGrade: "C",
    occupancyIntent: "SALE",
    fundingStatus: "UNKNOWN",
    moveInStatus: "CONTACTED",
    lastConsultedAt: null,
    nextContactAt: null,
    ...partial,
  };
}

function dealRow(
  partial: Partial<DealListRow> & Pick<DealListRow, "unitId" | "customerId">,
): DealListRow {
  return {
    ...callRow(partial),
    contractId: "ct-1",
    consentStatus: "CONSENTED",
    dealStatus: "IN_PROGRESS",
    saleEnabled: true,
    jeonseEnabled: false,
    monthlyRentEnabled: false,
    brokerageCount: 2,
    updatedAt: "2026-09-11T00:00:00.000Z",
    officeIds: [],
    ...partial,
  };
}

const empty: DealListFilters = {
  q: "",
  consentStatus: "",
  dealStatus: "",
  saleEnabled: "",
  jeonseEnabled: "",
  monthlyRentEnabled: "",
  brokerageOfficeId: "",
};

describe("deal list filters", () => {
  it("reuses dong/ho/name/phone search", () => {
    expect(parseDongHoQuery("101-202")).toEqual({
      buildingNo: "101",
      unitNo: "202",
    });
    const rows = [
      dealRow({ unitId: "u1", customerId: "c1" }),
      dealRow({
        unitId: "u2",
        customerId: "c2",
        buildingNo: "102",
        unitNo: "1503",
        customerName: "김OO",
        customerPhone: "010-9999-0000",
        phoneNormalized: "01099990000",
        occupancyIntent: "JEONSE",
        saleEnabled: false,
        jeonseEnabled: true,
      }),
    ];
    expect(filterDealRows(rows, { ...empty, q: "이OO" })).toHaveLength(1);
    expect(filterDealRows(rows, { ...empty, q: "101-202" })).toHaveLength(1);
    expect(filterDealRows(rows, { ...empty, q: "010-1234-5678" })).toHaveLength(1);
  });

  it("filters consent, status, types, and brokerage", () => {
    const rows = [
      dealRow({ unitId: "u1", customerId: "c1", officeIds: ["off-1"] }),
      dealRow({
        unitId: "u2",
        customerId: "c2",
        consentStatus: "NOT_CONSENTED",
        dealStatus: "COMPLETED",
        saleEnabled: false,
        jeonseEnabled: true,
        monthlyRentEnabled: true,
        officeIds: ["off-2"],
      }),
    ];
    expect(
      filterDealRows(rows, { ...empty, consentStatus: "CONSENTED" }).map((row) => row.unitId),
    ).toEqual(["u1"]);
    expect(
      filterDealRows(rows, { ...empty, dealStatus: "COMPLETED" }).map((row) => row.unitId),
    ).toEqual(["u2"]);
    expect(
      filterDealRows(rows, { ...empty, saleEnabled: "1" }).map((row) => row.unitId),
    ).toEqual(["u1"]);
    expect(
      filterDealRows(rows, { ...empty, jeonseEnabled: "1" }).map((row) => row.unitId),
    ).toEqual(["u2"]);
    expect(
      filterDealRows(rows, { ...empty, monthlyRentEnabled: "1" }).map((row) => row.unitId),
    ).toEqual(["u2"]);
    expect(
      filterDealRows(rows, { ...empty, brokerageOfficeId: "off-1" }).map((row) => row.unitId),
    ).toEqual(["u1"]);
  });

  it("keeps occupancy_intent as a read-only list field", () => {
    const row = dealRow({ unitId: "u1", customerId: "c1", occupancyIntent: "SALE" });
    expect(row.occupancyIntent).toBe("SALE");
    const args = buildSaveMoveInUnitDealArgs({
      projectId: "p1",
      unitId: "u1",
      contractId: "ct-1",
      customerId: "c1",
      consentStatus: "CONSENTED",
      dealStatus: "IN_PROGRESS",
      saleEnabled: true,
      jeonseEnabled: false,
      monthlyRentEnabled: false,
      saleNote: "매매",
      jeonseNote: "",
      monthlyRentNote: "",
      details: "세부",
      brokerages: [{ brokerageOfficeId: "off-1", brokerageContactId: "ct-rep" }],
    });
    expect(args).not.toHaveProperty("p_occupancy_intent");
    expect(CONSENT_STATUS_LABELS.CONSENTED).toBe("동의");
    expect(DEAL_STATUS_LABELS.IN_PROGRESS).toBe("진행중");
  });
});
