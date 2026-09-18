import { expect, it } from 'vitest';
import { buildDashboardActivity, legacyDashboardSnapshot } from '@/lib/move-in/kpis';

const now = '2026-09-17T05:00:00Z';
const event = (overrides = {}) => ({ id:'e1',unit_id:'u1',customer_id:'c1',consulted_at:'2026-09-17T01:00:00Z',contact_type:'VISIT',channel:null,legacy_grade:'C',next_action_at:'2026-09-18T01:00:00Z',...overrides });
it('uses the approved Excel initial snapshot only for the authorized project-wide scope',()=>{
 const snapshot=legacyDashboardSnapshot('1283e198-5043-4027-96d6-edcc7a6686c6','PROJECT_ADMIN');
 expect(snapshot?.grades).toEqual({A:245,B:156,C:381,D:39,'부재':19,'상담거절':11});
 expect(Object.values(snapshot!.grades).reduce((a,b)=>a+b,0)).toBe(851);
 expect(legacyDashboardSnapshot('another-project','PROJECT_ADMIN')).toBeNull();
 expect(legacyDashboardSnapshot('1283e198-5043-4027-96d6-edcc7a6686c6','COUNSELOR')).toEqual(snapshot);
});
it('counts a real native visit and D to C from prior consultation, not the master',()=>{
 const result=buildDashboardActivity([event()], [{unit_id:'u1',customer_id:'c1',legacy_grade:'D'}],now);
 expect(result).toMatchObject({total:1,units:1,channels:{CALL:0,VISIT:1,MESSAGE:0,UNKNOWN:0},previousC:0,previousD:1,absentRecontact:0,nextRegistered:1,changes:{'D → C':1}});
});
it('uses KST consulted_at, excludes legacy and future events, and preserves unknown channels',()=>{
 const result=buildDashboardActivity([
 event({id:'a',consulted_at:'2026-09-16T15:00:00Z',contact_type:'CALL'}),
 event({id:'b',contact_type:'MESSAGE'}), event({id:'c',contact_type:'OTHER'}),
 event({id:'old',consulted_at:'2026-09-16T14:59:59Z'}),
 event({id:'future',consulted_at:'2026-09-17T06:00:00Z'}),event({id:'legacy',channel:'LEGACY_IMPORT'}),
 ],[],now);
 expect(result.total).toBe(3);
 expect(result.units).toBe(1);
 expect(result.channels).toEqual({CALL:1,VISIT:0,MESSAGE:1,UNKNOWN:1});
 expect(Object.values(result.channels).reduce((a,b)=>a+b,0)).toBe(result.total);
});
it('advances previous valid grade within the day without crossing holders or treating blank as a grade',()=>{
 const result=buildDashboardActivity([
 event({id:'c',consulted_at:'2026-09-17T03:00:00Z',legacy_grade:'B'}),
 event({id:'a',consulted_at:'2026-09-17T01:00:00Z',legacy_grade:'C'}),
 event({id:'b',consulted_at:'2026-09-17T02:00:00Z',legacy_grade:null}),
 event({id:'d',customer_id:'new-holder',consulted_at:'2026-09-17T04:00:00Z',legacy_grade:'A'}),
 ],[{unit_id:'u1',customer_id:'c1',legacy_grade:'부재'}],now);
 expect(result.changes).toEqual({'부재 → C':1,'C → B':1});
 expect(result.absentRecontact).toBe(1);
 expect(result.previousC).toBe(2);
 expect(result.previousUnknown).toBe(1);
});
it('uses a same-day legacy evaluation as prior evidence but never counts it as native activity',()=>{
 const result=buildDashboardActivity([
 event({id:'legacy',channel:'LEGACY_IMPORT',legacy_grade:'D',consulted_at:'2026-09-17T00:00:00Z'}),
 event(),
 ],[],now);
 expect(result.total).toBe(1);
 expect(result.previousD).toBe(1);
 expect(result.changes).toEqual({'D → C':1});
});
