import type { Database } from "@/lib/supabase/types";

export type MarketDataScope = Database["public"]["Enums"]["market_data_scope"];

export type MarketRow = {
  marketDataId: string;
  projectId: string;
  dataScope: MarketDataScope;
  complexName: string | null;
  period: string;
  unitType: string | null;
  saleListingCount: number | null;
  jeonseListingCount: number | null;
  monthlyRentListingCount: number | null;
  transactionCount: number | null;
  priceAvg: number | null;
  moveInDate: string | null;
  moveInUnits: number | null;
  source: string | null;
  collectedAt: string;
};

export function marketGroupKey(row: {
  projectId: string;
  period: string;
  dataScope: MarketDataScope;
  complexName: string | null;
  unitType: string | null;
}) {
  return [
    row.projectId,
    row.period,
    row.dataScope,
    row.complexName ?? "",
    row.unitType ?? "",
  ].join("|");
}

export function selectLatestMarketRow(rows: MarketRow[]): MarketRow | null {
  if (rows.length === 0) return null;
  return [...rows].sort((a, b) => {
    const collected = b.collectedAt.localeCompare(a.collectedAt);
    if (collected !== 0) return collected;
    return b.marketDataId.localeCompare(a.marketDataId);
  })[0];
}

export function selectLatestMarketRows(rows: MarketRow[]): MarketRow[] {
  const groups = new Map<string, MarketRow[]>();
  for (const row of rows) {
    const key = marketGroupKey(row);
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  const latest: MarketRow[] = [];
  for (const group of groups.values()) {
    const row = selectLatestMarketRow(group);
    if (row) latest.push(row);
  }
  return latest;
}
