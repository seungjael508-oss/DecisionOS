import { createServerClient } from "@/lib/supabase/server";
import type { MarketRow } from "@/lib/market/select-latest";

function toCount(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function loadMarketRows(projectId: string): Promise<
  { error: true; rows: MarketRow[] } | { error: false; rows: MarketRow[] }
> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("market_data")
    .select(
      "market_data_id, project_id, data_scope, complex_name, period, unit_type, sale_listing_count, jeonse_listing_count, monthly_rent_listing_count, transaction_count, price_avg, move_in_date, move_in_units, source, collected_at",
    )
    .eq("project_id", projectId)
    .order("period", { ascending: false });

  if (error) return { error: true, rows: [] };

  return {
    error: false,
    rows: (data ?? []).map((row) => ({
      marketDataId: row.market_data_id,
      projectId: row.project_id,
      dataScope: row.data_scope,
      complexName: row.complex_name,
      period: row.period,
      unitType: row.unit_type,
      saleListingCount: toCount(row.sale_listing_count),
      jeonseListingCount: toCount(row.jeonse_listing_count),
      monthlyRentListingCount: toCount(row.monthly_rent_listing_count),
      transactionCount: toCount(row.transaction_count),
      priceAvg: toCount(row.price_avg),
      moveInDate: row.move_in_date,
      moveInUnits: toCount(row.move_in_units),
      source: row.source,
      collectedAt: row.collected_at,
    })),
  };
}
