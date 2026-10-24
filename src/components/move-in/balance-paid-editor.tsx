'use client';
import {useRef,useState,type FormEvent} from 'react';
import {useUnitSave} from './unit-save-context';
import {BalancePaidBadge} from './ledger-badges';
import {MOVE_IN_STATUS_LABELS,type MoveInStatus} from '@/lib/move-in/labels';

const seoulDay=(value:string|null)=>value?new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date(value)):'';

/**
 * 관리자 전용 잔금완납 지정·완납일 수정·해제. 저장되면 원장 행이 갱신되어 연두색 강조가 바로 바뀐다.
 * 권한(PROJECT_ADMIN)·현재 계약은 서버가 다시 검증한다. 입주완료 세대는 상태를 낮추지 않고 완납일만 바꾼다.
 */
export function BalancePaidEditor({projectId,unitId,customerId,contractId,moveIn,balancePaidAt,remainder,saveDisabled=false}:{
 projectId:string;unitId:string;customerId:string;contractId:string;moveIn:MoveInStatus;balancePaidAt:string|null;remainder:string|null;saveDisabled?:boolean;
}){
 const saving=useUnitSave(),submitting=useRef(false);
 const [pending,setPending]=useState(false),[error,setError]=useState<string|null>(null);
 const paid=moveIn==='BALANCE_PAID'||Boolean(balancePaidAt),today=seoulDay(new Date().toISOString());
 async function submit(paidOn:string,form:HTMLFormElement){
  if(saveDisabled||submitting.current||!saving||saving.busy||saving.blocked)return;
  const reason=String(new FormData(form).get('reason')??'').trim();
  if(!reason){setError('변경 사유를 입력해 주세요.');return;}
  if(paidOn&&(paidOn>today)){setError('잔금 완납일을 오늘 이전 날짜로 입력해 주세요.');return;}
  submitting.current=true;setPending(true);setError(null);
  try{
   const result=await saving.save({kind:'balancePaid',input:{projectId,unitId,customerId,contractId,paidOn,reason}},'stay');
   if(!result.ok)setError('저장 결과를 확인하지 못했습니다. 화면 안내에 따라 다시 확인해 주세요.');
  }finally{submitting.current=false;setPending(false);}
 }
 function onSubmit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  const paidOn=String(new FormData(event.currentTarget).get('paid_on')??'');
  if(!paidOn){setError('잔금 완납일을 입력해 주세요.');return;}
  void submit(paidOn,event.currentTarget);
 }
 const disabled=saveDisabled||pending||!saving||saving.busy||saving.blocked;
 return <section className={`mt-6 border p-4 ${paid?'border-green-300 border-l-[3px] border-l-green-500 bg-green-50':'border-neutral-300'}`} aria-labelledby={`balance-paid-${unitId}`}>
  <h2 id={`balance-paid-${unitId}`} className="flex flex-wrap items-center gap-2 text-lg font-semibold">잔금완납 (관리자)
   {paid?<BalancePaidBadge remainder={remainder}/>:null}
  </h2>
  <p className="mt-1 text-sm text-neutral-700">현재: {MOVE_IN_STATUS_LABELS[moveIn]}{balancePaidAt?` · 완납일 ${seoulDay(balancePaidAt)}`:' · 완납일 없음'}</p>
  {moveIn==='MOVED_IN'?<p className="mt-1 text-xs text-neutral-600">입주완료 세대는 입주진행을 유지하고 완납일만 바꿉니다.</p>:null}
  <form key={`${moveIn}:${balancePaidAt??''}`} className="mt-3 flex flex-col gap-2" onSubmit={onSubmit} onChange={()=>saving?.markDirty('balancePaid')}>
   <label className="flex flex-col text-sm">잔금 완납일
    <input type="date" name="paid_on" max={today} defaultValue={seoulDay(balancePaidAt)} className="border px-2 py-1"/>
   </label>
   <label className="flex flex-col text-sm">변경 사유
    <input type="text" name="reason" maxLength={200} placeholder="예: 10/21 입주현황 검증, 은행 입금 확인" className="border px-2 py-1"/>
   </label>
   <div className="flex flex-wrap gap-2">
    <button type="submit" disabled={disabled} className="border border-green-700 bg-green-100 px-3 py-1 text-green-800">{pending?'저장 중…':paid?'완납일 수정':'잔금완납 지정'}</button>
    {paid?<button type="button" disabled={disabled} onClick={e=>{const form=e.currentTarget.form;if(form)void submit('',form);}} className="border border-neutral-700 px-3 py-1">잔금완납 해제</button>:null}
   </div>
  </form>
  {error?<p role="alert" className="mt-2 text-sm text-red-700">{error}</p>:null}
 </section>;
}
