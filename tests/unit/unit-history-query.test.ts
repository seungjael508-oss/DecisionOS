import { beforeEach, expect, it, vi } from 'vitest';
const state=vi.hoisted(()=>({allowed:true,role:'PROJECT_ADMIN',assigned:'member',requests:[] as {table:string;filters:Record<string,unknown>;orders:string[]}[],events:[] as Record<string,unknown>[],fail:false}));
vi.mock('@/lib/move-in/access',()=>({requireMoveInAccess:async()=>state.allowed?({ok:true,role:state.role,memberId:'member'}):({ok:false,kind:'forbidden'})}));
vi.mock('@/lib/supabase/server',()=>({createServerClient:async()=>({from:(table:string)=>{
 const request={table,filters:{} as Record<string,unknown>,orders:[] as string[]};state.requests.push(request);
 let start=0,end=999,single=false;
 const q={select:()=>q,eq:(k:string,v:unknown)=>{request.filters[k]=v;return q},in:()=>q,
 order:(k:string)=>{request.orders.push(k);return q},range:(a:number,b:number)=>{start=a;end=b;return q},
 maybeSingle:()=>{single=true;return q},
 then:(resolve:(v:unknown)=>unknown)=>{
  const data:Record<string,unknown>[] = table==='project_unit'?[{unit_id:'unit',building_no:'101',unit_no:'201'}]:
   table==='unit_occupancy_status'?[{contract_id:'contract'}]:
   table==='contract'?[{customer_id:'current',unit_id:'unit'}]:
   table==='customer'?[{name:'Synthetic holder',assigned_counselor_id:state.assigned}]:
   table==='consultation'?[...state.events].sort((a,b)=>String(b.consulted_at).localeCompare(String(a.consulted_at))):[];
  return Promise.resolve({data:single?data[0]:data.slice(start,end+1),count:data.length,error:state.fail&&table==='consultation'&&start>0?{}:null}).then(resolve);
 }};
 return q;
}})}));
import { loadUnitDetail } from '@/lib/move-in/queries';
const event=(id:string,at:string,customer='old')=>({id,consulted_at:at,customer_id:customer,content:'Synthetic history',contact_type:'CONSULTATION',channel:'LEGACY_IMPORT',purpose:'성향파악',counselor_id:'importer',structured_tags:{legacy_grade:'C',legacy_counselor_name:'Synthetic counselor',legacy_source_holder:'Synthetic old holder'},next_action_at:null});
beforeEach(()=>{state.allowed=true;state.role='PROJECT_ADMIN';state.assigned='member';state.requests=[];state.fail=false;state.events=[event('old','2026-08-01T00:00:00Z'),event('new','2026-09-17T00:00:00Z','current')];});
it('returns unit history without replacing the historical holder, newest first',async()=>{
 const result=await loadUnitDetail('project','unit');
 expect(result.kind).toBe('ok');if(result.kind!=='ok')return;
 expect(result.consultations.map(r=>r.id)).toEqual(['new','old']);
 expect(result.consultations[1]).toMatchObject({previousHolder:true,sourceHolder:'Synthetic old holder',legacyCounselorName:'Synthetic counselor'});
 const req=state.requests.find(r=>r.table==='consultation')!;
 expect(req.filters).toEqual({project_id:'project',unit_id:'unit'});
 expect(req.orders).toEqual(['consulted_at','id']);
 expect(state.events[0].customer_id).toBe('old');
});
it('denies an unassigned counselor before fetching history',async()=>{
 state.role='COUNSELOR';state.assigned='another-member';
 expect((await loadUnitDetail('project','unit')).kind).toBe('missing');
 expect(state.requests.some(r=>r.table==='consultation')).toBe(false);
});
it('allows the assigned counselor using the RLS client',async()=>{
 state.role='COUNSELOR';expect((await loadUnitDetail('project','unit')).kind).toBe('ok');
});
it('reads history beyond the API cap and does not publish partial history',async()=>{
 state.events=Array.from({length:1001},(_,i)=>event(String(i),'2026-08-01T00:00:00Z'));
 const result=await loadUnitDetail('project','unit');
 expect(result.kind).toBe('ok');if(result.kind==='ok')expect(result.consultations).toHaveLength(1001);
 state.fail=true;expect((await loadUnitDetail('project','unit')).kind).toBe('error');
});
it('places a newly persisted consultation first when the detail is reloaded',async()=>{
 await loadUnitDetail('project','unit');
 state.events.push({...event('just-saved','2026-09-17T01:00:00Z','current'),channel:null,contact_type:'CALL',purpose:'입주안내',content:'Synthetic new consultation'});
 const reloaded=await loadUnitDetail('project','unit');
 expect(reloaded.kind).toBe('ok');
 if(reloaded.kind==='ok'){
  expect(reloaded.consultations[0]).toMatchObject({id:'just-saved',content:'Synthetic new consultation',contactType:'CALL',previousHolder:false});
  expect(reloaded.consultations).toHaveLength(3);
 }
});

it('denies an inaccessible project before reading unit or history',async()=>{
 state.allowed=false;
 expect((await loadUnitDetail('other-project','unit')).kind).toBe('missing');
 expect(state.requests).toHaveLength(0);
});
