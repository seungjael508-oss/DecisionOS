// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { buildMoveInWorklogSnapshot, worklogGeneratedData } from '@/lib/worklog/snapshot';
import { worklogDayRange } from '@/lib/worklog/day-range';
import { WorklogSnapshotView } from '@/components/move-in/worklog-snapshot-view';
const range=worklogDayRange('2026-09-10','Asia/Seoul');
afterEach(cleanup);
it('preserves 71 events and exposes 1 confirmed visit plus 70 unknown channels',()=>{
 const events=Array.from({length:71},(_,i)=>({id:`synthetic-${i}`,consultedAt:range.startIso,contactType:i===0?'VISIT':'CONSULTATION',purpose:'성향파악'}));
 const snapshot=buildMoveInWorklogSnapshot([],[],events,range);
 expect(snapshot.consultationActivity?.today).toMatchObject({call:0,visit:1,message:0,unknown:70,total:71});
 const activity=snapshot.consultationActivity!.today;
 expect(activity.call+activity.visit+(activity.message??0)+(activity.unknown??0)).toBe(activity.total);
 expect(snapshot.managementTargets?.status).toBe('BLOCKED');
 expect(snapshot.marketSummary?.status).toBe('EMPTY');
 render(<WorklogSnapshotView snapshot={snapshot}/>);
 expect(screen.getAllByText('채널 미확인').length).toBeGreaterThan(0);
 expect(screen.getByText(/DATA_UNAVAILABLE/)).toBeTruthy();
});
it('preserves unsupported market types as OTHER and includes them in totals and delta',()=>{
 const observation=(id:string,day:string,tradeTypes:string[])=>({snapshotId:id,projectId:'synthetic',scope:'COMPETITOR' as const,observedAt:`${day}T00:00:00+09:00`,period:day,complete:true,listings:tradeTypes.map((tradeType,i)=>({listingId:String(i),complexName:'Synthetic complex',tradeType}))});
 const snapshots=[observation('previous','2026-09-09',['SALE','단기임대']),observation('current','2026-09-10',['SALE','단기임대','FUTURE_TYPE'])];
 const snapshot=buildMoveInWorklogSnapshot([],[],[],range,{marketSnapshots:snapshots});
 expect(snapshot.marketSummary?.rows[0]).toMatchObject({current:{sale:1,monthlyRent:0,other:2,total:3},delta:{other:1,total:1}});
 expect(snapshots[1].listings.map(r=>r.tradeType)).toEqual(['SALE','단기임대','FUTURE_TYPE']);
 const saved=worklogGeneratedData(snapshot);snapshots[1].listings.pop();
 expect(saved.marketSummary?.rows[0].current.total).toBe(3);
});
it('uses all explicit new channels independently of purpose',()=>{
 const snapshot=buildMoveInWorklogSnapshot([],[],['CALL','VISIT','MESSAGE','UNKNOWN'].map((contactType,i)=>({id:String(i),contactType,consultedAt:range.startIso,purpose:'OUTBOUND'})),range);
 expect(snapshot.consultationActivity?.today).toMatchObject({call:1,visit:1,message:1,unknown:1,total:4});
});
