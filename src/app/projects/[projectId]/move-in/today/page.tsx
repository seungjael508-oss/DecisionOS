import { Suspense } from "react";
import Link from "next/link";
import { TodayFilters } from "@/components/move-in/today-filters";
import { EmptyState, QueryError } from "@/components/move-in/status-copy";
import { FUNDING_STATUS_LABELS, MOVE_IN_STATUS_LABELS, OPERATIONAL_INTENT_LABELS, formatDateTime, formatUnitLabel } from "@/lib/move-in/labels";
import { filterTodayQueueRows, loadMoveInTodayQueueRows } from "@/lib/move-in/queries";
import { getProblemUnitPresentation } from "@/lib/move-in/problem-unit-presentation";
import { buildMoveInPathWithSearch, buildMoveInUnitDetailHref } from "@/lib/move-in/return-to";
import type { TodayFilter } from "@/lib/move-in/filters";

function parseTodayFilter(value: string | string[] | undefined): TodayFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "next_contact" || raw === "delayed" || raw === "funding" || raw === "all" ? raw : "all";
}

const REASON_LABELS: Record<string, string> = {
  FOLLOW_UP_DUE: "다음 접촉 도래", D_GRADE_STALE: "D등급 재접촉", C_GRADE_STALE: "C등급 재접촉",
  C_GRADE_FUNDING: "C등급 자금관리", ABSENCE_RETRY: "부재 재접촉", SALE_TRACKING: "매도·임대 관리", VISIT_SCHEDULED: "방문 예정",
};

export default async function MoveInTodayPage({ params, searchParams }: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { projectId } = await params;
  const query = await searchParams;
  const filter = parseTodayFilter(query.filter);
  const rawNotice = Array.isArray(query.moveInNotice) ? query.moveInNotice[0] : query.moveInNotice;
  const returnTo = buildMoveInPathWithSearch(`/projects/${projectId}/move-in/today`, query, ["moveInNotice"]);
  const result = await loadMoveInTodayQueueRows(projectId);
  if (result.error) return <QueryError />;
  const rows = filterTodayQueueRows(result.rows, filter);

  return <main className="p-8">
    <h1 className="mb-6 text-2xl font-semibold">오늘 관리대상</h1>
    <Suspense><TodayFilters projectId={projectId} /></Suspense>
    {rawNotice === "last" ? <p role="status" className="mb-3 text-sm text-neutral-700">현재 조건의 마지막 세대입니다.</p> : null}
    {rows.length === 0 ? <EmptyState>오늘 관리할 세대가 없습니다.</EmptyState> : <>
      <div className="hidden overflow-x-auto md:block"><table className="w-full border-collapse text-left"><thead><tr className="border-b border-neutral-300">
        <th className="py-2 pr-3 font-medium">동호수</th><th className="py-2 pr-3 font-medium">계약자</th><th className="py-2 pr-3 font-medium">이유</th><th className="py-2 pr-3 font-medium">최종의향</th><th className="py-2 pr-3 font-medium">최근접촉</th><th className="py-2 pr-3 font-medium">다음접촉</th><th className="py-2 font-medium">상태</th>
      </tr></thead><tbody>{rows.map((row) => {
        const presentation = getProblemUnitPresentation({ problemCategories: row.problemCategories, priority: row.priority, operationalIntent: row.operationalIntent });
        return <tr key={`${row.unitId}:${row.contractId}`} className={`border-b border-neutral-200 ${presentation.rowClassName}`}>
          <td className="border-l-4 py-2 pr-3 font-semibold" style={{ borderLeftColor: "currentColor" }}><span className={`mr-2 inline-block h-3 w-1 ${presentation.barClassName}`} aria-hidden="true"/><Link className="underline" href={buildMoveInUnitDetailHref(projectId, row.unitId, returnTo)}>{formatUnitLabel(row.buildingNo ?? "—", row.unitNo ?? "—")}</Link></td>
          <td className="py-2 pr-3">{row.customerName ?? "—"}</td><td className="py-2 pr-3">{row.reasonCodes.map((code) => REASON_LABELS[code] ?? code).join(" · ")}</td>
          <td className="py-2 pr-3">{row.operationalIntent ? <span className="border border-current px-1 text-sm">{OPERATIONAL_INTENT_LABELS[row.operationalIntent]}</span> : "—"}</td>
          <td className="py-2 pr-3">{formatDateTime(row.lastContactAt)}</td><td className="py-2 pr-3">{formatDateTime(row.nextContactAt)}</td><td className="py-2">{[row.moveInStatus ? MOVE_IN_STATUS_LABELS[row.moveInStatus as keyof typeof MOVE_IN_STATUS_LABELS] : null, row.fundingStatus ? FUNDING_STATUS_LABELS[row.fundingStatus as keyof typeof FUNDING_STATUS_LABELS] : null].filter(Boolean).join(" / ") || "미등록"}</td>
        </tr>;
      })}</tbody></table></div>
      <ul className="flex flex-col gap-3 md:hidden">{rows.map((row) => <li key={`${row.unitId}:${row.contractId}`} className="border border-neutral-300 p-4"><Link className="text-lg font-semibold underline" href={buildMoveInUnitDetailHref(projectId, row.unitId, returnTo)}>{formatUnitLabel(row.buildingNo ?? "—", row.unitNo ?? "—")}</Link><p>계약자 {row.customerName ?? "—"}</p><p>이유 {row.reasonCodes.map((code) => REASON_LABELS[code] ?? code).join(" · ")}</p><p>최종의향 {row.operationalIntent ? OPERATIONAL_INTENT_LABELS[row.operationalIntent] : "—"}</p><p>최근접촉 {formatDateTime(row.lastContactAt)}</p><p>다음접촉 {formatDateTime(row.nextContactAt)}</p></li>)}</ul>
    </>}
  </main>;
}
