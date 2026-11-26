import { beforeEach, expect, test, vi } from 'vitest';
const mocked=vi.hoisted(()=>({create:vi.fn(),pages:[] as {data:unknown[]|null;error:unknown}[],calls:[] as [string,unknown[]][]}));
vi.mock('@/lib/supabase/server',()=>({createServerClient:mocked.create}));
import { loadFloorplanScheduleBadges } from '@/lib/move-in/floorplan-schedule.server';
const a={projectId:'p',unitId:'a',currentCustomerId:'ca',currentGrade:'A',balancePaidAt:null};
const now=new Date('2026-11-16T12:00:00Z');
beforeEach(()=>{
 mocked.calls=[];mocked.pages=[];mocked.create.mockReset();
 const query:Record<string,unknown>={};
 for(const name of ['select','eq','in','lte','order','range'])query[name]=(...args:unknown[])=>{mocked.calls.push([name,args]);return query;};
 query.returns=()=>Promise.resolve(mocked.pages.shift()??{data:[],error:null});
 mocked.create.mockResolvedValue({from:(name:string)=>{mocked.calls.push(['from',[name]]);return query;}});
});
test('no A grade means no consultation reads',async()=>{
 const result=await loadFloorplanScheduleBadges('p',[{...a,currentGrade:'B'}],now);
 expect(mocked.create).not.toHaveBeenCalled();expect(result.badges.size).toBe(0);
});
test('scope reads to project and A units, enforce current customer, expose only badge DTO',async()=>{
 mocked.pages=[{error:null,data:[
  {project_id:'p',unit_id:'a',customer_id:'ca',id:'1',consulted_at:'2026-11-15T00:00:00Z',content:'잔금 12/20 예정; 비공개 원문'},
  {project_id:'p',unit_id:'a',customer_id:'old',id:'2',consulted_at:'2026-11-16T00:00:00Z',content:'잔금 12/25 예정'},
  {project_id:'other',unit_id:'a',customer_id:'ca',id:'3',consulted_at:'2026-11-16T00:00:00Z',content:'잔금 12/28 예정'},
 ]}];
 const result=await loadFloorplanScheduleBadges('p',[a,{...a,unitId:'b',currentGrade:'B'},{...a,projectId:'foreign',unitId:'x'}],now);
 expect(result.error).toBe(false);expect(result.badges.get('a')).toEqual({kind:'balance',label:'잔금 12/20'});
 expect(mocked.calls).toContainEqual(['from',['consultation']]);expect(mocked.calls).toContainEqual(['eq',['project_id','p']]);expect(mocked.calls).toContainEqual(['in',['unit_id',['a']]]);
 expect(JSON.stringify([...result.badges.values()])).not.toContain('비공개');
 expect(Object.keys(result.badges.get('a')!)).toEqual(['kind','label']);
});
test('failed consultation read adds no badge and no exception to existing floorplan',async()=>{
 mocked.pages=[{data:null,error:{message:'private server diagnostic'}}];
 const result=await loadFloorplanScheduleBadges('p',[a],now);
 expect(result.error).toBe(true);expect(result.badges.size).toBe(0);expect(JSON.stringify(result)).not.toContain('private');
});
