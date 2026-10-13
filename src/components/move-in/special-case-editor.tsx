"use client";

import {useUnitSave} from './unit-save-context';
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { saveMoveInSpecialCase, type SaveMoveInSpecialCaseInput } from "@/app/projects/[projectId]/move-in/deals/actions";
import type { MoveInRole } from "@/lib/move-in/access";
import {
  LEGAL_CONSULTATION_STATUS_VALUES,
  legalConsultationStatusLabel,
  processingStatusLabel,
  PROCESSING_STATUS_VALUES,
  SPECIAL_CASE_MANUAL_FLAG_MESSAGE,
  hasActiveManualMetadata,
  type SpecialCaseMetadata,
} from "@/lib/move-in/special-case";

const emptyMetadata: SpecialCaseMetadata = {
  manuallyFlagged: false,
  visitRequired: false,
  abandonmentDocumentReceived: false,
  terminationDocumentReceived: false,
  legalConsultationRequired: false,
  legalConsultationStatus: "NOT_REQUIRED",
  processingStatus: "OPEN",
  memo: "",
};

export function SpecialCaseEditor({
  projectId,
  unitId,
  contractId,
  currentCustomerId,
  returnTo,
  role,
  reasons,
  specialCase,
  saveDisabled = false,
}: {
  projectId: string;
  unitId: string;
  contractId: string;
  currentCustomerId: string;
  returnTo: string;
  role: MoveInRole;
  reasons: readonly string[];
  specialCase: SpecialCaseMetadata | null;
  saveDisabled?: boolean;
}) {
  const router = useRouter();
  const saving=useUnitSave(),submitting=useRef(false);
  const initial = specialCase ?? emptyMetadata;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // This is presentation gating only. The server action repeats the role check.
  const canEdit = role === "PROJECT_ADMIN" || role === "CLIENT_MANAGER";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saveDisabled||submitting.current||saving?.busy||saving?.blocked) return;
    const form = new FormData(event.currentTarget);
    const metadata: SpecialCaseMetadata = {
      manuallyFlagged: form.get("manually_flagged") === "1",
      visitRequired: form.get("visit_required") === "1",
      abandonmentDocumentReceived: form.get("abandonment_document_received") === "1",
      terminationDocumentReceived: form.get("termination_document_received") === "1",
      legalConsultationRequired: form.get("legal_consultation_required") === "1",
      legalConsultationStatus: String(form.get("legal_consultation_status") ?? "NOT_REQUIRED"),
      processingStatus: String(form.get("processing_status") ?? "OPEN"),
      memo: String(form.get("memo") ?? ""),
    };
    if (!metadata.manuallyFlagged && hasActiveManualMetadata(metadata)) {
      setError(SPECIAL_CASE_MANUAL_FLAG_MESSAGE);
      return;
    }
    submitting.current=true;
    setPending(true);
    setError(null);
    const input: SaveMoveInSpecialCaseInput = {
      ...metadata,
      projectId,
      unitId,
      contractId,
      currentCustomerId,
      returnTo,
    };
    const result=await (saving?saving.save({kind:'special',input},'stay',()=>setError(null)):saveMoveInSpecialCase(input))
      .catch(()=>({ok:false as const})).finally(()=>{submitting.current=false;setPending(false);});
    if(!result.ok){setError('message' in result && typeof result.message==='string' ? result.message : '특별관리 정보를 저장하지 못했습니다.');return;}
    if(!saving&&'returnTo' in result&&typeof result.returnTo==='string')router.push(result.returnTo);
  }

  return (
    <section className="mt-10 border border-neutral-300 p-4">
      <h2 className="text-lg font-semibold">특별관리</h2>
      <div className="mt-2 flex flex-wrap gap-2" aria-label="자동 특별관리 사유">
        {reasons.length ? reasons.map((reason) => (
          <span key={reason} className="border border-amber-500 bg-amber-50 px-2 py-1 text-sm">{reason}</span>
        )) : <span className="text-sm text-neutral-600">자동 사유 없음</span>}
      </div>
      {!canEdit ? (
        <div className="mt-3 text-sm text-neutral-700">
          <p className="text-neutral-600">읽기 전용</p>
          <dl className="mt-2 grid max-w-xl grid-cols-[12rem_1fr] gap-y-1">
            <dt>수동 지정</dt><dd>{initial.manuallyFlagged ? "예" : "아니오"}</dd>
            <dt>방문 필요</dt><dd>{initial.visitRequired ? "예" : "아니오"}</dd>
            <dt>포기각서 수령</dt><dd>{initial.abandonmentDocumentReceived ? "예" : "아니오"}</dd>
            <dt>해지신청서 수령</dt><dd>{initial.terminationDocumentReceived ? "예" : "아니오"}</dd>
            <dt>법무 협의 필요</dt><dd>{initial.legalConsultationRequired ? "예" : "아니오"}</dd>
            <dt>법무 협의 상태</dt><dd>{legalConsultationStatusLabel(initial.legalConsultationStatus)}</dd>
            <dt>처리상태</dt><dd>{processingStatusLabel(initial.processingStatus)}</dd>
            <dt>메모</dt><dd>{initial.memo || "—"}</dd>
          </dl>
        </div>
      ) : null}
      {canEdit ? (
        <form className="mt-4 grid max-w-xl gap-3" onSubmit={onSubmit} onChange={()=>saving?.markDirty('special')}>
          <fieldset disabled={pending || saveDisabled || saving?.busy || saving?.blocked} className="grid gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="manually_flagged" value="1" defaultChecked={initial.manuallyFlagged} aria-label="수동 지정" />
            수동 지정
          </label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="visit_required" value="1" defaultChecked={initial.visitRequired} />방문 필요</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="abandonment_document_received" value="1" defaultChecked={initial.abandonmentDocumentReceived} />포기각서 수령</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="termination_document_received" value="1" defaultChecked={initial.terminationDocumentReceived} />해지신청서 수령</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="legal_consultation_required" value="1" defaultChecked={initial.legalConsultationRequired} />법무 협의 필요</label>
          <label className="flex flex-col gap-1 text-sm">법무 협의 상태
            <select name="legal_consultation_status" defaultValue={initial.legalConsultationStatus} className="border border-neutral-400 px-2 py-1">
              {LEGAL_CONSULTATION_STATUS_VALUES.map((value) => <option key={value} value={value}>{legalConsultationStatusLabel(value)}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">처리상태
            <select name="processing_status" defaultValue={initial.processingStatus} className="border border-neutral-400 px-2 py-1">
              {PROCESSING_STATUS_VALUES.map((value) => <option key={value} value={value}>{processingStatusLabel(value)}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">메모
            <textarea name="memo" defaultValue={initial.memo} maxLength={2000} rows={4} className="border border-neutral-400 px-2 py-1" />
          </label>
          {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
          <button type="submit" disabled={pending || saveDisabled} className="w-fit border border-neutral-800 px-3 py-1">{pending ? "저장 중…" : "특별관리 저장"}</button>
          </fieldset>
        </form>
      ) : null}
    </section>
  );
}
