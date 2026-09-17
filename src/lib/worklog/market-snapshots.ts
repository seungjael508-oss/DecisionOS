import type { MarketRow } from '@/lib/market/select-latest';

/** Import adapter input. Observation time comes from source provenance, never upload time. */
export type WorklogMarketSnapshot = {
  snapshotId: string;
  projectId: string;
  scope: MarketRow['dataScope'];
  observedAt: string;
  period: string;
  complete: boolean;
  listings: Array<{ listingId: string; complexName: string; tradeType: string | null }>;
};

/** Aggregate complete observations for the existing Worklog v2 market calculation.
 * Historical snapshots remain independent; net changes are not new-listing counts.
 */
export function worklogMarketRows(snapshots: WorklogMarketSnapshot[]): (MarketRow & { otherListingCount: number })[] {
  const eligible = snapshots.filter(s => s.complete);
  const keys = new Set<string>();
  for (const s of eligible) {
    const key = JSON.stringify([s.projectId, s.scope, s.snapshotId]);
    if (keys.has(key) || !Number.isFinite(Date.parse(s.observedAt))) throw new Error('INVALID_MARKET_SNAPSHOT');
    keys.add(key);
  }
  return eligible.flatMap(snapshot => {
    const complexNames = new Set(eligible.filter(s => s.projectId === snapshot.projectId && s.scope === snapshot.scope).flatMap(s => s.listings.map(l => l.complexName)));
    const listingIds = new Set<string>();
    for (const row of snapshot.listings) {
      if (listingIds.has(row.listingId)) throw new Error('DUPLICATE_MARKET_LISTING');
      listingIds.add(row.listingId);
    }
    return [...complexNames].sort().map(complexName => {
      const rows = snapshot.listings.filter(r => r.complexName === complexName);
      return {
        marketDataId: JSON.stringify([snapshot.snapshotId, complexName]), projectId: snapshot.projectId,
        dataScope: snapshot.scope, complexName, collectedAt: snapshot.observedAt, period: snapshot.period,
        unitType: null, saleListingCount: rows.filter(r => r.tradeType === 'SALE').length,
        jeonseListingCount: rows.filter(r => r.tradeType === 'JEONSE').length,
        monthlyRentListingCount: rows.filter(r => r.tradeType === 'MONTHLY_RENT').length,
        otherListingCount: rows.filter(r => !['SALE', 'JEONSE', 'MONTHLY_RENT'].includes(r.tradeType ?? '')).length,
        transactionCount: null, priceAvg: null, moveInDate: null, moveInUnits: null, source: null,
      };
    });
  });
}
