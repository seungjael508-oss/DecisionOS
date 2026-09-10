import { describe, expect, it } from "vitest";
import { monthDelta, previousPeriod, uniquePeriods } from "@/lib/market/metrics";
import {
  selectLatestMarketRow,
  selectLatestMarketRows,
  type MarketRow,
} from "@/lib/market/select-latest";
import { buildMarketView, competitorRows, regionTotalRow } from "@/lib/market/view";
import { MARKET_SCOPE_LABELS } from "@/lib/market/labels";

function row(partial: Partial<MarketRow> & Pick<MarketRow, "marketDataId">): MarketRow {
  return {
    projectId: "project-a",
    dataScope: "REGION_TOTAL",
    complexName: null,
    period: "2026-09-01",
    unitType: null,
    saleListingCount: 500,
    jeonseListingCount: 210,
    monthlyRentListingCount: 48,
    transactionCount: 12,
    priceAvg: null,
    moveInDate: null,
    moveInUnits: null,
    source: "네이버부동산",
    collectedAt: "2026-09-10T05:30:00.000Z",
    ...partial,
  };
}

describe("selectLatestMarketRow", () => {
  it("picks the newest collected_at for the same key", () => {
    const latest = selectLatestMarketRow([
      row({
        marketDataId: "old",
        collectedAt: "2026-09-01T00:00:00.000Z",
        saleListingCount: 100,
      }),
      row({
        marketDataId: "new",
        collectedAt: "2026-09-10T00:00:00.000Z",
        saleListingCount: 500,
      }),
    ]);
    expect(latest?.marketDataId).toBe("new");
    expect(latest?.saleListingCount).toBe(500);
  });

  it("does not mix different complexes", () => {
    const latest = selectLatestMarketRows([
      row({
        marketDataId: "dongmun",
        dataScope: "COMPETITOR",
        complexName: "동문",
        saleListingCount: 500,
      }),
      row({
        marketDataId: "other",
        dataScope: "COMPETITOR",
        complexName: "다른단지",
        saleListingCount: 10,
        collectedAt: "2026-09-20T00:00:00.000Z",
      }),
    ]);
    const dongmun = latest.find((item) => item.complexName === "동문");
    expect(dongmun?.saleListingCount).toBe(500);
  });

  it("does not mix different periods", () => {
    const current = regionTotalRow(
      [
        row({ marketDataId: "sep", period: "2026-09-01", saleListingCount: 500 }),
        row({
          marketDataId: "oct",
          period: "2026-10-01",
          saleListingCount: 542,
          collectedAt: "2026-10-10T00:00:00.000Z",
        }),
      ],
      "2026-09-01",
    );
    expect(current?.saleListingCount).toBe(500);
  });
});

describe("monthDelta", () => {
  it("computes positive and negative changes", () => {
    expect(monthDelta(542, 500)).toBe(42);
    expect(monthDelta(470, 500)).toBe(-30);
  });

  it("does not treat a missing previous value as zero", () => {
    expect(monthDelta(500, null)).toBeNull();
    expect(monthDelta(null, 500)).toBeNull();
  });
});

describe("market scopes", () => {
  it("keeps REGION_TOTAL, COMPETITOR, and INTERNAL separate", () => {
    expect(MARKET_SCOPE_LABELS.REGION_TOTAL).toBe("지역 전체");
    expect(MARKET_SCOPE_LABELS.COMPETITOR).toBe("경쟁단지");
    expect(MARKET_SCOPE_LABELS.INTERNAL).toBe("우리 현장");

    const rows = [
      row({ marketDataId: "r", dataScope: "REGION_TOTAL" }),
      row({
        marketDataId: "c",
        dataScope: "COMPETITOR",
        complexName: "동문",
      }),
      row({ marketDataId: "i", dataScope: "INTERNAL" }),
    ];
    const view = buildMarketView(rows, "2026-09-01");
    expect(view.currentRegion?.marketDataId).toBe("r");
    expect(competitorRows(rows, "2026-09-01").map((item) => item.complexName)).toEqual([
      "동문",
    ]);
    expect(view.internal.map((item) => item.marketDataId)).toEqual(["i"]);
  });
});

describe("market periods", () => {
  it("defaults to the latest period", () => {
    const view = buildMarketView(
      [
        row({ marketDataId: "sep", period: "2026-09-01" }),
        row({ marketDataId: "nov", period: "2026-11-01" }),
        row({ marketDataId: "oct", period: "2026-10-01" }),
      ],
      null,
    );
    expect(view.period).toBe("2026-11-01");
    expect(uniquePeriods(["2026-09-01", "2026-11-01", "2026-10-01"])).toEqual([
      "2026-11-01",
      "2026-10-01",
      "2026-09-01",
    ]);
    expect(previousPeriod(["2026-11-01", "2026-10-01"], "2026-11-01")).toBe(
      "2026-10-01",
    );
  });
});

describe("market empty sections", () => {
  it("treats zero rows as empty market, competitor, and unit-type data", () => {
    const view = buildMarketView([], null);
    expect(view.period).toBeNull();
    expect(view.competitors).toEqual([]);
    expect(view.unitTypes).toEqual([]);
    expect(view.internal).toEqual([]);
    expect(view.currentRegion).toBeNull();
  });
});
