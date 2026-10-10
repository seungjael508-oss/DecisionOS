'use client';
import type { LedgerClientRow, ProjectionResult } from '@/lib/move-in/ledger-types';
import { useLedgerSummaryResult } from '@/components/move-in/ledger-summary-store';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LEDGER_AXES, applyLedgerQuery, parseLedgerQuery, patchLedgerQuery, type LedgerStatePatch, type LedgerSortKey, type LedgerView } from '@/lib/move-in/ledger-filters';
import { QUICK_LEDGER_FILTERS, ledgerOptions } from '@/lib/move-in/ledger-presentation';
import { formatDateTime } from '@/lib/move-in/labels';
import { LedgerTable } from '@/components/move-in/ledger-table';
import { LedgerFilterMenu } from '@/components/move-in/ledger-filter-menu';
import { LedgerPrintTable } from '@/components/move-in/ledger-print-table';
import { exportLedgerXlsx, prepareLedgerPrint } from '@/app/projects/[projectId]/move-in/ledger/actions';

const sorts: {value:LedgerSortKey;label:string}[]=[{value:'unit',label:'동/호수'},{value:'grade',label:'현재등급'},{value:'phone',label:'전화번호'},{value:'name',label:'계약자'},
  {value:'funding',label:'자금/대출'},{value:'moveIn',label:'입주진행'},{value:'nextContact',label:'다음접촉'},{value:'priority',label:'특별관리 위험순'},{value:'balance',label:'잔금 (미등록)'},{value:'queue',label:'기존 Queue 순서'}];
