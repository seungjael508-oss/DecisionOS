'use client';
import {createContext,useContext,useEffect,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {useLedgerSummaryStore} from './ledger-summary-store';
import {useUnitDetailWorkspace} from './unit-detail-workspace';
import type {UnitWorkspace} from '@/lib/move-in/unit-workspace-types';
import type {WorkspaceChange,WorkspaceSaveResult} from '@/lib/move-in/workspace-save';
type Section=WorkspaceChange['kind'];
type SaveContext={busy:boolean;blocked:boolean;markDirty:(section:Section)=>void;save:(change:WorkspaceChange,afterSave:'stay'|'next',confirmed?:(workspace:UnitWorkspace)=>void)=>Promise<{ok:boolean}>};
const Context=createContext<SaveContext|null>(null);
export const useUnitSave=()=>useContext(Context);
export function UnitSaveProvider({workspace,returnTo,onRefreshed,children}:{workspace:UnitWorkspace;returnTo:string;onRefreshed:(w:UnitWorkspace)=>void;children:ReactNode}){
 const store=useLedgerSummaryStore(),guard=useUnitDetailWorkspace();
 const [busy,setBusy]=useState(false),[blocked,setBlocked]=useState(false),[message,setMessage]=useState(''),[retryable,setRetryable]=useState(false);
 const locked=useRef(false),mounted=useRef(true),dirty=useRef(new Set<Section>()),pending=useRef<null|(()=>Promise<boolean>)>(null);
 const identity=useRef(workspace.identity),latestGuard=useRef(guard);
 useLayoutEffect(()=>{identity.current=workspace.identity;latestGuard.current=guard;},[workspace.identity,guard]);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;latestGuard.current?.setSaving(false);};},[]);
 function setPending(value:boolean){locked.current=value;setBusy(value);guard?.setSaving(value);}
 function markDirty(section:Section){dirty.current.add(section);guard?.setDirty(true);}
 async function save(change:WorkspaceChange,afterSave:'stay'|'next',confirmed?:(workspace:UnitWorkspace)=>void){
  if(locked.current||blocked||!workspace.capabilities.saveEnabled||!store)return {ok:false};
  const request={projectId:workspace.projectId,unitId:workspace.detail.unitId,identity:{...workspace.identity},returnTo,change,afterSave};
  const token=store.begin(request.projectId,request.unitId,request.identity);
  if(!token)return {ok:false};
  setPending(true);setMessage('');setRetryable(false);
  function apply(r:WorkspaceSaveResult){
   if(!mounted.current||!r.ok||identity.current.contractId!==request.identity.contractId||identity.current.customerId!==request.identity.customerId)return false;
   if(r.workspace.projectId!==request.projectId||r.workspace.detail.unitId!==request.unitId||r.workspace.identity.contractId!==request.identity.contractId||r.workspace.identity.customerId!==request.identity.customerId||!store!.commit(token!,r.row))return false;
   confirmed?.(r.workspace);dirty.current.delete(change.kind);guard?.setDirty(dirty.current.size>0);onRefreshed(r.workspace);
   setBlocked(false);setMessage('저장 결과를 확인했습니다.');setRetryable(false);pending.current=null;
   if(r.destination){guard?.setSaving(false);if(dirty.current.size)guard?.requestNavigation(r.destination);else guard?.navigateAfterSave(r.destination);}
   return true;
  }
  try {
   const {saveLedgerUnit,refreshLedgerUnit}=await import('@/app/projects/[projectId]/move-in/ledger/save-actions');
   const result=await saveLedgerUnit(request);
   if(!mounted.current)return {ok:false};
   if(result.ok){if(apply(result))return {ok:true};setBlocked(true);setMessage('현재 세대 또는 계약자가 변경되어 저장 결과를 반영하지 않았습니다. 상세를 다시 확인해 주세요.');return {ok:false};}
   if(result.committed!==false){
    setBlocked(true);
    setMessage(result.committed===true?'저장 요청 처리 후 최신 상태를 확인하지 못했습니다. 입력을 유지했습니다. 다시 저장하지 말고 결과를 재확인해 주세요.':'저장 여부를 확인하지 못했습니다. 입력을 유지했습니다. 중복 저장을 피하려면 상담 이력과 현재 상태를 먼저 확인해 주세요.');
    if(result.committed===true&&result.code==='refresh_failed'){
     pending.current=async()=>{const refreshed=await refreshLedgerUnit(request);return apply(refreshed.ok?{...refreshed,...(result.destination?{destination:result.destination}:{})}:refreshed);};setRetryable(true);
    }
   }
   return {ok:false};
  }catch{if(mounted.current){setBlocked(true);setMessage('저장 응답을 확인하지 못했습니다. 입력을 유지했습니다. 다시 저장하기 전에 현재 이력을 확인해 주세요.');}return {ok:false};}
  finally{if(mounted.current)setPending(false);}
 }
 async function retry(){
  if(locked.current||!pending.current)return;setPending(true);
  try{if(!await pending.current())setMessage('최신 상태를 확인하지 못했습니다. 원장과 입력을 변경하지 않았습니다.');}
  catch{if(mounted.current)setMessage('최신 상태를 확인하지 못했습니다. 입력을 유지했습니다.');}
  finally{if(mounted.current)setPending(false);}
 }
 return <Context.Provider value={workspace.capabilities.saveEnabled?{busy,blocked,markDirty,save}:null}>
  {children}
  {message?<p role="status" className="px-4 py-2 text-sm">{message}</p>:null}
  {retryable?<button type="button" disabled={busy} onClick={()=>void retry()} className="m-4 border px-3 py-1">저장 결과 다시 확인</button>:null}
 </Context.Provider>;
}
