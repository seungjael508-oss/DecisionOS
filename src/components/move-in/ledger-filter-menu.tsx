'use client';
import { useState } from 'react';
import { LEDGER_BLANK, type AxisSelection, type LedgerAxis } from '@/lib/move-in/ledger-filters';
import { LEDGER_AXIS_LABELS, ledgerOptionLabel } from '@/lib/move-in/ledger-presentation';

export function LedgerFilterMenu({axis,options,selection,onChange,assignees}: {
  axis:LedgerAxis;options:readonly {value:string;label:string}[];selection:AxisSelection;onChange:(selection:AxisSelection)=>void;assignees:Record<string,string>;
}) {
  const [open,setOpen]=useState(false),[search,setSearch]=useState('');const label=LEDGER_AXIS_LABELS[axis];
  const optionsByValue=new Map(options.map(o=>[o.value,o]));
  for(const value of [...selection.include,...selection.exclude]) if(!optionsByValue.has(value)) optionsByValue.set(value,{value,label:ledgerOptionLabel(axis,value,assignees)});
  const matching=[...optionsByValue.values()].filter(o=>!search || o.label.toLocaleLowerCase().includes(search.toLocaleLowerCase()) || o.value.includes(search));
  function toggle(value:string,mode:'include'|'exclude',checked:boolean) {
    const other=mode==='include'?'exclude':'include';
    onChange({...selection,[mode]:checked?[...selection[mode].filter(v=>v!==value),value]:selection[mode].filter(v=>v!==value),[other]:checked?selection[other].filter(v=>v!==value):selection[other]});
  }
  return <div className="relative">
    <button type="button" aria-label={`${label} 필터`} aria-expanded={open} onClick={()=>setOpen(v=>!v)} className="rounded border border-neutral-400 bg-white px-3 py-2 text-sm max-[1099px]:min-h-11">
      {label}{selection.include.length+selection.exclude.length?` · ${selection.include.length+selection.exclude.length}`:''}
    </button>
    {open?<fieldset aria-label={`${label} 조건`} className="absolute left-0 top-full z-40 mt-1 w-72 rounded border border-neutral-400 bg-white p-3 shadow-lg" onKeyDown={e=>{if(e.key==='Escape')setOpen(false);}}>
      <legend className="sr-only">{label} 조건</legend>
      <div className="flex gap-2 text-sm"><button type="button" onClick={()=>onChange({include:[],exclude:[]})}>전체</button>
        <button type="button" onClick={()=>onChange({include:[LEDGER_BLANK],exclude:[]})}>빈값</button>
        <button type="button" onClick={()=>{onChange({include:[],exclude:[]});setSearch('');}}>초기화</button>
        <button type="button" className="ml-auto" onClick={()=>setOpen(false)}>닫기</button></div>
      <label className="my-2 block text-sm">검색<input aria-label={`${label} 필터 검색`} value={search} onChange={e=>setSearch(e.target.value)} className="mt-1 w-full border px-2 py-1" /></label>
      <p className="text-xs text-neutral-600">선택값은 OR · 다른 필터와는 AND · 제외값 우선</p>
      <div className="mt-2 grid grid-cols-[1fr_3rem_3rem] gap-1 text-xs"><span>값</span><span>선택값</span><span>제외값</span></div>
      <ul className="max-h-72 overflow-y-auto">{matching.slice(0,100).map(o=><li key={o.value} className="grid grid-cols-[1fr_3rem_3rem] items-center gap-1 border-b py-2 text-sm">
        <span className="break-all">{o.label}</span><input type="checkbox" aria-label={`선택 ${o.label}`} checked={selection.include.includes(o.value)} onChange={e=>toggle(o.value,'include',e.target.checked)} />
        <input type="checkbox" aria-label={`제외 ${o.label}`} checked={selection.exclude.includes(o.value)} onChange={e=>toggle(o.value,'exclude',e.target.checked)} />
      </li>)}</ul>
      {matching.length>100?<p className="mt-2 text-xs">{matching.length}개 중 100개 표시 · 검색으로 범위를 좁혀 주세요.</p>:null}
      {!matching.length?<p>검색 결과 없음</p>:null}
    </fieldset>:null}
  </div>;
}