export function MasterLedgerClient({projectId,result:initialResult,initialQuery,assignees}: {projectId:string; result:ProjectionResult<LedgerClientRow>;initialQuery:string;assignees:Record<string,string>}) {
  const result=useLedgerSummaryResult(projectId,initialResult);
  const [query,setQuery]=useState(initialQuery),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [printData,setPrintData]=useState<{rows:string[][];asOf:string}|null>(null);
  const outputLock=useRef(false);
  const state=useMemo(()=>parseLedgerQuery(new URLSearchParams(query)),[query]);
  const selected=useMemo(()=>applyLedgerQuery(result.rows,state,new Date(result.snapshotAsOf)),[result.rows,result.snapshotAsOf,state]);
  const options=useMemo(()=>Object.fromEntries(LEDGER_AXES.map(axis=>[axis,ledgerOptions(result.rows,axis,assignees)])),[result.rows,assignees]);
  const pathname=`/projects/${projectId}/move-in/ledger`;
  const pages=Math.max(1,Math.ceil(selected.total/state.pageSize)),page=Math.min(state.page,pages);
  useEffect(()=>{
    const restore=()=>{if(window.location.pathname===pathname)setQuery(window.location.search.slice(1));};
    window.addEventListener('popstate',restore);return()=>window.removeEventListener('popstate',restore);
  },[pathname]);
  useEffect(()=>{
    if(!printData)return;
    const finish=()=>setPrintData(null);window.addEventListener('afterprint',finish,{once:true});window.print();
    return()=>window.removeEventListener('afterprint',finish);
  },[printData]);
  function update(patch:LedgerStatePatch) {
    // Native History API changes the URL without asking Next/Supabase to reload rows.
    const current=window.location.pathname===pathname?window.location.search:query;
    const next=patchLedgerQuery(new URLSearchParams(current),patch).toString();
    window.history.pushState(null,'',`${pathname}${next?'?'+next:''}`);setQuery(next);
  }
  async function output(kind:'print'|'xlsx') {
    if(outputLock.current)return;outputLock.current=true;setBusy(true);setError('');
    try {
      if(kind==='print') {
        const prepared=await prepareLedgerPrint(projectId,query);
        if(!prepared.ok){setError(prepared.error);return;}setPrintData({rows:prepared.rows,asOf:prepared.asOf});
      } else {
        const file=await exportLedgerXlsx(projectId,query);
        if(!file.ok){setError(file.error);return;}
        const bytes=Uint8Array.from(atob(file.base64),c=>c.charCodeAt(0));
        const url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
        const link=document.createElement('a');link.href=url;link.download=file.filename;link.click();URL.revokeObjectURL(url);
      }
    } catch {setError('출력하지 못했습니다. 필터를 유지한 채 다시 시도해 주세요.');}
    finally {outputLock.current=false;setBusy(false);}
  }
  if(result.error)return <p role="alert">원장 데이터를 불러오지 못했습니다.</p>;
  return <>
    <div className="print:hidden">
      <div className="mb-4 flex flex-wrap items-center gap-3"><h1 className="text-2xl font-semibold">통합원장</h1>
        <p className="text-sm text-neutral-600">현재 snapshot · {formatDateTime(result.snapshotAsOf)}</p></div>
      <fieldset disabled={busy} className="mb-4 space-y-3 rounded border border-neutral-300 p-4"><legend className="sr-only">원장 검색과 필터</legend>
        <div className="flex flex-wrap gap-2" aria-label="빠른필터">{QUICK_LEDGER_FILTERS.map(p=><button type="button" key={p.label} aria-label={`빠른필터 ${p.label}`}
          onClick={()=>update(p.patch)} className="rounded border px-3 py-1.5 text-sm">{p.label}</button>)}</div>
        <div className="flex flex-wrap gap-3">{(['unit','customer','phone'] as const).map((key,i)=><label key={key} className="text-sm">{['호수','계약자','전화번호'][i]} 검색
          <input aria-label={`${['호수','계약자','전화번호'][i]} 검색`} value={state.text[key]??''} onChange={e=>update({text:{[key]:e.target.value}})} className="ml-2 w-36 rounded border px-2 py-1" />
        </label>)}</div>
        <div className="flex flex-wrap gap-2">{LEDGER_AXES.map(axis=><LedgerFilterMenu key={axis} axis={axis} options={options[axis]} assignees={assignees}
          selection={state.axes[axis]??{include:[],exclude:[]}} onChange={selection=>update({axes:{[axis]:selection}})} />)}</div>
        <div className="flex flex-wrap items-end gap-3 text-sm">
          <label>다음접촉 시작<input aria-label="다음접촉 시작" type="date" value={state.nextContactRange?.from??''} onChange={e=>update({nextContactRange:{from:e.target.value,to:state.nextContactRange?.to??''}})} className="ml-2 border p-1" /></label>
          <label>다음접촉 종료<input aria-label="다음접촉 종료" type="date" value={state.nextContactRange?.to??''} onChange={e=>update({nextContactRange:{from:state.nextContactRange?.from??'',to:e.target.value}})} className="ml-2 border p-1" /></label>
          <label>원장 보기<select aria-label="원장 보기" value={state.view} onChange={e=>update({view:e.target.value as LedgerView})} className="ml-2 border p-1">
            <option value="all">전체</option><option value="sale">매매</option><option value="rental">임대</option><option value="special">특별관리</option>
            {state.view==='today'?<option value="today">기존 Today 문맥</option>:null}</select></label>
          <label>정렬 기준<select aria-label="정렬 기준" value={state.sort.key} onChange={e=>update({sort:{...state.sort,key:e.target.value as LedgerSortKey}})} className="ml-2 border p-1">{sorts.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
          <label>정렬 방향<select aria-label="정렬 방향" value={state.sort.direction} onChange={e=>update({sort:{...state.sort,direction:e.target.value as 'asc'|'desc'}})} className="ml-2 border p-1"><option value="asc">오름차순</option><option value="desc">내림차순</option></select></label>
          <button type="button" onClick={()=>update({reset:true})} className="rounded border px-3 py-1">전체 초기화</button>
        </div>
      </fieldset>
      {state.issues.length?<p role="alert">지원하지 않는 필터가 있습니다. 초기화 후 다시 선택해 주세요.</p>:null}
      {state.view==='today'?<p>오늘 재콜 목록을 보려면 원장 보기를 전체로 바꾸고 오늘재콜을 선택하세요.</p>:null}
      {result.anomalyCount>0?<p>현재 계약 확인필요 {result.anomalyCount}세대 제외</p>:null}
      <div className="mb-3 flex flex-wrap items-center gap-3"><p role="status">결과 {selected.total} / 전체 {result.rows.length}세대</p>
        <label className="text-sm">페이지 크기<select aria-label="페이지 크기" value={state.pageSize} onChange={e=>update({pageSize:Number(e.target.value) as 50|100})} className="ml-2 border p-1"><option value="50">50</option><option value="100">100</option></select></label>
        <button type="button" disabled={page<=1} onClick={()=>update({page:page-1})} className="border px-2 py-1 disabled:opacity-40">이전 페이지</button><span>{page} / {pages}</span>
        <button type="button" disabled={page>=pages} onClick={()=>update({page:page+1})} className="border px-2 py-1 disabled:opacity-40">다음 페이지</button>
        <button type="button" disabled={busy || !!state.issues.length} onClick={()=>void output('print')} className="border px-3 py-1">인쇄</button>
        <button type="button" disabled={busy || !!state.issues.length} onClick={()=>void output('xlsx')} className="border px-3 py-1">XLSX 내보내기</button>
        {busy?<span>출력 권한과 데이터를 확인하고 있습니다…</span>:null}
      </div>
      <p className="mb-3 text-xs text-neutral-600">인쇄·내보내기는 현재 페이지가 아닌 필터 결과 전체입니다. 출력 시점의 권한과 현재 데이터를 다시 확인합니다.</p>
      {error?<p role="alert" className="mb-3 text-red-700">{error}</p>:null}
      <LedgerTable rows={selected.pageRows} assignees={assignees} />
    </div>
    {printData?<LedgerPrintTable rows={printData.rows} asOf={formatDateTime(printData.asOf)} />:null}
  </>;
}
