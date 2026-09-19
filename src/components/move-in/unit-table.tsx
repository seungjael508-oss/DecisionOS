import { formatDateTime, formatUnitLabel } from "@/lib/move-in/labels";
import type { SortDirection, UnitListRow, UnitSortKey } from "@/lib/move-in/filters";
import { CustomerPhone } from "@/components/move-in/customer-phone";
import Link from "next/link";

function RecentContent({ row }: { row: UnitListRow }) {
  return <div>
    {row.latestPreviousHolder && <span className="text-xs text-neutral-600">이전 계약자 상담</span>}
    <p className="line-clamp-2 whitespace-pre-wrap break-words">{row.latestConsultation ?? "상담 이력 없음"}</p>
  </div>;
}

function sortIndicator(active: boolean, direction: SortDirection) {
  if (!active) return "↕";
  return direction === "asc" ? "↑" : "↓";
}

function SortableHeader({
  label,
  columnKey,
  sortKey,
  sortDirection,
  onSort,
}: {
  label: string;
  columnKey: UnitSortKey;
  sortKey: UnitSortKey;
  sortDirection: SortDirection;
  onSort: (key: UnitSortKey) => void;
}) {
  const active = sortKey === columnKey;
  return (
    <th className="py-2 pr-3 font-medium">
      <button type="button" onClick={() => onSort(columnKey)} className="inline-flex items-center gap-1">
        {label}
        <span aria-hidden="true">{sortIndicator(active, sortDirection)}</span>
      </button>
    </th>
  );
}

export function UnitTable({
  projectId,
  rows,
  sortKey,
  sortDirection,
  onSort,
}: {
  projectId: string;
  rows: UnitListRow[];
  sortKey: UnitSortKey;
  sortDirection: SortDirection;
  onSort: (key: UnitSortKey) => void;
}) {
  const href = (row: UnitListRow) => `/projects/${projectId}/move-in/units/${row.unitId}`;
  return <>
    <p className="mb-3 text-sm text-neutral-600">현재등급은 현재 계약자의 최근 유효 상담평가 기준입니다. 상담 원문과 관리상태는 동호수를 선택해 확인하세요.</p>
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full border-collapse text-left">
        <thead><tr className="border-b border-neutral-300">
          <SortableHeader label="동호수" columnKey="unit" sortKey={sortKey} sortDirection={sortDirection} onSort={onSort} />
          <SortableHeader label="계약자" columnKey="name" sortKey={sortKey} sortDirection={sortDirection} onSort={onSort} />
          <th className="py-2 pr-3 font-medium">전화번호</th>
          <SortableHeader label="현재등급" columnKey="grade" sortKey={sortKey} sortDirection={sortDirection} onSort={onSort} />
          <th className="py-2 pr-3 font-medium">최근상담</th>
          <th className="py-2 pr-3 font-medium">최근접촉</th>
          <th className="py-2 font-medium">다음접촉</th>
        </tr></thead>
        <tbody>{rows.map(row=><tr key={row.unitId} className="border-b border-neutral-200 align-top">
          <td className="py-3 pr-3 whitespace-nowrap"><Link prefetch={false} className="font-semibold underline" href={href(row)}>{formatUnitLabel(row.buildingNo,row.unitNo)}</Link></td>
          <td className="py-3 pr-3">{row.customerName ?? "—"}</td>
          <td className="py-3 pr-3"><CustomerPhone raw={row.customerPhone ?? null} status={row.phoneQuality}/></td>
          <td className="py-3 pr-3">{row.latestGrade ?? "미확인"}</td>
          <td className="max-w-md py-3 pr-3"><RecentContent row={row}/></td>
          <td className="py-3 pr-3">{formatDateTime(row.lastContactAt)}</td>
          <td className="py-3">{formatDateTime(row.nextContactAt)}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <ul className="flex flex-col gap-3 md:hidden">{rows.map(row=><li key={row.unitId} className="border border-neutral-300 p-4">
      <Link prefetch={false} className="text-lg font-semibold underline" href={href(row)}>{formatUnitLabel(row.buildingNo,row.unitNo)}</Link>
      <p>계약자 {row.customerName ?? "—"} · 현재등급 {row.latestGrade ?? "미확인"}</p>
      <CustomerPhone raw={row.customerPhone ?? null} status={row.phoneQuality}/>
      <div className="my-2"><RecentContent row={row}/></div>
      <p>최근접촉 {formatDateTime(row.lastContactAt)}</p><p>다음접촉 {formatDateTime(row.nextContactAt)}</p>
    </li>)}</ul>
  </>;
}
