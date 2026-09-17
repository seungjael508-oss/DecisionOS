import { expect, it } from 'vitest';
import { worklogMarketRows, type WorklogMarketSnapshot } from '@/lib/worklog/market-snapshots';
import { buildMoveInWorklogSnapshot } from '@/lib/worklog/snapshot';
import { worklogDayRange } from '@/lib/worklog/day-range';
const observation=(snapshotId:string,date:string,n:number):WorklogMarketSnapshot=>({snapshotId,projectId:'p',scope:'COMPETITOR',observedAt:`${date}T00:00:00+09:00`,period:date,complete:true,listings:Array.from({length:n},(_,i)=>({listingId:`listing-${i}`,complexName:'Synthetic complex',tradeType:i%2?'SALE':'JEONSE'}))});
it('aggregates latest and previous observations through the existing builder, keeping only net change',()=>{
 const source=[observation('previous','2026-09-12',980),observation('latest','2026-09-13',988)];
 const s=buildMoveInWorklogSnapshot([],[],[],worklogDayRange('2026-09-13','Asia/Seoul'),{marketSnapshots:source});
 expect(s.marketSummary?.rows[0]).toMatchObject({current:{total:988},delta:{total:8},previousCollectedAt:'2026-09-11T15:00:00.000Z'});
 expect(source[0].listings).toHaveLength(980);
 const past=buildMoveInWorklogSnapshot([],[],[],worklogDayRange('2026-09-10','Asia/Seoul'),{marketSnapshots:source});
 expect(past.marketSummary?.status).toBe('EMPTY');
});
it('keeps missing and incomplete observations distinct from a confirmed zero',()=>{
 const previous=observation('prior','2026-09-12',2), empty=observation('empty','2026-09-13',0);
 expect(worklogMarketRows([previous,empty]).at(-1)?.saleListingCount).toBe(0);
 expect(worklogMarketRows([{...empty,complete:false}])).toEqual([]);
});
it('fails closed on duplicate source listing IDs rather than inflating counts',()=>{
 const s=observation('s','2026-09-13',1);s.listings.push(s.listings[0]);
 expect(()=>worklogMarketRows([s])).toThrow('DUPLICATE_MARKET_LISTING');
});
