import 'server-only';
import { loadHwayangSpecialTagSourceIndex } from '@/lib/move-in/special-tag-source';
import { loadHwayangInvestorUnitKeys } from '@/lib/move-in/investment-source';
import { ONLINE_MARKET_LISTINGS, ONLINE_MARKET_PROJECT_ID } from '@/lib/move-in/market-online-projection';
import { specialUnitKey } from '@/lib/move-in/special-tags';
import type { SourceTag } from '@/lib/move-in/ledger-types';

// Immutable unit-source evidence, not customer attributes or consultation intent.
// Keep the four approved sources independent; never infer one tag from another.
const special = loadHwayangSpecialTagSourceIndex(ONLINE_MARKET_PROJECT_ID);
const investors = loadHwayangInvestorUnitKeys(ONLINE_MARKET_PROJECT_ID);
const online = new Set(ONLINE_MARKET_LISTINGS.map(r => r.unitKey));
export function approvedUnitSourceTags(projectId: string, buildingNo: string, unitNo: string): SourceTag[] {
  if (projectId !== ONLINE_MARKET_PROJECT_ID) return [];
  const key = specialUnitKey(buildingNo, unitNo), source = special.get(key);
  return [...(source?.asel ? ['ASEL' as const] : []), ...(investors.has(key) ? ['INVESTOR' as const] : []),
    ...(source?.delinquent ? ['DELINQUENT' as const] : []), ...(online.has(key) ? ['ONLINE' as const] : [])];
}
