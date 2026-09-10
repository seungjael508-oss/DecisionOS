import { Suspense } from "react";
import { TodayFilters } from "@/components/move-in/today-filters";
import { EmptyState, QueryError } from "@/components/move-in/status-copy";
import {
  filterTodayRows,
  TODAY_REASON_LABELS,
  todayReasons,
  type TodayFilter,
} from "@/lib/move-in/filters";
import {
  FUNDING_STATUS_LABELS,
  MOVE_IN_STATUS_LABELS,
  formatDateTime,
  formatUnitLabel,
} from "@/lib/move-in/labels";
import { loadUnitRows } from "@/lib/move-in/queries";
import Link from "next/link";

function parseTodayFilter(value: string | string[] | undefined): TodayFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  if (
    raw === "next_contact" ||
    raw === "delayed" ||
    raw === "funding" ||
    raw === "all"
  ) {
    return raw;
  }
  return "all";
}

export default async function MoveInTodayPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { projectId } = await params;
  const query = await searchParams;
  const filter = parseTodayFilter(query.filter);
  const result = await loadUnitRows(projectId);
  if (result.error) return <QueryError />;

  const rows = filterTodayRows(result.rows, filter);

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-semibold">오늘 관리대상</h1>
      <Suspense>
        <TodayFilters projectId={projectId} />
      </Suspense>
      {rows.length === 0 ? (
        <EmptyState>오늘 관리할 세대가 없습니다.</EmptyState>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-neutral-300">
                  <th className="py-2 pr-3 font-medium">동호수</th>
                  <th className="py-2 pr-3 font-medium">계약자</th>
                  <th className="py-2 pr-3 font-medium">이유</th>
                  <th className="py-2 pr-3 font-medium">최근접촉</th>
                  <th className="py-2 pr-3 font-medium">다음접촉</th>
                  <th className="py-2 font-medium">상태</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.unitId} className="border-b border-neutral-200">
                    <td className="py-2 pr-3 font-semibold">
                      <Link
                        className="underline"
                        href={`/projects/${projectId}/move-in/units/${row.unitId}`}
                      >
                        {formatUnitLabel(row.buildingNo, row.unitNo)}
                      </Link>
                    </td>
                    <td className="py-2 pr-3">{row.customerName ?? "—"}</td>
                    <td className="py-2 pr-3">
                      {todayReasons(row)
                        .map((reason) => TODAY_REASON_LABELS[reason])
                        .join(" · ")}
                    </td>
                    <td className="py-2 pr-3">
                      {formatDateTime(row.lastContactAt)}
                    </td>
                    <td className="py-2 pr-3">
                      {formatDateTime(row.nextContactAt)}
                    </td>
                    <td className="py-2">
                      {[
                        row.moveInStatus
                          ? MOVE_IN_STATUS_LABELS[row.moveInStatus]
                          : null,
                        row.fundingStatus
                          ? FUNDING_STATUS_LABELS[row.fundingStatus]
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" / ") || "미등록"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="flex flex-col gap-3 md:hidden">
            {rows.map((row) => (
              <li key={row.unitId} className="border border-neutral-300 p-4">
                <Link
                  className="text-lg font-semibold underline"
                  href={`/projects/${projectId}/move-in/units/${row.unitId}`}
                >
                  {formatUnitLabel(row.buildingNo, row.unitNo)}
                </Link>
                <p>계약자 {row.customerName ?? "—"}</p>
                <p>
                  이유{" "}
                  {todayReasons(row)
                    .map((reason) => TODAY_REASON_LABELS[reason])
                    .join(" · ")}
                </p>
                <p>최근접촉 {formatDateTime(row.lastContactAt)}</p>
                <p>다음접촉 {formatDateTime(row.nextContactAt)}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
