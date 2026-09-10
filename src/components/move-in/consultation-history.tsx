import {
  CONTACT_TYPE_LABELS,
  formatDateTime,
} from "@/lib/move-in/labels";
import type { ConsultationHistoryRow } from "@/lib/move-in/queries";
import { EmptyState } from "@/components/move-in/status-copy";

export function ConsultationHistory({
  rows,
}: {
  rows: ConsultationHistoryRow[];
}) {
  if (rows.length === 0) {
    return <EmptyState>상담 이력이 없습니다.</EmptyState>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-neutral-300">
            <th className="py-2 pr-3 font-medium">일시</th>
            <th className="py-2 pr-3 font-medium">접촉유형</th>
            <th className="py-2 pr-3 font-medium">상담내용</th>
            <th className="py-2 pr-3 font-medium">담당자</th>
            <th className="py-2 font-medium">다음 액션</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-neutral-200 align-top">
              <td className="py-2 pr-3 whitespace-nowrap">
                {formatDateTime(row.consultedAt)}
              </td>
              <td className="py-2 pr-3">
                {row.contactType
                  ? (CONTACT_TYPE_LABELS[row.contactType] ?? row.contactType)
                  : "—"}
              </td>
              <td className="py-2 pr-3">{row.content}</td>
              <td className="py-2 pr-3">—</td>
              <td className="py-2">{formatDateTime(row.nextActionAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
