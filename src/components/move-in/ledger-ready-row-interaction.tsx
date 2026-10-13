'use client';
import {useSyncExternalStore,type RefObject} from 'react';
import {useLedgerSummaryStore} from './ledger-summary-store';
import {LedgerRowInteraction} from './ledger-row-interaction';
const emptySubscribe=()=>()=>{};
const emptySnapshot=()=>null;
/** Streaming may expose server table markup before the frozen summary hydrates. */
export function LedgerReadyRowInteraction({root}:{root:RefObject<HTMLDivElement|null>}){
 const store=useLedgerSummaryStore();
 const result=useSyncExternalStore(store?.subscribe??emptySubscribe,store?.snapshot??emptySnapshot,emptySnapshot);
 return store&&!result?null:<LedgerRowInteraction root={root}/>;
}
