import { beforeEach, expect, it, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { loadUnitRows, loadCallRows, loadFloorplanRows } from '@/lib/move-in/queries';

const state = vi.hoisted(() => ({ client: null as unknown, failBatch: false, contractRequests: 0, role: "PROJECT_ADMIN", requests: [] as string[], urls: [] as URL[] }));
vi.mock('@/lib/move-in/access',()=>({requireMoveInAccess:async()=>({ok:true,role:state.role,memberId:'member'})}));
vi.mock('@/lib/supabase/server', () => ({ createServerClient: async () => state.client }));
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const fixtures: Record<string, Record<string, unknown>[]> = {
  project_unit: [], unit_occupancy_status: [], contract: [], customer: [], consultation: [],
};
beforeEach(() => {
  state.failBatch=false; state.contractRequests=0; state.requests=[];state.urls=[];state.role="PROJECT_ADMIN";
  for (const key of Object.keys(fixtures)) fixtures[key] = [];
  for (let i=1; i<=851; i++) {
    fixtures.project_unit.push({ unit_id:id(i), building_no:'101', unit_no:String(i) });
    fixtures.contract.push({ contract_id:id(i+1000), customer_id:id(i+2000), unit_id:id(i), contract_status:'ACTIVE' });
    fixtures.customer.push({ id:id(i+2000), name:`Synthetic ${i}`, phone:'', phone_normalized:null, phone_quality:'PHONE_INVALID', assigned_counselor_id:null });
    fixtures.unit_occupancy_status.push({ unit_id:id(i), contract_id:id(i+1000), occupancy_intent:'UNDECIDED', funding_status:'UNKNOWN', move_in_status:'NOT_CONTACTED' });
  }
  state.client = createClient('https://example.invalid','synthetic-key',{ global:{ fetch:async (input) => {
    const url = new URL(String(input));
    state.urls.push(url);
    state.requests.push(url.pathname.split("/").at(-1)!);
    if (url.pathname.endsWith("/contract") && ++state.contractRequests===2 && state.failBatch) return new Response("Bad Request",{status:400});
    if (url.href.length > 30000) return new Response('Bad Request',{ status:400 });
    let rows = fixtures[url.pathname.split('/').at(-1)!] ?? [];
    for (const [key,value] of url.searchParams) {
      if(!key.includes('.') && value.startsWith('in.(')) {
        const ids = new Set(value.slice(4,-1).split(','));
        rows = rows.filter(row => ids.has(String(row[key])));
      }
    }
    const offset=Number(url.searchParams.get('offset') ?? 0);
    const limit=Number(url.searchParams.get('limit') ?? 1000);
    if(url.pathname.endsWith('/project_unit') && url.searchParams.get('select')?.includes('grade:')) {
      if(offset>0 && state.failBatch)return new Response('Bad Request',{status:400});
      rows=rows.map(unit=>{
        const occupancy=fixtures.unit_occupancy_status.find(o=>o.unit_id===unit.unit_id);
        const contract=fixtures.contract.find(c=>c.contract_id===occupancy?.contract_id);
        const holder=fixtures.customer.find(c=>c.id===contract?.customer_id);
        const events=fixtures.consultation.filter(c=>c.unit_id===unit.unit_id).sort((a,b)=>String(b.consulted_at).localeCompare(String(a.consulted_at)));
        const pairs=url.searchParams.get('grade.or');
        const matching= pairs ? events.filter(c=>pairs.includes(`unit_id.eq.${c.unit_id},customer_id.eq.${c.customer_id}`)) : events;
        const grades=matching.filter(c=>['A','B','C','D','부재','상담거절'].includes(String((c.structured_tags as Record<string,unknown>)?.legacy_grade)));
        return {...unit,occupancy:occupancy?{...occupancy,contract:contract?{...contract,holder}:null}:null,latest:events.slice(0,1),grade:grades.slice(0,1).map(c=>({customer_id:c.customer_id,legacy_grade:(c.structured_tags as Record<string,unknown>).legacy_grade}))};
      });
    }
    if(url.searchParams.get('order')?.startsWith('consulted_at')) rows=[...rows].sort((a,b)=>String(b.consulted_at).localeCompare(String(a.consulted_at)));
    return new Response(JSON.stringify(rows.slice(offset,offset+limit)),{ status:200,headers:{'content-type':'application/json','content-range':`0-0/${rows.length}`} });
  } } });
});
it('loads all 851 unit holders without exceeding the API URL limit',async () => {
 const result=await loadUnitRows('synthetic-project');
 expect(result.error).toBe(false);
 expect(result.rows).toHaveLength(851);
 expect(new Set(result.rows.map(row=>row.customerName)).size).toBe(851);
 expect(result.rows.every(row=>row.phoneQuality==='PHONE_INVALID')).toBe(true);
});
it('loads all 851 call rows without exceeding the API URL limit',async () => {
 const result=await loadCallRows('synthetic-project');
 expect(result.error).toBe(false);
 expect(result.rows).toHaveLength(851);
});

it('does not return a partial list if a later ID batch fails',async () => {
 state.failBatch=true;
 const result=await loadUnitRows('synthetic-project');
 expect(result.error).toBe(true);
 expect(result.rows).toHaveLength(0);
});

it('reads every floorplan grade beyond the default 1000 history row cap',async () => {
 fixtures.consultation=Array.from({length:1180},(_,i)=>({id:id(i+5000),unit_id:id(1),consulted_at:'2026-08-01T01:00:00Z',structured_tags:{legacy_grade:'A'}}));
 for(let i=1;i<=851;i++) fixtures.consultation.push({id:id(i+7000),unit_id:id(i),consulted_at:'2026-07-01T01:00:00Z',structured_tags:{legacy_grade:'B'}});
 const result=await loadFloorplanRows('synthetic-project');
 expect(result.error).toBe(false);
 expect(result.rows.filter(row=>row.latestGrade).length).toBe(851);
});

it('loads latest content, latest valid holder grade and phone without N+1',async()=>{
 fixtures.project_unit[0].unit_no='201';fixtures.project_unit[1].unit_no='1001';
 fixtures.consultation=Array.from({length:2031},(_,i)=>({id:id(i+10000),unit_id:id(1),customer_id:id(2001),consulted_at:i===0?'2026-09-17T01:00:00Z':'2026-08-01T00:00:00Z',content:i===0?'Synthetic latest':'Synthetic prior',structured_tags:i===0?{}:{legacy_grade:'B'}}));
 const result=await loadUnitRows('synthetic-project');
 expect(result.error).toBe(false);
 const first=result.rows.find(r=>r.unitId===id(1))!;
 expect(first).toMatchObject({latestConsultation:'Synthetic latest',latestGrade:'B',customerPhone:'',lastContactAt:'2026-09-17T01:00:00Z'});
 expect(state.requests.filter(t=>t==='consultation')).toHaveLength(0);
 expect(state.urls.every(u=>u.searchParams.get('latest.limit')==='1' && u.searchParams.get('grade.limit')==='1')).toBe(true);
 expect(state.requests.length).toBe(2);
 expect(result.rows.findIndex(r=>r.unitId===id(1))).toBeLessThan(result.rows.findIndex(r=>r.unitId===id(2)));
});
it('limits counselors to their current assigned holders even if a response contains other units',async()=>{
 state.role='COUNSELOR';fixtures.customer[0].assigned_counselor_id='member';
 const result=await loadUnitRows('synthetic-project');
 expect(result.error).toBe(false);expect(result.rows.map(r=>r.unitId)).toEqual([id(1)]);
});

it('resolves a former-holder grade with one bounded query without losing unit history',async()=>{
 fixtures.consultation=[
 {id:id(10001),unit_id:id(1),customer_id:id(9999),consulted_at:'2026-09-17T00:00:00Z',content:'Prior holder latest',structured_tags:{legacy_grade:'D'}},
 {id:id(10002),unit_id:id(1),customer_id:id(2001),consulted_at:'2026-08-01T00:00:00Z',content:'Current holder earlier',structured_tags:{legacy_grade:'B'}}
 ];
 const result=await loadUnitRows('synthetic-project');
 expect(result.error).toBe(false);
 expect(result.rows.find(r=>r.unitId===id(1))).toMatchObject({latestConsultation:'Prior holder latest',latestGrade:'B',latestPreviousHolder:true});
 expect(state.requests).toHaveLength(3);
 expect(state.requests.every(t=>t==='project_unit')).toBe(true);
 expect(fixtures.consultation[0].customer_id).toBe(id(9999));
});
