import {
  FUNDING_STATUS_LABELS,
  MOVE_IN_STATUS_LABELS,
  OCCUPANCY_INTENT_LABELS,
  formatDateTime,
  formatUnitLabel,
} from "@/lib/move-in/labels";
import type { CallListRow } from "@/lib/move-in/calls";
import { counselorDisplayName } from "@/lib/move-in/consultation";
import Link from "next/link";

function statusText(value: string | null, labels: Record<string, string>) {
  if (!value) return "미등록";
  return labels[value] ?? value;
}

export function CallTable({
  projectId,
  rows,
  currentMemberId,
}: {
  projectId: string;
  rows: CallListRow[];
  currentMemberId: string;
}) {
  return (
    <>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-neutral-300">
              <th className="py-2 pr-3 font-medium">동호수</th>
              <th className="py-2 pr-3 font-medium">계약자</th>
              <th className="py-2 pr-3 font-medium">전화번호</th>
              <th className="py-2 pr-3 font-medium">담당상담사</th>
              <th className="py-2 pr-3 font-medium">최근등급</th>
              <th className="py-2 pr-3 font-medium">입주의향</th>
              <th className="py-2 pr-3 font-medium">자금상태</th>
              <th className="py-2 pr-3 font-medium">입주진행</th>
              <th className="py-2 pr-3 font-medium">최근상담</th>
              <th className="py-2 font-medium">다음접촉</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.unitId} className="border-b border-neutral-200">
                <td className="py-2 pr-3 font-semibold">
                  <Link
                    href={`/projects/${projectId}/move-in/units/${row.unitId}`}
                    className="underline"
                  >
                    {formatUnitLabel(row.buildingNo, row.unitNo)}
                  </Link>
                </td>
                <td className="py-2 pr-3">{row.customerName ?? "—"}</td>
                <td className="py-2 pr-3">{row.customerPhone ?? "—"}</td>
                <td className="py-2 pr-3">
                  {counselorDisplayName(row.assignedCounselorId, currentMemberId)}
                </td>
                <td className="py-2 pr-3">{row.latestGrade ?? "—"}</td>
                <td className="py-2 pr-3">
                  {statusText(row.occupancyIntent, OCCUPANCY_INTENT_LABELS)}
                </td>
                <td className="py-2 pr-3">
                  {statusText(row.fundingStatus, FUNDING_STATUS_LABELS)}
                </td>
                <td className="py-2 pr-3">
                  {statusText(row.moveInStatus, MOVE_IN_STATUS_LABELS)}
                </td>
                <td className="py-2 pr-3">{formatDateTime(row.lastConsultedAt)}</td>
                <td className="py-2">{formatDateTime(row.nextContactAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((row) => (
          <li key={row.unitId} className="border border-neutral-300 p-4">
            <Link
              href={`/projects/${projectId}/move-in/units/${row.unitId}`}
              className="text-lg font-semibold underline"
            >
              {formatUnitLabel(row.buildingNo, row.unitNo)}
            </Link>
            <p className="mt-1">계약자 {row.customerName ?? "—"}</p>
            <p>전화번호 {row.customerPhone ?? "—"}</p>
            <p>
              담당상담사{" "}
              {counselorDisplayName(row.assignedCounselorId, currentMemberId)}
            </p>
            <p>최근등급 {row.latestGrade ?? "—"}</p>
            <p>
              입주의향 {statusText(row.occupancyIntent, OCCUPANCY_INTENT_LABELS)}
            </p>
            <p>자금상태 {statusText(row.fundingStatus, FUNDING_STATUS_LABELS)}</p>
            <p>입주진행 {statusText(row.moveInStatus, MOVE_IN_STATUS_LABELS)}</p>
            <p>최근상담 {formatDateTime(row.lastConsultedAt)}</p>
            <p>다음접촉 {formatDateTime(row.nextContactAt)}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
