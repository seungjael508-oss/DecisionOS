'use server';
import {verifyUnitWorkspaceIdentity,loadUnitWorkspace} from '@/lib/move-in/unit-workspace.server';
import {createMoveInConsultation,saveMoveInBalancePaid,saveMoveInTradeFunding} from '@/app/projects/[projectId]/move-in/units/[unitId]/actions';
import {saveMoveInUnitDeal,saveMoveInSpecialCase} from '@/app/projects/[projectId]/move-in/deals/actions';
import {loadLedgerWorkspace} from '@/lib/move-in/ledger-workspace.server';
import {parseWorkspaceContext,resolveWorkspaceAdjacentIds,buildWorkspaceSelectionHref} from '@/lib/move-in/ledger-context';
import {applyLedgerQuery} from '@/lib/move-in/ledger-filters';
import type {WorkspaceSaveRequest,WorkspaceSaveIdentity,WorkspaceSaveResult} from '@/lib/move-in/workspace-save';

/** Read only. A failed confirmation must never cause the write to be replayed. */
export async function refreshLedgerUnit(request:WorkspaceSaveIdentity):Promise<WorkspaceSaveResult>{
 try {
  const checked=await verifyUnitWorkspaceIdentity(request.projectId,request.unitId,request.identity);
  if(!checked.ok)return {ok:false,code:'stale_contract',committed:true};
  const loaded=await loadUnitWorkspace(request.projectId,request.unitId,checked.access,{summary:true,saving:true});
  if(loaded.kind!=='ok')return {ok:false,code:loaded.kind==='stale'?'stale_contract':'refresh_failed',committed:true};
  const w=loaded.workspace,row=w.summary;
  if(w.identity.contractId!==request.identity.contractId||w.identity.customerId!==request.identity.customerId||!row||row.projectId!==request.projectId||row.unitId!==request.unitId||row.currentContractId!==request.identity.contractId||row.currentCustomerId!==request.identity.customerId)return {ok:false,code:'stale_contract',committed:true};
  return {ok:true,workspace:w,row};
 }catch{return {ok:false,code:'refresh_failed',committed:true};}
}

export async function saveLedgerUnit(request:WorkspaceSaveRequest):Promise<WorkspaceSaveResult>{
 let attempted=false;
 try {
  const {projectId,unitId,identity,change}=request;
  if(!change||!['consultation','deal','special','tradeFunding','balancePaid'].includes(change.kind)||!identity||!['stay','next'].includes(request.afterSave))return {ok:false,code:'invalid_input',committed:false};
  const input=change.input;
  if(!input||input.projectId!==projectId||input.unitId!==unitId||
   (change.kind==='special'?change.input.currentCustomerId!==identity.customerId:change.input.customerId!==identity.customerId)||
   (change.kind!=='consultation'&&change.input.contractId!==identity.contractId))return {ok:false,code:'invalid_input',committed:false};
  const context=parseWorkspaceContext(projectId,request.returnTo);
  if(!context.valid)return {ok:false,code:'invalid_input',committed:false};
  let destination:string|undefined;
  if(request.afterSave==='next'){
   const list=await loadLedgerWorkspace(projectId);if(!list.ok)return {ok:false,code:'context_failed',committed:false};
   const ids=applyLedgerQuery(list.result.rows,context.state,new Date(list.result.snapshotAsOf)).filteredSorted.map(r=>r.unitId);
   const adjacent=resolveWorkspaceAdjacentIds(ids,unitId);
   if(!adjacent.currentFound)return {ok:false,code:'context_failed',committed:false};
   destination=adjacent.next?buildWorkspaceSelectionHref(projectId,context.returnTo,adjacent.next):`${context.returnTo}${context.returnTo.includes('?')?'&':'?'}moveInNotice=last`;
  }
  // This read follows navigation/context reads, immediately before the existing atomic RPC path.
  const checked=await verifyUnitWorkspaceIdentity(projectId,unitId,identity);
  if(!checked.ok)return {ok:false,code:'stale_contract',committed:false};
  if(change.kind==='special'&&!['PROJECT_ADMIN','CLIENT_MANAGER'].includes(checked.access.role))return {ok:false,code:'forbidden',committed:false};
  if(change.kind==='balancePaid'&&checked.access.role!=='PROJECT_ADMIN')return {ok:false,code:'forbidden',committed:false};
  attempted=true;
  const saved=change.kind==='consultation'
   ?await createMoveInConsultation({...change.input,expectedContractId:identity.contractId,returnTo:context.returnTo,afterSave:undefined})
   :change.kind==='deal'?await saveMoveInUnitDeal(change.input)
   :change.kind==='tradeFunding'?await saveMoveInTradeFunding(change.input)
   :change.kind==='balancePaid'?await saveMoveInBalancePaid(change.input):await saveMoveInSpecialCase({...change.input,returnTo:context.returnTo});
  // Legacy actions deliberately collapse transport and SQL failures. Treat an unconfirmed write as unknown, never auto-retry.
  if(!saved.ok)return {ok:false,code:'save_failed',committed:'unknown'};
  const refreshed=await refreshLedgerUnit(request);
  return {...refreshed,...(destination?{destination}:{})};
 }catch{return {ok:false,code:'save_failed',committed:attempted?'unknown':false};}
}
