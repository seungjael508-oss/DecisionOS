'use client';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {UnitSaveProvider,useUnitSave} from './unit-save-context';
import {ConsultationCreateForm} from './consultation-create-form';
import {ConsultationHistory} from './consultation-history';
import {CustomerPhone} from './customer-phone';
import {OccupancyStatusCards} from './occupancy-status-cards';
import {PaymentSummaryCard} from './payment-summary-card';
import {SpecialCaseEditor} from './special-case-editor';
import {DealEditor} from './deal-editor';
import {useUnitDetailWorkspace} from './unit-detail-workspace';
import {formatDateTime,formatUnitLabel,OCCUPANCY_INTENT_LABELS,OPERATIONAL_INTENT_LABELS} from '@/lib/move-in/labels';
import {SPECIAL_REASON_LABELS} from '@/lib/move-in/intent';
import type {UnitWorkspace,UnitWorkspaceSectionResult} from '@/lib/move-in/unit-workspace-types';
import type {BrokerageOfficeOption} from '@/lib/move-in/brokerages';
import type {RelatedHolderUnit} from '@/lib/move-in/queries';
const sourceLabels:Record<string,string>={ASEL:'아셀',INVESTOR:'투자',DELINQUENT:'연체',ONLINE:'온라인매물'};
const reasons:Record<string,string>={...SPECIAL_REASON_LABELS,...sourceLabels};
type PanelProps={workspace:UnitWorkspace;returnTo:string;onInvalidated:()=>void;onRelatedSelect:(unitId:string)=>void;onRefreshed?:(w:UnitWorkspace)=>void};
export function UnitDetailPanel(props:PanelProps){return <UnitSaveProvider workspace={props.workspace} returnTo={props.returnTo} onRefreshed={props.onRefreshed??(()=>{})}><UnitDetailPanelContent {...props}/></UnitSaveProvider>;}
function UnitDetailPanelContent({workspace,returnTo,onInvalidated,onRelatedSelect}:PanelProps){
 const saving=useUnitSave();
 const {detail,snapshot,capabilities}=workspace,guard=useUnitDetailWorkspace();
 const [history,setHistory]=useState(workspace.history),[offices,setOffices]=useState<BrokerageOfficeOption[]|null>(null),[deal,setDeal]=useState(workspace.deal),[related,setRelated]=useState<RelatedHolderUnit[]|null>(null);
 const [pending,setPending]=useState<string[]>([]),[error,setError]=useState('');const activeSections=useRef(new Set<string>());const requests=useRef(new Map<AbortController,string>());
 const [retrySection,setRetrySection]=useState<'brokers'|'history'|'related'|null>(null);
 const [historySource,setHistorySource]=useState(workspace.history);
 const [dealSource,setDealSource]=useState(workspace.deal);
 if(dealSource!==workspace.deal){setDealSource(workspace.deal);setDeal(workspace.deal);}
 if(historySource!==workspace.history){setHistorySource(workspace.history);setHistory(workspace.history);setPending(current=>current.filter(section=>section!=='history'));}
 useLayoutEffect(()=>{const active=requests.current,sections=activeSections.current;return()=>{active.forEach((section,c)=>{if(section==='history'){c.abort();active.delete(c);}});sections.delete('history');};},[workspace.history]);
 useEffect(()=>{const active=requests.current;return()=>{active.forEach((_section,c)=>c.abort());active.clear();};},[]);
 async function load(section:'brokers'|'history'|'related'){
  if(activeSections.current.has(section))return;activeSections.current.add(section);const control=new AbortController();requests.current.set(control,section);setPending([...activeSections.current]);setError('');setRetrySection(null);
  const params=new URLSearchParams({...workspace.identity,section,offset:String(section==='history'?history.nextOffset??0:0)});
  try{
   const response=await fetch(`/projects/${workspace.projectId}/move-in/ledger/unit/${detail.unitId}?${params}`,{signal:control.signal,cache:'no-store'});
   const result:UnitWorkspaceSectionResult=await response.json();if(control.signal.aborted)return;
   if(result.kind==='retryable')throw new Error('section temporarily unavailable');
   if(result.kind==='stale'||result.kind==='unavailable'){onInvalidated();return;}
   if(result.kind==='history')setHistory(current=>({rows:[...new Map([...current.rows,...result.history.rows].map(row=>[row.id,row])).values()],nextOffset:result.history.nextOffset}));
   if(result.kind==='brokers'){setOffices(result.offices);setDeal(result.deal);}
   if(result.kind==='related')setRelated(result.units);
  }catch{if(!control.signal.aborted){setError('추가 정보를 불러오지 못했습니다. 다시 시도해 주세요.');setRetrySection(section);}}
  finally{requests.current.delete(control);if(!control.signal.aborted){activeSections.current.delete(section);setPending([...activeSections.current]);}}
 }
 const intentLabel=snapshot.effectiveIntent==='RENT'?(snapshot.rentalType?OCCUPANCY_INTENT_LABELS[snapshot.rentalType]:'임대(유형 확인 필요)'):OPERATIONAL_INTENT_LABELS[snapshot.effectiveIntent];
 return <div className="p-4" onChangeCapture={()=>{if(!saving)guard?.setDirty(true);}}>
  <h1 className="text-2xl font-semibold">{formatUnitLabel(detail.buildingNo,detail.unitNo)} · {detail.unitType?.trim()||'타입 미등록'} · {detail.customerName??'계약자 미등록'} · {snapshot.currentGrade?`${snapshot.currentGrade}등급`:'등급 미등록'}</h1>
  <dl className="mt-4 grid grid-cols-[7rem_1fr] gap-2 text-sm"><dt>전화번호</dt><dd><CustomerPhone raw={detail.customerPhone} status={detail.phoneQuality}/></dd><dt>계약자 주소</dt><dd>{detail.contractAddress||'미등록'}</dd><dt>현재등급</dt><dd>{snapshot.currentGrade??'미등록'}</dd><dt>최근접촉</dt><dd>{formatDateTime(detail.occupancy?.last_contact_at??null)}</dd><dt>다음접촉</dt><dd>{formatDateTime(detail.occupancy?.next_contact_at??null)}</dd></dl>
  <div aria-label="관리 태그" className="mt-3 flex flex-wrap gap-2">
   {snapshot.effectiveIntent==='MOVE_IN'?<span className="border px-2">입주</span>:null}
   {snapshot.effectiveIntent==='SALE_TRANSFER'?<span className="border px-2">전매</span>:null}
   {snapshot.sourceTags.map(tag=><span key={tag} className="border px-2">{sourceLabels[tag]}</span>)}
   {snapshot.specialReasons.length?<span className="border px-2">특별관리</span>:null}
  </div>
  <OccupancyStatusCards occupancy={detail.occupancy} intentLabel={intentLabel}/>
  {!capabilities.saveEnabled?<p className="mt-4 text-sm text-neutral-700" role="note">현재 이 상세에서는 조회와 입력 확인만 가능합니다. 원장 내 저장은 아직 지원하지 않습니다.</p>:null}
  <fieldset disabled={!capabilities.fieldWrite||saving?.busy||saving?.blocked}>
   <ConsultationCreateForm projectId={workspace.projectId} unitId={detail.unitId} customerId={workspace.identity.customerId} returnTo={returnTo} currentFundingStatus={snapshot.funding} currentOperationalIntent={snapshot.operationalIntent} currentOccupancyIntent={snapshot.occupancyIntent} saveDisabled={!capabilities.saveEnabled||saving?.busy||saving?.blocked}/>
  </fieldset>
  <details className="mt-6" onToggle={e=>{if(e.currentTarget.open&&offices===null)void load('brokers');}}><summary className="cursor-pointer font-semibold">매매/임대</summary>
   {offices===null?<p role="status">중개업소 정보를 불러오고 있습니다…</p>:<fieldset disabled={!capabilities.fieldWrite||saving?.busy||saving?.blocked}><DealEditor projectId={workspace.projectId} unitId={detail.unitId} contractId={workspace.identity.contractId} customerId={workspace.identity.customerId} deal={deal} offices={offices} saveDisabled={!capabilities.saveEnabled||saving?.busy||saving?.blocked}/></fieldset>}
  </details>
  <SpecialCaseEditor projectId={workspace.projectId} unitId={detail.unitId} contractId={workspace.identity.contractId} currentCustomerId={workspace.identity.customerId} returnTo={returnTo} role={capabilities.role} reasons={snapshot.specialReasons.map(r=>reasons[r]??r)} specialCase={workspace.special} saveDisabled={!capabilities.saveEnabled||saving?.busy||saving?.blocked}/>
  <PaymentSummaryCard occupancy={null} projection={workspace.payment??null}/>
  <section className="mt-8" aria-label="상담/콜 이력"><h2 className="mb-3 text-lg font-semibold">상담/콜 이력</h2><ConsultationHistory rows={history.rows} currentMemberId={capabilities.memberId}/>
   {history.nextOffset!==null?<button type="button" disabled={pending.includes('history')} onClick={()=>void load('history')} className="mt-3 border px-3 py-1">이력 더 보기</button>:null}</section>
  <details className="mt-6" onToggle={e=>{if(e.currentTarget.open&&related===null)void load('related');}}><summary className="cursor-pointer">동일 계약자의 다른 보유세대</summary>
   {related===null?<p>불러오는 중…</p>:related.length?related.map(u=><button type="button" key={u.unitId} onClick={()=>onRelatedSelect(u.unitId)} className="m-2 border p-2">{formatUnitLabel(u.buildingNo,u.unitNo)}</button>):<p>다른 보유세대가 없습니다.</p>}</details>
  {error?<p role="alert">{error}</p>:null}
  {retrySection?<button type="button" onClick={()=>void load(retrySection)}>추가 정보 다시 시도</button>:null}
 </div>;
}
