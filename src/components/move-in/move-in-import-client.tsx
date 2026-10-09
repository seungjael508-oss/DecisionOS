"use client";

import { useMemo, useState } from "react";
import {
  analyzeMoveInImport,
  confirmMoveInImport,
} from "@/app/projects/[projectId]/move-in/import/actions";
import { EmptyState } from "@/components/move-in/status-copy";
import {
  FUNDING_STATUS_LABELS,
  MOVE_IN_STATUS_LABELS,
  OCCUPANCY_INTENT_LABELS,
  formatUnitLabel,
} from "@/lib/move-in/labels";
import {
  IMPORT_REASON_LABELS,
  type ClassifiedImportRow,
  type HolderDecision,
  type ImportApplyDecision,
  type ImportPreview,
} from "@/lib/import/types";

const STATUS_LABEL: Record<ClassifiedImportRow["status"], string> = {
  READY: "정상",
  REVIEW_REQUIRED: "확인필요",
  ERROR: "오류",
};

export function MoveInImportClient({ projectId }: { projectId: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [holderRow, setHolderRow] = useState<ClassifiedImportRow | null>(null);
  const [holderDecisions, setHolderDecisions] = useState<Map<number, HolderDecision>>(
    new Map(),
  );
  const [newCustomerRows, setNewCustomerRows] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<{
    applied: number;
    skipped: number;
    failed: number;
    reviewRequired: number;
    error: number;
  } | null>(null);

  const decisions: ImportApplyDecision[] = useMemo(() => {
    const rowNumbers = new Set<number>([
      ...holderDecisions.keys(),
      ...newCustomerRows,
    ]);
    return [...rowNumbers].map((rowNumber) => ({
      rowNumber,
      holderDecision: holderDecisions.get(rowNumber),
      allowNewCustomer: newCustomerRows.has(rowNumber),
    }));
  }, [holderDecisions, newCustomerRows]);

  async function onAnalyze(formData: FormData) {
    setPending(true);
    setMessage(null);
    setResult(null);
    const analyzed = await analyzeMoveInImport(projectId, formData);
    setPending(false);
    if (!analyzed.ok) {
      setPreview(null);
      setMessage(analyzed.message);
      return;
    }
    setPreview(analyzed.preview);
  }

  async function onApply() {
    if (!preview) return;
    setPending(true);
    setMessage(null);
    const applied = await confirmMoveInImport(projectId, preview.rows, decisions);
    setPending(false);
    if (!applied.ok) {
      setMessage(applied.message);
      return;
    }
    setResult(applied);
    if (applied.failed > 0) {
      setMessage("데이터 적용에 실패했습니다. 다시 분석 후 시도해 주세요.");
    }
  }

  return (
    <div>
      <form action={onAnalyze} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          파일
          <input
            type="file"
            name="file"
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            required
            className="border border-neutral-400 px-2 py-1"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="border border-neutral-900 bg-neutral-900 px-3 py-1 text-white disabled:opacity-50"
        >
          {pending ? "분석 중…" : "분석"}
        </button>
      </form>
      <p className="mt-2 text-sm text-neutral-600">xlsx, csv · 최대 2MB · 분석 전에는 DB에 저장하지 않습니다.</p>
      {message ? <p className="mt-3 text-sm text-red-800">{message}</p> : null}

      {preview ? (
        <section className="mt-8">
          <p className="text-lg font-semibold">총 {preview.total}건</p>
          <p className="mt-1">
            정상 {preview.ready} · 확인필요 {preview.reviewRequired} · 오류 {preview.error}
          </p>
          {preview.total === 0 ? (
            <EmptyState>집계할 입주 데이터가 없습니다.</EmptyState>
          ) : (
            <table className="mt-4 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-400 text-left">
                  <th className="py-2">동호수</th>
                  <th className="py-2">Excel 계약자</th>
                  <th className="py-2">현재 계약자</th>
                  <th className="py-2">판정</th>
                  <th className="py-2">확인사유</th>
                  <th className="py-2">상태 후보</th>
                  <th className="py-2"> </th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr key={row.rowNumber} className="border-b border-neutral-200 align-top">
                    <td className="py-2">
                      {row.buildingNo && row.unitNo
                        ? formatUnitLabel(row.buildingNo, row.unitNo)
                        : "—"}
                    </td>
                    <td className="py-2">{row.holderName || "—"}</td>
                    <td className="py-2">{row.currentCustomerName ?? "—"}</td>
                    <td className="py-2">{STATUS_LABEL[row.status]}</td>
                    <td className="py-2">
                      {row.reasons.length > 0
                        ? row.reasons.map((reason) => IMPORT_REASON_LABELS[reason]).join(" · ")
                        : "—"}
                    </td>
                    <td className="py-2 text-neutral-700">
                      <HintText row={row} />
                    </td>
                    <td className="py-2">
                      {row.reasons.includes("HOLDER_CHANGE") ? (
                        <button
                          type="button"
                          className="border border-neutral-800 px-2 py-1"
                          onClick={() => setHolderRow(row)}
                        >
                          명의변경 확인
                        </button>
                      ) : null}
                      {row.reasons.includes("NEW_CUSTOMER_REQUIRED") ? (
                        <button
                          type="button"
                          className="ml-1 border border-neutral-800 px-2 py-1"
                          onClick={() =>
                            setNewCustomerRows((current) => new Set(current).add(row.rowNumber))
                          }
                        >
                          신규 계약자 확인
                        </button>
                      ) : null}
                      {holderDecisions.get(row.rowNumber) === "confirm"
                        ? " · 명의변경 확인"
                        : null}
                      {holderDecisions.get(row.rowNumber) === "not_change"
                        ? " · 명의변경 아님"
                        : null}
                      {newCustomerRows.has(row.rowNumber) ? " · 신규 계약자 확인" : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <button
            type="button"
            className="mt-4 border border-neutral-900 bg-neutral-900 px-3 py-1 text-white disabled:opacity-50"
            disabled={pending}
            onClick={onApply}
          >
            확정 적용
          </button>
        </section>
      ) : null}

      {result ? (
        <p className="mt-6">
          적용 완료 {result.applied} · 확인 대기 {result.reviewRequired} · 오류 {result.error}
        </p>
      ) : null}

      {holderRow ? (
        <HolderChangeDialog
          row={holderRow}
          onCancel={() => setHolderRow(null)}
          onChoose={(decision) => {
            setHolderDecisions((current) => {
              const next = new Map(current);
              next.set(holderRow.rowNumber, decision);
              return next;
            });
            setHolderRow(null);
          }}
        />
      ) : null}
    </div>
  );
}

function HintText({ row }: { row: ClassifiedImportRow }) {
  const parts: string[] = [];
  if (row.occupancyHint.occupancyIntent) {
    parts.push(OCCUPANCY_INTENT_LABELS[row.occupancyHint.occupancyIntent]);
  }
  if (row.occupancyHint.fundingStatus) {
    parts.push(FUNDING_STATUS_LABELS[row.occupancyHint.fundingStatus]);
  }
  if (row.occupancyHint.moveInStatus) {
    parts.push(MOVE_IN_STATUS_LABELS[row.occupancyHint.moveInStatus]);
  }
  if (row.hasConsultationNote) parts.push("상담내용 미리보기만");
  if (row.occupancyHint.needsReview) parts.push("상태 확인 필요");
  if (row.relatedUnits.length > 1) {
    parts.push(`보유세대 ${row.relatedUnits.length}`);
  }
  return <>{parts.length > 0 ? parts.join(" / ") : "—"}</>;
}

function HolderChangeDialog({
  row,
  onCancel,
  onChoose,
}: {
  row: ClassifiedImportRow;
  onCancel: () => void;
  onChoose: (decision: HolderDecision) => void;
}) {
  const canConfirm = Boolean(row.phoneNormalized && row.currentContractId);
  return (
    <div
      role="dialog"
      aria-labelledby="holder-change-title"
      className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="max-w-md border border-neutral-400 bg-white p-6">
        <h2 id="holder-change-title" className="text-lg font-semibold">
          명의변경 확인
        </h2>
        <p className="mt-2">
          {formatUnitLabel(row.buildingNo, row.unitNo)}
        </p>
        <p className="mt-3">현재 계약자 {row.currentCustomerName ?? "—"}</p>
        <p>업로드 계약자 {row.holderName}</p>
        <p className="mt-3 text-sm text-neutral-700">
          기존 계약을 종료하고
          <br />
          신규 명의 계약으로 변경하시겠습니까?
        </p>
        {!canConfirm ? (
          <p className="mt-2 text-sm text-red-800">
            전화번호가 없어 명의변경을 적용할 수 없습니다.
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="border border-neutral-400 px-3 py-1" onClick={onCancel}>
            취소
          </button>
          <button
            type="button"
            className="border border-neutral-800 px-3 py-1"
            onClick={() => onChoose("not_change")}
          >
            명의변경 아님
          </button>
          <button
            type="button"
            className="border border-neutral-900 bg-neutral-900 px-3 py-1 text-white disabled:opacity-50"
            disabled={!canConfirm}
            onClick={() => onChoose("confirm")}
          >
            명의변경 확인
          </button>
        </div>
      </div>
    </div>
  );
}
