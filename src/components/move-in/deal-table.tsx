import Link from "next/link";
import {
  OCCUPANCY_INTENT_LABELS,
  formatDateTime,
  formatUnitLabel,
} from "@/lib/move-in/labels";
import {
  CONSENT_STATUS_LABELS,
  DEAL_STATUS_LABELS,
  type DealListRow,
} from "@/lib/move-in/deals";

function yn(value: boolean) {
  return value ? "Y" : "—";
}

export function DealTable({
  projectId,
  rows,
}: {
  projectId: string;
  rows: DealListRow[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-neutral-300">
            <th className="py-2 pr-3 font-medium">동호수</th>
            <th className="py-2 pr-3 font-medium">계약자</th>
            <th className="py-2 pr-3 font-medium">입주의향</th>
            <th className="py-2 pr-3 font-medium">거래동의</th>
            <th className="py-2 pr-3 font-medium">거래상태</th>
            <th className="py-2 pr-3 font-medium">매매</th>
            <th className="py-2 pr-3 font-medium">전세</th>
            <th className="py-2 pr-3 font-medium">월세</th>
            <th className="py-2 pr-3 font-medium">배포업소</th>
            <th className="py-2 font-medium">최근수정</th>
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
              <td className="py-2 pr-3">
                {row.occupancyIntent
                  ? OCCUPANCY_INTENT_LABELS[row.occupancyIntent]
                  : "—"}
              </td>
              <td className="py-2 pr-3">
                {row.consentStatus
                  ? CONSENT_STATUS_LABELS[row.consentStatus]
                  : "—"}
              </td>
              <td className="py-2 pr-3">
                {row.dealStatus ? DEAL_STATUS_LABELS[row.dealStatus] : "—"}
              </td>
              <td className="py-2 pr-3">{yn(row.saleEnabled)}</td>
              <td className="py-2 pr-3">{yn(row.jeonseEnabled)}</td>
              <td className="py-2 pr-3">{yn(row.monthlyRentEnabled)}</td>
              <td className="py-2 pr-3">{row.brokerageCount}</td>
              <td className="py-2">{formatDateTime(row.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
