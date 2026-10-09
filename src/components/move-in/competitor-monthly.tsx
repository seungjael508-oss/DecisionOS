"use client";

import { useState } from "react";
import { formatCount } from "@/lib/market/metrics";
import { formatPeriodLabel } from "@/lib/market/labels";
import type { MarketRow } from "@/lib/market/select-latest";

export function CompetitorMonthly({
  complexName,
  history,
}: {
  complexName: string;
  history: MarketRow[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2">
      <button
        type="button"
        className="border border-neutral-400 px-2 py-1 text-sm"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "월별 변화 닫기" : "월별 변화 보기"}
      </button>
      {open ? (
        <table className="mt-2 w-full border-collapse text-left text-sm">
          <caption className="sr-only">{complexName} 월별 변화</caption>
          <thead>
            <tr className="border-b border-neutral-300">
              <th className="py-1 pr-2 font-medium">월</th>
              <th className="py-1 pr-2 font-medium">매매</th>
              <th className="py-1 pr-2 font-medium">전세</th>
              <th className="py-1 pr-2 font-medium">월세</th>
              <th className="py-1 font-medium">거래</th>
            </tr>
          </thead>
          <tbody>
            {history.map((row) => (
              <tr key={row.period} className="border-b border-neutral-200">
                <td className="py-1 pr-2">{formatPeriodLabel(row.period)}</td>
                <td className="py-1 pr-2 tabular-nums">
                  {formatCount(row.saleListingCount)}
                </td>
                <td className="py-1 pr-2 tabular-nums">
                  {formatCount(row.jeonseListingCount)}
                </td>
                <td className="py-1 pr-2 tabular-nums">
                  {formatCount(row.monthlyRentListingCount)}
                </td>
                <td className="py-1 tabular-nums">
                  {formatCount(row.transactionCount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
