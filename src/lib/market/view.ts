import {
  monthDelta,
  previousPeriod,
  uniquePeriods,
} from "@/lib/market/metrics";
import {
  selectLatestMarketRow,
  selectLatestMarketRows,
  type MarketRow,
} from "@/lib/market/select-latest";

export function regionTotalRow(rows: MarketRow[], period: string) {
  return selectLatestMarketRow(
    rows.filter(
      (row) =>
        row.dataScope === "REGION_TOTAL" &&
        row.period === period &&
        row.unitType === null,
    ),
  );
}

export function competitorRows(rows: MarketRow[], period: string) {
  const latest = selectLatestMarketRows(
    rows.filter((row) => row.dataScope === "COMPETITOR" && row.period === period),
  );
  const byComplex = new Map<string, MarketRow[]>();
  for (const row of latest) {
    const name = row.complexName ?? "";
    const list = byComplex.get(name) ?? [];
    list.push(row);
    byComplex.set(name, list);
  }
  const summaries: MarketRow[] = [];
  for (const group of byComplex.values()) {
    const total = group.find((item) => item.unitType === null);
    if (total) {
      summaries.push(total);
      continue;
    }
    const fallback = selectLatestMarketRow(group);
    if (!fallback) continue;
    summaries.push({
      ...fallback,
      saleListingCount: null,
      jeonseListingCount: null,
      monthlyRentListingCount: null,
      transactionCount: null,
      priceAvg: null,
    });
  }
  return summaries.sort((a, b) =>
    (a.complexName ?? "").localeCompare(b.complexName ?? "", "ko"),
  );
}

export function competitorHistory(rows: MarketRow[], complexName: string) {
  const latest = selectLatestMarketRows(
    rows.filter(
      (row) =>
        row.dataScope === "COMPETITOR" && row.complexName === complexName,
    ),
  );
  const byPeriod = new Map<string, MarketRow[]>();
  for (const row of latest) {
    const list = byPeriod.get(row.period) ?? [];
    list.push(row);
    byPeriod.set(row.period, list);
  }
  const history: MarketRow[] = [];
  for (const group of byPeriod.values()) {
    const total = group.find((item) => item.unitType === null);
    if (total) {
      history.push(total);
      continue;
    }
    const fallback = selectLatestMarketRow(group);
    if (!fallback) continue;
    history.push({
      ...fallback,
      saleListingCount: null,
      jeonseListingCount: null,
      monthlyRentListingCount: null,
      transactionCount: null,
      priceAvg: null,
    });
  }
  return history.sort((a, b) => a.period.localeCompare(b.period));
}

export function unitTypeRows(rows: MarketRow[], period: string) {
  return selectLatestMarketRows(
    rows.filter(
      (row) =>
        row.dataScope === "REGION_TOTAL" &&
        row.period === period &&
        row.unitType !== null,
    ),
  ).sort((a, b) => (a.unitType ?? "").localeCompare(b.unitType ?? "", "ko"));
}

export function internalRows(rows: MarketRow[], period: string) {
  return selectLatestMarketRows(
    rows.filter((row) => row.dataScope === "INTERNAL" && row.period === period),
  );
}

export function buildMarketView(rows: MarketRow[], selectedPeriod: string | null) {
  const periods = uniquePeriods(rows.map((row) => row.period));
  const period = selectedPeriod && periods.includes(selectedPeriod)
    ? selectedPeriod
    : (periods[0] ?? null);
  const previous = period ? previousPeriod(periods, period) : null;
  const currentRegion = period ? regionTotalRow(rows, period) : null;
  const previousRegion = previous ? regionTotalRow(rows, previous) : null;

  return {
    periods,
    period,
    previous,
    currentRegion,
    previousRegion,
    deltas: {
      sale: monthDelta(
        currentRegion?.saleListingCount ?? null,
        previousRegion?.saleListingCount ?? null,
      ),
      jeonse: monthDelta(
        currentRegion?.jeonseListingCount ?? null,
        previousRegion?.jeonseListingCount ?? null,
      ),
      monthly: monthDelta(
        currentRegion?.monthlyRentListingCount ?? null,
        previousRegion?.monthlyRentListingCount ?? null,
      ),
      transaction: monthDelta(
        currentRegion?.transactionCount ?? null,
        previousRegion?.transactionCount ?? null,
      ),
    },
    competitors: period ? competitorRows(rows, period) : [],
    unitTypes: period ? unitTypeRows(rows, period) : [],
    internal: period ? internalRows(rows, period) : [],
  };
}
