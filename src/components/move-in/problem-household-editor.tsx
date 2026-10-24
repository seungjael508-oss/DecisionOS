'use client';
import {useRef,useState,type FormEvent} from 'react';
import {useUnitSave} from './unit-save-context';
import {ProblemHouseholdBadges} from './ledger-badges';
import {PROBLEM_FLAGS,PROBLEM_FLAG_HINTS,PROBLEM_FLAG_LABELS,isProblemFlag,type ProblemFlag} from '@/lib/move-in/problem-household';

/**
 * 관리자 전용 문제세대 지정·해제·입주잠금 해제 승인. 저장되면 원장 행이 갱신되어 적색 표기가 바로 바뀐다.
 * 권한(PROJECT_ADMIN)·현재 계약은 서버가 다시 검증하고, 해제 승인 전 입주완료 처리는 DB 트리거가 막는다.
 */
export function ProblemHouseholdEditor({projectId,unitId,customerId,contractId,flags,lockReleased,note,saveDisabled=false}:{
 projectId:string;unitId:string;customerId:string;contractId:string;flags:readonly ProblemFlag[];lockReleased:boolean;note:string|null;saveDisabled?:boolean;
}){
 const saving=useUnitSave(),submitting=useRef(false);
 const [pending,setPending]=useState(false),[error,setError]=useState<string|null>(null);
 const [selected,setSelected]=useState<ProblemFlag[]>([...flags]),[source,setSource]=useState(flags);
 if(source!==flags){setSource(flags);setSelected([...flags]);}
 const problem=flags.length>0;
 async function submit(nextFlags:ProblemFlag[],released:boolean,form:HTMLFormElement){
  if(saveDisabled||submitting.current||!saving||saving.busy||saving.blocked)return;
  const data=new FormData(form),reason=String(data.get('reason')??'').trim(),memo=String(data.get('note')??'').trim();
  if(!reason){setError('변경 사유를 입력해 주세요.');return;}
  submitting.current=true;setPending(true);setError(null);
  try{
   const result=await saving.save({kind:'problemHousehold',input:{projectId,unitId,customerId,contractId,flags:nextFlags,lockReleased:released,note:memo,reason}},'stay');
   if(!result.ok)setError('저장 결과를 확인하지 못했습니다. 화면 안내에 따라 다시 확인해 주세요.');
  }finally{submitting.current=false;setPending(false);}
 }
 function onSubmit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  const data=new FormData(event.currentTarget);
  const next=data.getAll('flag').filter(isProblemFlag);
  if(!next.length&&!problem){setError('문제 사유를 하나 이상 선택해 주세요.');return;}
  // 분류를 바꾸면 해제 승인은 다시 받는다(같은 분류에서만 체크 값 유지)
  const same=next.length===flags.length&&next.every(f=>flags.includes(f));
  void submit(next,same&&data.get('lock_released')==='on',event.currentTarget);
 }
 const disabled=saveDisabled||pending||!saving||saving.busy||saving.blocked;
 const sameAsSaved=selected.length===flags.length&&selected.every(f=>flags.includes(f));
 return <section className={`mt-6 border p-4 ${problem?'border-red-300 border-l-[3px] border-l-red-600 bg-red-50':'border-neutral-300'}`} aria-labelledby={`problem-household-${unitId}`}>
  <h2 id={`problem-household-${unitId}`} className="flex flex-wrap items-center gap-2 text-lg font-semibold">문제세대 (관리자)
   <ProblemHouseholdBadges flags={flags} released={lockReleased}/>
  </h2>
  <p className="mt-1 text-sm text-neutral-700">{problem?(lockReleased?'관리자 해제 승인됨 — 적색 표기는 유지되고 입주완료 처리가 가능합니다.':'입주잠금 — 잔금완납이어도 입주완료(입주증 발급·이사 승인) 처리가 차단됩니다.'):'지정된 문제 사유가 없습니다.'}</p>
  <form key={`${flags.join(',')}:${lockReleased}:${note??''}`} className="mt-3 flex flex-col gap-2" onSubmit={onSubmit} onChange={()=>saving?.markDirty('problemHousehold')}>
   <fieldset className="flex flex-col gap-1 text-sm"><legend className="mb-1">문제 사유 (복수 선택)</legend>
    {PROBLEM_FLAGS.map(flag=><label key={flag} className="flex items-start gap-2">
     <input type="checkbox" name="flag" value={flag} defaultChecked={flags.includes(flag)} className="mt-1"
      onChange={e=>{const on=e.currentTarget.checked;setSelected(cur=>on?[...cur,flag]:cur.filter(v=>v!==flag));}}/>
     <span><span className="font-semibold text-red-700">[{PROBLEM_FLAG_LABELS[flag]}]</span> <span className="text-neutral-600">{PROBLEM_FLAG_HINTS[flag]}</span></span>
    </label>)}
   </fieldset>
   <label className="flex items-start gap-2 text-sm">
    <input type="checkbox" name="lock_released" defaultChecked={lockReleased} disabled={!selected.length||!sameAsSaved} className="mt-1"/>
    <span>최종 해제 승인 (입주완료 처리 허용){selected.length&&!sameAsSaved?<span className="block text-xs text-neutral-600">사유를 바꾸면 먼저 저장한 뒤 해제 승인할 수 있습니다.</span>:null}</span>
   </label>
   <label className="flex flex-col text-sm">관리 메모
    <input type="text" name="note" maxLength={200} defaultValue={note??''} placeholder="예: 2026-10 채권자 ○○ 가압류 등기 확인" className="border px-2 py-1"/>
   </label>
   <label className="flex flex-col text-sm">변경 사유
    <input type="text" name="reason" maxLength={200} placeholder="예: 법무팀 통보, 해제 공문 확인" className="border px-2 py-1"/>
   </label>
   <div className="flex flex-wrap gap-2">
    <button type="submit" disabled={disabled} className="border border-red-700 bg-red-100 px-3 py-1 text-red-800">{pending?'저장 중…':problem?'문제세대 저장':'문제세대 지정'}</button>
    {problem?<button type="button" disabled={disabled} onClick={e=>{const form=e.currentTarget.form;if(form)void submit([],false,form);}} className="border border-neutral-700 px-3 py-1">문제세대 해제</button>:null}
   </div>
  </form>
  {error?<p role="alert" className="mt-2 text-sm text-red-700">{error}</p>:null}
 </section>;
}
