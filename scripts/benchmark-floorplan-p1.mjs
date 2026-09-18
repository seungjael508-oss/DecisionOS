// 실제 사용자 RLS 범위에서 추출한 비식별 스냅샷을 동일하게 재생한다.
// SDK·projection·pagination의 로컬 비용이며 실제 DB/네트워크 elapsed를 대신하지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { createClient } from '@supabase/supabase-js';
const require = createRequire(import.meta.url);
const snapshotPath = process.argv[2];
if (!snapshotPath || process.argv.includes('--help')) {
  console.log('Usage: node scripts/benchmark-floorplan-p1.mjs /private/tmp/rls-snapshot.json');
  process.exit(snapshotPath ? 0 : 1);
}
const fixture = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
const occupancy = new Map(fixture.occupancy.map(row => [row.unit_id, row]));
const histories = new Map();
for (const row of fixture.consultation) {
  if (!histories.has(row.unit_id)) histories.set(row.unit_id, []);
  histories.get(row.unit_id).push(row);
}
for (const rows of histories.values()) rows.sort((a,b)=>b.consulted_at.localeCompare(a.consulted_at)||a.id.localeCompare(b.id));
let queries = [];
const client = createClient('https://fixture.invalid', 'synthetic-key', {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: async input => {
    const started = performance.now();
    const url = new URL(String(input));
    const table = url.pathname.split('/').at(-1);
    const offset = Number(url.searchParams.get('offset') ?? 0);
    const limit = Number(url.searchParams.get('limit') ?? 1000);
    let all;
    if (table === 'project_unit') all = fixture.units;
    else if (table === 'unit_occupancy_status') all = fixture.occupancy;
    else if (table === 'consultation') all = [...fixture.consultation].sort((a,b)=>b.consulted_at.localeCompare(a.consulted_at)||a.id.localeCompare(b.id));
    else throw new Error(`Unexpected table: ${table}`);
    let rows = all.slice(offset, offset + limit);
    let embeddedRows = 0;
    if (table === 'project_unit' && url.searchParams.get('select').includes('grade:')) {
      assert.equal(url.searchParams.get('grade.limit'),'1');
      rows = rows.map(unit => {
        const latest = histories.get(unit.unit_id)?.[0];
        const state = occupancy.get(unit.unit_id);
        embeddedRows += (state ? 1 : 0) + (latest ? 1 : 0);
        return { ...unit, occupancy: state ?? null, grade: latest ? [{ legacy_grade: latest.structured_tags?.legacy_grade ?? null }] : [] };
      });
    }
    const response = new Response(JSON.stringify(rows), { status:200, headers:{'content-type':'application/json','content-range':`0-0/${all.length}`} });
    queries.push({ table, offset, returnedRows:rows.length, embeddedRows, localFetchElapsedMs:performance.now()-started });
    return response;
  } },
});
function loadQueries(before) {
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const loadedModule = { exports: {} }; cache.set(file,loadedModule);
    const source = before && file.endsWith('/move-in/queries.ts')
      ? execFileSync('git',['show','99cb809:src/lib/move-in/queries.ts'],{encoding:'utf8'})
      : fs.readFileSync(file,'utf8');
    const compiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
    vm.runInNewContext(compiled,{module:loadedModule,exports:loadedModule.exports,require(name){
      if(name==='@/lib/supabase/server')return {createServerClient:async()=>client};
      if(name.startsWith('@/'))return load(path.resolve('src',name.slice(2)+'.ts'));
      return require(name);
    },Date,console});
    return loadedModule.exports;
  }
  return load(path.resolve('src/lib/move-in/queries.ts')).loadFloorplanRows;
}
const beforeFn=loadQueries(true),afterFn=loadQueries(false);
const runs=[];let beforeRows;
// 각 버전 두 번 warm-up 후 10회 측정, 항상 동일 스냅샷/클라이언트/순서다.
for(let round=-2;round<10;round++)for(const [mode,fn] of [['before',beforeFn],['after',afterFn]]){
  queries=[];const start=performance.now();const result=await fn('1283e198-5043-4027-96d6-edcc7a6686c6');const total=performance.now()-start;
  assert.equal(result.error,false);
  if(mode==='before')beforeRows=JSON.parse(JSON.stringify(result.rows));
  else assert.deepEqual(JSON.parse(JSON.stringify(result.rows)),beforeRows);
  if(round>=0)runs.push({mode,round,totalLocalElapsedMs:total,queryCount:queries.length,returnedRows:queries.reduce((sum,q)=>sum+q.returnedRows,0),embeddedRows:queries.reduce((sum,q)=>sum+q.embeddedRows,0),queries:[...queries]});
}
const summary=Object.fromEntries(['before','after'].map(mode=>{
 const entries=runs.filter(r=>r.mode===mode), times=entries.map(r=>r.totalLocalElapsedMs).sort((a,b)=>a-b);
 return [mode,{queryCount:entries[0].queryCount,returnedRows:entries[0].returnedRows,embeddedRows:entries[0].embeddedRows,medianLocalElapsedMs:(times[4]+times[5])/2}];
}));
console.log(JSON.stringify({scope:fixture.role,metric:'local SDK snapshot replay; NOT production SQL/network/server-render time',sourceRows:{units:fixture.units.length,occupancy:fixture.occupancy.length,consultation:fixture.consultation.length},identicalOutput:true,summary,runs},null,2));
