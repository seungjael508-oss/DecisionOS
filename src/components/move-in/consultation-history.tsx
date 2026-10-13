import {
  consultationKindLabel,
  counselorDisplayName,
} from "@/lib/move-in/consultation";
import { formatDateTime } from "@/lib/move-in/labels";
import type { ConsultationHistoryRow } from "@/lib/move-in/queries";
import { EmptyState } from "@/components/move-in/status-copy";

export function ConsultationHistory({
  rows,
  currentMemberId,
}: {
  rows: ConsultationHistoryRow[];
  currentMemberId: string;
}) {
  if (rows.length === 0) {
    return <EmptyState>상담 이력이 없습니다.</EmptyState>;
  }

  return (
    <ol className="flex flex-col gap-4">
      {rows.map((row) => {
        const kind = row.legacyImported && !["CALL", "VISIT", "MESSAGE"].includes(row.contactType ?? "") ? "채널 미확인" : consultationKindLabel(row.contactType, row.purpose);
        const grade = row.legacyGrade ? `평가 ${row.legacyGrade}` : "평가 없음";
        return (
          <li key={row.id} className="border-b border-neutral-200 pb-4">
            <p className="font-medium">{formatDateTime(row.consultedAt)}</p>
            <p className="mt-1 text-sm text-neutral-700">
              {row.legacyImported ? `${row.legacyCounselorName || "원본 상담사 미상"} · 이관 기록` : (row.counselorId === currentMemberId ? "나" : `${counselorDisplayName(row.counselorId, currentMemberId)} (${row.counselorId})`)} · {kind} ·{" "}
              {grade}
            </p>
            {row.previousHolder ? <p className="mt-1 text-sm text-neutral-700">이전 계약자 상담</p> : null}
            {row.sourceHolder ? <p className="mt-1 text-sm text-neutral-700">이관 당시 계약자: {row.sourceHolder}</p> : null}
            <p className="mt-2 whitespace-pre-wrap">{row.content}</p>
          </li>
        );
      })}
    </ol>
  );
}
