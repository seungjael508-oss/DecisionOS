import 'server-only';
import { loadHwayangSpecialTagSourceIndex } from '@/lib/move-in/special-tag-source';
import { loadHwayangInvestorUnitKeys } from '@/lib/move-in/investment-source';
import { ONLINE_MARKET_LISTINGS, ONLINE_MARKET_PROJECT_ID } from '@/lib/move-in/market-online-projection';
import { specialUnitKey } from '@/lib/move-in/special-tags';
import type { LedgerSummaryRow, SourceTag } from '@/lib/move-in/ledger-types';

// Immutable unit-source evidence, not customer attributes or consultation intent.
// Keep the four approved sources independent; never infer one tag from another.
const special = loadHwayangSpecialTagSourceIndex(ONLINE_MARKET_PROJECT_ID);
const investors = loadHwayangInvestorUnitKeys(ONLINE_MARKET_PROJECT_ID);
const online = new Set(ONLINE_MARKET_LISTINGS.map(r => r.unitKey));
const onlineCount = ONLINE_MARKET_LISTINGS.reduce((m, r) => m.set(r.unitKey, (m.get(r.unitKey) ?? 0) + 1), new Map<string, number>());

/** 온라인 매물 등록 상태(원천 매물 목록 기준). 같은 세대 매물이 2건 이상이면 중복 */
export function onlineListingStatus(projectId: string, buildingNo: string, unitNo: string): 'REGISTERED' | 'DUPLICATE' | 'UNREGISTERED' | null {
  if (projectId !== ONLINE_MARKET_PROJECT_ID) return null;
  const count = onlineCount.get(specialUnitKey(buildingNo, unitNo)) ?? 0;
  return count > 1 ? 'DUPLICATE' : count === 1 ? 'REGISTERED' : 'UNREGISTERED';
}
export function attachOnlineListing(row: LedgerSummaryRow): LedgerSummaryRow {
  return { ...row, onlineListing: onlineListingStatus(row.projectId, row.buildingNo, row.unitNo) };
}
export function approvedUnitSourceTags(projectId: string, buildingNo: string, unitNo: string): SourceTag[] {
  if (projectId !== ONLINE_MARKET_PROJECT_ID) return [];
  const key = specialUnitKey(buildingNo, unitNo), source = special.get(key);
  return [...(source?.asel ? ['ASEL' as const] : []), ...(investors.has(key) ? ['INVESTOR' as const] : []),
    ...(source?.delinquent ? ['DELINQUENT' as const] : []), ...(online.has(key) ? ['ONLINE' as const] : [])];
}
