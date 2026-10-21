'use client';
import {useRef,useState,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import {useUnitSave} from './unit-save-context';
import {saveMoveInTradeFunding} from '@/app/projects/[projectId]/move-in/units/[unitId]/actions';
import {TRADE_FUNDING_FOLLOW_UP,TRADE_FUNDING_STATUSES,TRADE_FUNDING_STATUS_LABELS,TRADE_FUNDING_TYPES,TRADE_FUNDING_TYPE_LABELS,isTradeFundingStatus,isTradeFundingType,type TradeFundingStatus,type TradeFundingType} from '@/lib/move-in/trade-funding';
import {formatDateTime} from '@/lib/move-in/labels';

/** C·D 매매/임대 자금조달 유형·분류 확인 상태(전매·전세·월세는 DealEditor). 권한·계약은 서버 RPC가 다시 검증한다. */
export function TradeFundingEditor({projectId,unitId,customerId,contractId,currentGrade,type,status,updatedAt,saveDisabled=false}:{
 projectId:string;unitId:string;customerId:string;contractId:string;currentGrade:string|null;
 type:TradeFundingType|null;status:TradeFundingStatus|null;updatedAt?:string|null;saveDisabled?:boolean;
}){
 const router=useRouter();
 const saving=useUnitSave(),submitting=useRef(false);
 const [pending,setPending]=useState(false),[error,setError]=useState<string|null>(null),[notice,setNotice]=useState<string|null>(null);
 async function onSubmit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(saveDisabled||submitting.current||saving?.busy||saving?.blocked)return;
  const form=new FormData(event.currentTarget);
  const raw=String(form.get('trade_funding_type')??''),rawStatus=String(form.get('trade_funding_status')??'');
  const tradeFundingType:TradeFundingType|''=isTradeFundingType(raw)?raw:'';
  // 분류 해제면 상태도 해제. 유형이 있으면 선택한 확인 상태(기본 상담 확인)
  const tradeFundingStatus:TradeFundingStatus|''=tradeFundingType?(isTradeFundingStatus(rawStatus)?rawStatus:'CONFIRMED'):'';
  const input={projectId,unitId,customerId,contractId,tradeFundingType,tradeFundingStatus};
  submitting.current=true;setPending(true);setError(null);setNotice(null);
  try{
   if(saving){
    const result=await saving.save({kind:'tradeFunding',input},'stay',()=>setError(null));
    if(!result.ok)setError('저장 결과를 확인하지 못했습니다. 화면 안내에 따라 다시 확인해 주세요.');
   }else{
    const result=await saveMoveInTradeFunding(input);
    if(!result.ok){setError(result.message);return;}
    setNotice(result.changed?'저장했습니다.':'변경 사항이 없습니다.');
    router.refresh();
   }
  }finally{submitting.current=false;setPending(false);}
 }
 const cd=currentGrade==='C'||currentGrade==='D';
 return <section className="mt-6 border border-neutral-300 p-4" aria-labelledby={`trade-funding-${unitId}`}>
  <h2 id={`trade-funding-${unitId}`} className="text-lg font-semibold">거래 자금유형</h2>
  <p className="mt-1 text-sm text-neutral-700">
   현재: {type?TRADE_FUNDING_TYPE_LABELS[type]:'분류 없음'}{status?` · ${TRADE_FUNDING_STATUS_LABELS[status]}`:''}{updatedAt?` · 수정 ${formatDateTime(updatedAt)}`:''}
  </p>
  {type?<p className="mt-1 text-sm">후속 확인: {status==='CANDIDATE'?'자금유형 후보 상담 확인 · ':''}{TRADE_FUNDING_FOLLOW_UP[type]}</p>:null}
  {!cd&&type?<p className="mt-1 text-xs text-neutral-600">현재 등급이 C·D가 아니어서 C·D 관리 집계에는 포함되지 않습니다(분류와 이력은 유지).</p>:null}
  <p className="mt-1 text-xs text-neutral-600">입주 자금·대출 진행(대출필요·대출승인 등)과 별개입니다. &apos;대출 후 잔금 납부·거래&apos;는 자금 마련 방식이며 승인 여부는 후속 확인 항목입니다. 전매·전세·월세는 매매/임대에서 복수 선택합니다.</p>
  <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={onSubmit} onChange={()=>saving?.markDirty('tradeFunding')}>
   <label className="flex flex-col text-sm">자금유형
    <select name="trade_funding_type" defaultValue={type??''} key={`${type??''}:${status??''}`} className="border px-2 py-1">
     <option value="">분류 없음(해제)</option>
     {TRADE_FUNDING_TYPES.map(value=><option key={value} value={value}>{TRADE_FUNDING_TYPE_LABELS[value]}</option>)}
    </select>
   </label>
   <label className="flex flex-col text-sm">분류 확인 상태
    <select name="trade_funding_status" defaultValue={status??'CONFIRMED'} key={`s:${type??''}:${status??''}`} className="border px-2 py-1">
     {TRADE_FUNDING_STATUSES.map(value=><option key={value} value={value}>{TRADE_FUNDING_STATUS_LABELS[value]}</option>)}
    </select>
   </label>
   <button type="submit" disabled={saveDisabled||pending||saving?.busy||saving?.blocked} className="border border-neutral-900 px-3 py-1">{pending?'저장 중…':'저장'}</button>
  </form>
  {error?<p role="alert" className="mt-2 text-sm text-red-700">{error}</p>:null}
  {notice?<p role="status" className="mt-2 text-sm text-neutral-700">{notice}</p>:null}
 </section>;
}
