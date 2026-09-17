import { beforeEach, expect, it, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { loadDashboard } from '@/lib/move-in/queries';
const state=vi.hoisted(()=>({client:null as unknown,role:'PROJECT_ADMIN',ok:true,fail:false,urls:[] as URL[]}));
vi.mock('@/lib/move-in/access',()=>({requireMoveInAccess:async()=>({ok:state.ok,role:state.role,memberId:'member'})}));
vi.mock('@/lib/supabase/server',()=>({createServerClient:async()=>state.client}));
const project='1283e198-5043-4027-96d6-edcc7a6686c6';
beforeEach(()=>{
 state.role='PROJECT_ADMIN';state.ok=true;state.fail=false;state.urls=[];
 state.client=createClient('https://example.invalid','fake',{global:{fetch:async(input)=>{
  const url=new URL(String(input));state.urls.push(url);
  const offset=Number(url.searchParams.get('offset')??0),limit=Number(url.searchParams.get('limit')??500);
  if(state.fail && offset>0)return new Response('unavailable',{status:500});
  let rows:unknown[];
  if(url.pathname.endsWith('/consultation')) rows=[{id:'event',unit_id:'u0',customer_id:'c0',consulted_at:'2026-09-17T01:00:00Z',contact_type:'VISIT',channel:null,legacy_grade:'C',next_action_at:'2026-09-18T01:00:00Z'}];
  else if(url.searchParams.get('select')?.includes('prior:')) rows=[{unit_id:'u0',prior:[{unit_id:'u0',customer_id:'c0',legacy_grade:'D'}]}];
  else rows=Array.from({length:851},(_,i)=>({unit_id:`u${i}`,legacy:i<848?[{unit_id:`u${i}`}]:[],occupancy:{occupancy_intent:'UNDECIDED',move_in_status:'NOT_CONTACTED',next_contact_at:i===0?'2026-09-18T01:00:00Z':null,contract:{customer_id:`c${i}`,holder:{assigned_counselor_id:i===0?'member':'other'}}}}));
  return new Response(JSON.stringify(rows.slice(offset,offset+limit)),{headers:{'content-type':'application/json','content-range':`0-0/${rows.length}`}});
 }}});
});
it('returns 851/848/3, real event activity and no history content with bounded requests',async()=>{
 const result=await loadDashboard(project,new Date('2026-09-17T05:00:00Z'));
 expect(result.error).toBe(false);
 if(result.error)return;
 expect(result.data).toMatchObject({totalUnits:851,legacyLinked:848,sourceReview:3,nextScheduled:1,activity:{total:1,previousD:1,changes:{'D → C':1}}});
 expect(state.urls).toHaveLength(4);
 for(const url of state.urls){
  expect(url.searchParams.get('project_id')).toBe(`eq.${project}`);
  expect(url.searchParams.get('select')).not.toMatch(/\b(content|name|phone|address)\b/);
 }
 const eventUrl=state.urls.find(u=>u.pathname.endsWith('/consultation'))!;
 expect(eventUrl.searchParams.getAll('consulted_at')).toContain('gte.2026-09-16T15:00:00.000Z');
 expect(eventUrl.searchParams.getAll('consulted_at')).toContain('lt.2026-09-17T15:00:00.000Z');
 expect(state.urls.filter(u=>u.searchParams.has('legacy.limit')).every(u=>u.searchParams.get('legacy.limit')==='1')).toBe(true);
});
it('scopes counselor totals to assigned holders and never exposes project initial totals',async()=>{
 state.role='COUNSELOR';const result=await loadDashboard(project,new Date('2026-09-17T05:00:00Z'));
 expect(result.error).toBe(false);if(result.error)return;
 expect(result.data.totalUnits).toBe(1);expect(result.data.initial).toBeNull();
});
it('denies a forbidden project before reading datasets',async()=>{
 state.ok=false;expect((await loadDashboard(project)).error).toBe(true);expect(state.urls).toHaveLength(0);
});
it('does not replace an incomplete dataset with false zero counts',async()=>{
 state.fail=true;expect((await loadDashboard(project)).error).toBe(true);
});
