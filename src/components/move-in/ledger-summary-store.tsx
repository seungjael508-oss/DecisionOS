'use client';
import type {LedgerSummaryRow,ProjectionResult} from '@/lib/move-in/ledger-types';
import type {WorkspaceIdentity} from '@/lib/move-in/unit-workspace-types';
import {createContext,useContext,useLayoutEffect,useState,useSyncExternalStore,type ReactNode} from 'react';
type Result=ProjectionResult<LedgerSummaryRow>;
type Token={projectId:string;unitId:string;identity:WorkspaceIdentity;generation:number;sequence:number};
export function createLedgerSummaryStore(){
 let project:string|null=null,base:Result|null=null,result:Result|null=null,generation=0;
 const sequences=new Map<string,number>(),listeners=new Set<()=>void>();
 const emit=()=>listeners.forEach(fn=>fn());
 return {
  bind(p:string,b:Result){if(project===p&&base===b)return;project=p;base=b;result=b;generation++;sequences.clear();emit();},
  matches(p:string,b:Result){return project===p&&base===b;},
  begin(p:string,u:string,i:WorkspaceIdentity):Token|null{
   const r=result?.rows.find(r=>r.unitId===u&&r.projectId===p);
   if(p!==project||!r||r.currentContractId!==i.contractId||r.currentCustomerId!==i.customerId)return null;
   const sequence=(sequences.get(u)??0)+1;sequences.set(u,sequence);return {projectId:p,unitId:u,identity:{...i},generation,sequence};
  },
  commit(t:Token,row:LedgerSummaryRow){
   if(!result||t.generation!==generation||t.projectId!==project||sequences.get(t.unitId)!==t.sequence||row.projectId!==t.projectId||row.unitId!==t.unitId||row.currentContractId!==t.identity.contractId||row.currentCustomerId!==t.identity.customerId)return false;
   const current=result.rows.find(r=>r.unitId===t.unitId);
   if(!current||current.currentContractId!==t.identity.contractId||current.currentCustomerId!==t.identity.customerId)return false;
   sequences.set(t.unitId,t.sequence+1);
   result={...result,rows:result.rows.map(r=>r.unitId===t.unitId?row:r)};emit();return true;
  },
  snapshot:()=>result,
  subscribe(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn);};},
 };
}
const Context=createContext<ReturnType<typeof createLedgerSummaryStore>|null>(null);
export function LedgerSummaryProvider({children}:{children:ReactNode}){
 const [store]=useState(createLedgerSummaryStore);return <Context.Provider value={store}>{children}</Context.Provider>;
}
export const useLedgerSummaryStore=()=>useContext(Context);
const emptySubscribe=()=>()=>{};
const emptySnapshot=()=>null;
export function useLedgerSummaryResult(projectId:string,initialResult:Result){
 const store=useLedgerSummaryStore();
 const result=useSyncExternalStore(store?.subscribe??emptySubscribe,store?.snapshot??emptySnapshot,emptySnapshot);
 useLayoutEffect(()=>{store?.bind(projectId,initialResult);},[store,projectId,initialResult]);
 return store?.matches(projectId,initialResult)&&result?result:initialResult;
}
