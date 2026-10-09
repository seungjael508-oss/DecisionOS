import Link from "next/link";
import { processingStatusLabel } from "@/lib/move-in/special-case";
import {
  OCCUPANCY_INTENT_LABELS,
  formatDateTime,
  formatUnitLabel,
} from "@/lib/move-in/labels";
import {
  CONSENT_STATUS_LABELS,
  DEAL_STATUS_LABELS,
  type DealTab,
  type DealListRow,
} from "@/lib/move-in/deals";
import { FUNDING_STATUS_LABELS, OPERATIONAL_INTENT_LABELS } from "@/lib/move-in/labels";
import { SPECIAL_REASON_LABELS } from "@/lib/move-in/intent";

function yn(value: boolean) {
  return value ? "Y" : "—";
}

function money(value: number | null | undefined) {
  return value == null ? "—" : `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}

function listingStatus(value: string | null | undefined) {
  return value === "NOT_LISTED" ? "미등록" : value === "PREPARING" ? "등록 준비" : value === "LISTED" ? "등록 중" : value === "PAUSED" ? "보류" : "—";
}

export function DealTable({
  projectId,
  rows,
  tab,
  returnTo,
}: {
  projectId: string;
  rows: DealListRow[];
  tab?: DealTab;
  returnTo?: string;
}) {
  const displayTab = tab ?? "sale";
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-neutral-300">
            <th className="py-2 pr-3 font-medium">동호수</th>
            <th className="py-2 pr-3 font-medium">계약자</th>
            <th className="py-2 pr-3 font-medium">현재등급</th>
            <th className="py-2 pr-3 font-medium">{tab === undefined ? "입주의향" : displayTab === "special" ? "최종의향" : displayTab === "rental" ? "전세/월세" : "매매의향"}</th>
            {displayTab === "special" && tab !== undefined ? <th className="py-2 pr-3 font-medium">특별관리 사유</th> : null}
            {displayTab === "special" && tab !== undefined ? <th className="py-2 pr-3 font-medium">자금상태</th> : null}
            {displayTab === "special" && tab !== undefined ? <><th className="py-2 pr-3 font-medium">수동관리</th><th className="py-2 pr-3 font-medium">처리상태</th></> : null}
            {displayTab === "sale" && tab !== undefined ? <><th className="py-2 pr-3 font-medium">희망매도가</th><th className="py-2 pr-3 font-medium">매물등록</th></> : null}
            {displayTab === "rental" && tab !== undefined ? <><th className="py-2 pr-3 font-medium">보증금</th><th className="py-2 pr-3 font-medium">월세</th><th className="py-2 pr-3 font-medium">매물등록</th></> : null}
            {tab !== undefined ? <><th className="py-2 pr-3 font-medium">마지막 접촉일</th><th className="py-2 pr-3 font-medium">다음 접촉일</th></> : null}
            {displayTab === "special" && tab !== undefined ? <th className="py-2 pr-3 font-medium">담당자</th> : null}
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
                  href={`/projects/${projectId}/move-in/units/${row.unitId}?returnTo=${encodeURIComponent(returnTo ?? `/projects/${projectId}/move-in/deals`)}`}
                  className="underline"
                >
                  {formatUnitLabel(row.buildingNo, row.unitNo)}
                </Link>
              </td>
              <td className="py-2 pr-3">{row.customerName ?? "—"}</td>
              <td className="py-2 pr-3">{row.latestGrade ?? "미확인"}</td>
              <td className="py-2 pr-3">
                {tab === undefined ? (row.occupancyIntent ? OCCUPANCY_INTENT_LABELS[row.occupancyIntent] : "—") : displayTab === "special"
                  ? (row.effectiveIntent ? OPERATIONAL_INTENT_LABELS[row.effectiveIntent as keyof typeof OPERATIONAL_INTENT_LABELS] : "—")
                  : tab === "rental"
                    ? (row.rentalType === "JEONSE" ? "전세" : row.rentalType === "MONTHLY_RENT" ? "월세" : row.effectiveIntent === "RENT" ? "임대(유형 확인 필요)" : row.occupancyIntent ? OCCUPANCY_INTENT_LABELS[row.occupancyIntent] : "—")
                    : (row.effectiveIntent === "SALE_TRANSFER" ? "매매" : row.occupancyIntent ? OCCUPANCY_INTENT_LABELS[row.occupancyIntent] : "—")}
              </td>
              {displayTab === "special" && tab !== undefined ? <td className="py-2 pr-3">{(row.specialReasons ?? []).map((reason) => SPECIAL_REASON_LABELS[reason]).join(", ") || "—"}</td> : null}
              {displayTab === "special" && tab !== undefined ? <td className="py-2 pr-3">{row.fundingStatus ? FUNDING_STATUS_LABELS[row.fundingStatus] : "—"}</td> : null}
              {displayTab === "special" && tab !== undefined ? <td className="py-2 pr-3">{row.manuallyFlagged ? "수동지정" : "자동"}{row.visitRequired ? " · 방문" : ""}{row.abandonmentDocumentReceived ? " · 포기각서" : ""}{row.terminationDocumentReceived ? " · 해지서" : ""}{row.legalConsultationRequired ? " · 법무" : ""}</td> : null}
              {displayTab === "special" && tab !== undefined ? <td className="py-2 pr-3">{processingStatusLabel(row.processingStatus ?? "OPEN")}</td> : null}
              {displayTab === "sale" && tab !== undefined ? <><td className="py-2 pr-3">{money(row.typed?.askingSalePriceKrw)}</td><td className="py-2 pr-3">{listingStatus(row.typed?.saleListingStatus)}</td></> : null}
              {displayTab === "rental" && tab !== undefined ? <><td className="py-2 pr-3">{money(row.rentalType === "JEONSE" ? row.typed?.jeonseDepositKrw : row.typed?.monthlyRentDepositKrw)}</td><td className="py-2 pr-3">{row.rentalType === "MONTHLY_RENT" ? money(row.typed?.monthlyRentAmountKrw) : "—"}</td><td className="py-2 pr-3">{listingStatus(row.rentalType === "JEONSE" ? row.typed?.jeonseListingStatus : row.typed?.monthlyRentListingStatus)}</td></> : null}
              {tab !== undefined ? <><td className="py-2 pr-3">{formatDateTime(row.lastContactAt ?? null)}</td><td className="py-2 pr-3">{formatDateTime(row.nextContactAt ?? null)}</td></> : null}
              {displayTab === "special" && tab !== undefined ? <td className="py-2 pr-3">{row.assignedCounselorName ?? "—"}</td> : null}
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
