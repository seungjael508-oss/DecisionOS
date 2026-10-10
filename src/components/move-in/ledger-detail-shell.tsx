'use client';
import {useEffect,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {buildWorkspaceSelectionHref,orderedIdsFromLoadedLedger,parseWorkspaceContext,resolveWorkspaceAdjacentIds} from '@/lib/move-in/ledger-context';
import {observeLedgerHistory} from '@/lib/move-in/ledger-selection-url';
import {UnitDetailWorkspace,type UnitDetailWorkspaceHandle} from './unit-detail-workspace';
import {UnitDetailPanel} from './unit-detail-panel';
import {LedgerReadyRowInteraction} from './ledger-ready-row-interaction';
import {useLedgerSummaryStore} from './ledger-summary-store';
import type {UnitWorkspaceResult,UnitWorkspaceSectionResult} from '@/lib/move-in/unit-workspace-types';

type ContextIds={query:string;ids:string[]};
export function LedgerDetailShell({projectId,children}:{projectId:string;children:ReactNode}){
 const base=`/projects/${projectId}/move-in/ledger`;
 const [href,setHref]=useState(base),[result,setResult]=useState<UnitWorkspaceResult|null>(null),[context,setContext]=useState<ContextIds|null>(null);
 const [mobile,setMobile]=useState(false),[checking,setChecking]=useState(false),[contextBusy,setContextBusy]=useState(false);
 const [navigationError,setNavigationError]=useState('');
 const [verificationError,setVerificationError]=useState('');
 const recheckIdentity=useRef<()=>void>(()=>{});
 const listRef=useRef<HTMLDivElement>(null),panelRef=useRef<HTMLElement>(null),guard=useRef<UnitDetailWorkspaceHandle>(null);
 const returnFocus=useRef<HTMLElement|null>(null),generation=useRef(0),allowHistory=useRef(false),activeHref=useRef(base),restoreAnchor=useRef(false);
 const requests=useRef(new Set<AbortController>());
 const parsed=parseWorkspaceContext(projectId,href),selected=parsed.state.selectedUnitId,returnTo=parsed.returnTo;
 const latest=useRef({selected,returnTo});
 useLayoutEffect(()=>{latest.current={selected,returnTo};},[selected,returnTo]);
 const validResult=result?.kind==='ok'&&result.workspace.detail.unitId===selected?result:null;
 const ordered=context?.query===returnTo?context.ids:null;
 const adjacent=ordered&&selected?resolveWorkspaceAdjacentIds(ordered,selected):null;
 const selectHref=(id:string|null)=>buildWorkspaceSelectionHref(projectId,latest.current.returnTo,id);
 function commit(destination:string){
  const target=parseWorkspaceContext(projectId,destination);if(!target.valid)return;
  allowHistory.current=true;history.pushState(null,'',destination);allowHistory.current=false;
  // The protected list already restores its local filter state on popstate.
  window.dispatchEvent(new PopStateEvent('popstate',{state:history.state}));
 }
 const ledgerStore=useLedgerSummaryStore();
 // 이미 받은 851세대 원장으로 이전·다음 순서를 계산한다. 서버 /context는 원장 전체를 DB에서 다시 읽어 5초 이상 걸린다.
 // 순서는 접근 권한이 아니다: 실제 세대 열람은 /unit/{id}가 서버에서 권한·현재 계약자를 매번 검증한다.
 async function contextIds(query:string,signal:AbortSignal):Promise<string[]|null>{
  const loaded=orderedIdsFromLoadedLedger(projectId,query,ledgerStore?.snapshot()??null);if(loaded)return loaded;
  const response=await fetch(`${base}/context?returnTo=${encodeURIComponent(query)}`,{signal,cache:'no-store'});
  const data=await response.json();return response.ok&&data.kind==='ok'&&Array.isArray(data.orderedIds)?data.orderedIds:null;
 }
 async function navigate(destination:string){
  if(destination.endsWith('#previous')||destination.endsWith('#next')){
   const direction=destination.endsWith('#previous')?'previous':'next',current=latest.current.selected,query=latest.current.returnTo,version=generation.current;
   if(!current)return false;const abort=new AbortController();requests.current.add(abort);setContextBusy(true);setNavigationError('');
   try{const ids=await contextIds(query,abort.signal);if(abort.signal.aborted||version!==generation.current||query!==latest.current.returnTo)return false;
    if(!ids)throw new Error('context unavailable');setContext({query,ids});const next=resolveWorkspaceAdjacentIds(ids,current);
    if(!next.currentFound){setNavigationError('현재 세대가 필터 결과에 없습니다. 목록에서 다시 선택해 주세요.');return false;}
    if(next[direction])commit(buildWorkspaceSelectionHref(projectId,query,next[direction]));
    else if(direction==='next')commit(`${query}${query.includes('?')?'&':'?'}moveInNotice=last`);
    else return false;
    return true;
   }catch{if(version===generation.current)setNavigationError('이전·다음 세대 목록을 불러오지 못했습니다. 입력을 유지한 채 다시 시도해 주세요.');return false;}
   finally{requests.current.delete(abort);if(version===generation.current)setContextBusy(false);}
  }
  commit(destination);return true;
 }
 function request(destination:string){if(guard.current)guard.current.requestNavigation(destination);else void navigate(destination);}
 useEffect(()=>{
  const media=window.matchMedia('(max-width: 1099px)');const change=()=>setMobile(media.matches);change();media.addEventListener('change',change);
  let initial=true;
  const stop=observeLedgerHistory(next=>{
   const prior=parseWorkspaceContext(projectId,activeHref.current).state.selectedUnitId;
   const nextSelected=parseWorkspaceContext(projectId,next).state.selectedUnitId;
   if(prior!==nextSelected){setResult(null);setContext(null);setChecking(false);setContextBusy(!!nextSelected);setNavigationError('');setVerificationError('');}
   activeHref.current=next;
   if(initial){restoreAnchor.current=!!new URL(next,location.origin).searchParams.get('selectedUnit')||!!new URL(next,location.origin).searchParams.get('unitAnchor');initial=false;}
   setHref(next);
  },next=>{
   if(allowHistory.current)return true;
   const prior=new URL(activeHref.current,location.origin).searchParams.get('selectedUnit'),after=new URL(next,location.origin).searchParams.get('selectedUnit');
   if(prior!==after&&guard.current?.isDirty()){guard.current.requestNavigation(next);return false;}return true;
  });
  return()=>{stop();media.removeEventListener('change',change);};
 },[projectId]);
 useEffect(()=>{
  const version=++generation.current;
  if(!selected)return;
  const abort=new AbortController(),activeRequests=requests.current;activeRequests.add(abort);
  void (async()=>{
   try{const response=await fetch(`${base}/unit/${encodeURIComponent(selected)}`,{signal:abort.signal,cache:'no-store'});const data:UnitWorkspaceResult=await response.json();
    if(abort.signal.aborted||version!==generation.current)return;
    if(data.kind==='ok'&&(data.workspace.projectId!==projectId||data.workspace.detail.unitId!==selected)){setResult({kind:'unavailable'});return;}
    setResult(data);
   }catch{if(!abort.signal.aborted&&version===generation.current)setResult({kind:'unavailable'});}
  })();
  const query=latest.current.returnTo;
  void contextIds(query,abort.signal).then(ids=>{if(!abort.signal.aborted&&version===generation.current&&query===latest.current.returnTo)setContext(ids?{query,ids}:null);}).catch(()=>{}).finally(()=>{if(!abort.signal.aborted&&version===generation.current)setContextBusy(false);});
  return()=>{abort.abort();activeRequests.delete(abort);};
 // URL filters alone never trigger requests: only selected identity does.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[selected,projectId]);
 useEffect(()=>{
  if(!validResult)return;
  const workspace=validResult.workspace;
  let attempt=0;
  function recheck(){
   const version=generation.current,check=++attempt,abort=new AbortController();requests.current.add(abort);setChecking(true);setVerificationError('');
   const params=new URLSearchParams({...workspace.identity,section:'identity'});
   void fetch(`${base}/unit/${workspace.detail.unitId}?${params}`,{signal:abort.signal,cache:'no-store'}).then(r=>r.json()).then((r:UnitWorkspaceSectionResult)=>{
    if(abort.signal.aborted||version!==generation.current||check!==attempt)return;
    if(r.kind==='retryable')throw new Error('identity temporarily unavailable');
    if(r.kind!=='identity'||r.identity.contractId!==workspace.identity.contractId||r.identity.customerId!==workspace.identity.customerId)setResult({kind:'stale'});
   }).catch(()=>{if(!abort.signal.aborted&&version===generation.current&&check===attempt)setVerificationError('현재 계약자를 확인하지 못했습니다. 입력은 보존되어 있으며 재확인 후 표시됩니다.');}).finally(()=>{requests.current.delete(abort);if(!abort.signal.aborted&&version===generation.current&&check===attempt)setChecking(false);});
  }
  recheckIdentity.current=recheck;
  const visible=()=>{if(document.visibilityState==='visible')recheck();};
  window.addEventListener('focus',recheck);document.addEventListener('visibilitychange',visible);
  return()=>{attempt++;recheckIdentity.current=()=>{};window.removeEventListener('focus',recheck);document.removeEventListener('visibilitychange',visible);};
 },[validResult,base]);
 useEffect(()=>{const active=requests.current;return()=>active.forEach(c=>c.abort());},[]);
 useLayoutEffect(()=>{
  if(selected){panelRef.current?.focus({preventScroll:true});return;}
  const button=returnFocus.current;if(button?.isConnected)button.focus({preventScroll:true});else listRef.current?.focus({preventScroll:true});
 },[selected]);
 useEffect(()=>{
  if(!restoreAnchor.current)return;
  const unit=selected||new URL(href,location.origin).searchParams.get('unitAnchor');
  const anchor=unit?document.getElementById(`ledger-unit-${unit}`):null;
  if(anchor){anchor.scrollIntoView({block:'nearest'});restoreAnchor.current=false;}
 },[href,selected,result]);
 useEffect(()=>{
  if(!mobile||!selected||!panelRef.current)return;
  const changed:{element:HTMLElement;inert:boolean}[]=[];
  let child:HTMLElement=panelRef.current;
  while(child.parentElement){for(const sibling of child.parentElement.children)if(sibling!==child&&sibling instanceof HTMLElement){changed.push({element:sibling,inert:sibling.hasAttribute('inert')});sibling.setAttribute('inert','');}child=child.parentElement;if(child===document.body)break;}
  const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
  return()=>{changed.forEach(({element,inert})=>{if(!inert)element.removeAttribute('inert');});document.body.style.overflow=overflow;};
 },[mobile,selected]);
 useEffect(()=>{
  const before=(event:BeforeUnloadEvent)=>{if(guard.current?.isDirty()){event.preventDefault();event.returnValue='';}};
  window.addEventListener('beforeunload',before);return()=>window.removeEventListener('beforeunload',before);
 },[]);
 return <div className="ledger-detail-shell" data-detail-open={selected?'true':undefined} onClickCapture={event=>{
   const target=event.target as HTMLElement,row=target.closest<HTMLElement>('tr[data-unit-id]');
   if(!row||!listRef.current?.contains(row))return;
   event.preventDefault();returnFocus.current=row.querySelector<HTMLElement>('[data-ledger-select]')??row;
   request(selectHref(row.dataset.unitId!));
  }}>
  <div ref={listRef} data-ledger-list tabIndex={-1} className="min-w-0 flex-1">{children}</div>
  <LedgerReadyRowInteraction root={listRef}/>
  {selected?<aside ref={panelRef} tabIndex={-1} role={mobile?'dialog':'region'} aria-modal={mobile?'true':undefined} aria-label="세대 상세" className="ledger-detail-panel" onKeyDown={event=>{
   if(event.key==='Escape'){event.preventDefault();request(returnTo);}
   if(mobile&&event.key==='Tab'){
    const elements=[...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,a[href]')].filter(el=>!el.closest('[hidden]')&&(!el.closest('details:not([open])')||el.tagName==='SUMMARY'));
    const at=elements.indexOf(document.activeElement as HTMLElement);
    if(event.shiftKey&&at<=0){event.preventDefault();elements.at(-1)?.focus();}else if(!event.shiftKey&&(at===elements.length-1||at===-1)){event.preventDefault();elements[0]?.focus();}
   }
  }}>
   <UnitDetailWorkspace key={selected} controllerRef={guard} returnTo={returnTo} previousHref={adjacent&&!adjacent.previous?null:`${returnTo}#previous`} nextHref={`${returnTo}#next`} onNavigate={navigate} navigationPending={contextBusy}>
    {navigationError?<p role="alert">{navigationError}</p>:null}
    {verificationError?<div><p role="alert">{verificationError}</p><button type="button" onClick={()=>recheckIdentity.current()}>현재 계약자 다시 확인</button></div>:null}
    {checking?<p role="status">현재 계약자를 다시 확인하고 있습니다…</p>:null}
    {!result?<div role="status" aria-label="세대 상세 로딩" className="animate-pulse p-6">세대 상세를 불러오고 있습니다…</div>:null}
    {result&&!validResult?<p role="alert" className="p-6">{result.kind==='stale'?'현재 계약자가 변경되었습니다. 상세를 닫고 다시 열어 주세요.':'세대 또는 접근 권한을 확인할 수 없습니다.'}</p>:null}
    {validResult?<div hidden={checking||!!verificationError}><UnitDetailPanel workspace={validResult.workspace} returnTo={returnTo} onInvalidated={()=>setResult({kind:'stale'})} onRelatedSelect={unitId=>request(selectHref(unitId))} onRefreshed={workspace=>{if(workspace.projectId===projectId&&workspace.detail.unitId===latest.current.selected)setResult({kind:'ok',workspace});}}/></div>:null}
   </UnitDetailWorkspace>
  </aside>:null}
 </div>;
}
