import { beforeEach, expect, test, vi } from 'vitest';
import type { CurrentUnitSnapshot } from '@/lib/move-in/ledger-types';
const m=vi.hoisted(()=>({current:vi.fn(),badges:vi.fn(),client:vi.fn()}));
vi.mock('@/lib/move-in/current-unit-snapshot.server',()=>({loadCurrentUnitSnapshots:m.current}));
vi.mock('@/lib/move-in/floorplan-schedule.server',()=>({loadFloorplanScheduleBadges:m.badges}));
vi.mock('@/lib/supabase/server',()=>({createServerClient:m.client}));
import { loadCurrentFloorplanRows } from '@/lib/move-in/floorplan-current.server';
const snap:CurrentUnitSnapshot={projectId:'p',unitId:'u',currentContractId:'k',currentCustomerId:'c',currentGrade:'A',funding:'NORMAL',moveIn:'CONTACTED',operationalIntent:'UNDECIDED',occupancyIntent:'UNDECIDED',effectiveIntent:'UNDECIDED',rentalType:null,legacyConsidering:false,balancePaidAt:null,plannedMoveInDate:null,actualMoveInDate:null,tradeFundingType:null,tradeFundingStatus:null,problemFlags:[],problemLockReleased:false,problemNote:null,specialReasons:[],specialPriority:null,sourceTags:[],sourceUpdatedAt:'2026-11-16',fetchedAt:'2026-11-16',revision:'r'};
beforeEach(()=>{
 m.current.mockResolvedValue({error:false,rows:[snap],anomalyCount:0,anomalies:{},snapshotAsOf:'2026-11-16',queryCounts:{current:1,contacts:0,deals:0,special:0,recheck:1}});
 const q:Record<string,unknown>={};for(const name of ['select','eq','order','range'])q[name]=()=>q;
 q.returns=()=>Promise.resolve({error:null,data:[{project_id:'p',unit_id:'u',building_no:'101',unit_no:'201',floor:2}]});
 m.client.mockResolvedValue({from:()=>q});
});
test('existing loader attaches a narrow derived badge without serializing consultation/contract/customer',async()=>{
 m.badges.mockResolvedValue({badges:new Map([['u',{kind:'balance',label:'잔금 12/20'}]]),error:false,queryCount:1});
 const result=await loadCurrentFloorplanRows('p');
 expect(result.error).toBe(false);expect(result.rows).toHaveLength(1);expect(result.rows[0].scheduleBadge).toEqual({kind:'balance',label:'잔금 12/20'});
 expect(m.badges).toHaveBeenCalledWith('p',[snap],expect.any(Date));
 for(const key of ['currentCustomerId','currentContractId','content'])expect(result.rows[0]).not.toHaveProperty(key);
});
test('optional schedule failure keeps existing grid and marks only schedule unavailability',async()=>{
 m.badges.mockResolvedValue({badges:new Map(),error:true,queryCount:1});
 const result=await loadCurrentFloorplanRows('p');
 expect(result.error).toBe(false);expect(result.rows).toHaveLength(1);expect(result.scheduleUnavailable).toBe(true);expect(result.rows[0].scheduleBadge).toBeUndefined();
});
