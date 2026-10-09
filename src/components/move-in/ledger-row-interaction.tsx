'use client';
import {useEffect,useState,type RefObject} from 'react';
import {createPortal} from 'react-dom';
type Target={unitId:string;cell:HTMLElement;label:string};
/** Additive interaction adapter. The frozen table/row renderer and its props stay unchanged. */
export function LedgerRowInteraction({root}:{root:RefObject<HTMLDivElement|null>}){
 const [targets,setTargets]=useState<Target[]>([]);
 useEffect(()=>{
  const parent=root.current;if(!parent)return;
  function read(){
   const next=[...parent!.querySelectorAll<HTMLTableRowElement>('table[aria-label="통합원장 목록"] tr[data-unit-id]')].flatMap(row=>{
    const cell=row.querySelector<HTMLElement>('td');if(!cell)return [];
    row.id=`ledger-unit-${row.dataset.unitId}`;
    const label=[...cell.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join('').trim();
    return [{unitId:row.dataset.unitId!,cell,label}];
   });
   setTargets(old=>old.length===next.length&&old.every((item,i)=>item.cell===next[i].cell&&item.unitId===next[i].unitId&&item.label===next[i].label)?old:next);
  }
  read();const observer=new MutationObserver(read);observer.observe(parent,{childList:true,subtree:true});return()=>observer.disconnect();
 },[root]);
 return targets.map(t=>createPortal(<button type="button" data-ledger-select={t.unitId} aria-label={`${t.label} 상세 열기`} className="ml-2 rounded border px-2 py-1 text-xs print:hidden">상세</button>,t.cell,t.unitId));
}
