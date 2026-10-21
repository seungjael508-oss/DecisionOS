import { Suspense } from "react";
import Link from "next/link";
import { TodayFilters } from "@/components/move-in/today-filters";
import { EmptyState, QueryError } from "@/components/move-in/status-copy";
import { formatDateTime, formatUnitLabel } from "@/lib/move-in/labels";
import { VisitTargetPanel } from "@/components/move-in/absence-visit-panels";
import { filterTodayQueueRows, loadFieldMemberNames, loadMoveInTodayQueueRows, loadOpenMoveInVisitTargets } from "@/lib/move-in/queries";
import { getProblemUnitPresentation } from "@/lib/move-in/problem-unit-presentation";
import { buildMoveInPathWithSearch, buildMoveInUnitDetailHref } from "@/lib/move-in/return-to";
import { parseTodayQueueFilter, type TodayFilter } from "@/lib/move-in/filters";
import { D_GRADE_REASONS, D_GRADE_REASON_LABELS, matchesDGradeReasonFilter, parseDGradeReasonParam, summarizeDGradeReasons } from "@/lib/move-in/d-grade-reasons";
import { TodayTaskRetry } from "@/components/move-in/today-task-retry";
import { TODAY_TASK_PENDING_MESSAGE } from "@/lib/move-in/today-task";
import { loadTodayHandled } from "@/lib/move-in/today-task.server";
import { loadLedgerRowsForUnits } from "@/lib/move-in/ledger-queries.server";
import { LEDGER_BLANK, applyLedgerQuery, parseLedgerQuery, type LedgerAxis } from "@/lib/move-in/ledger-filters";
import { LEDGER_COLUMNS, ledgerCells, ledgerOptions } from "@/lib/move-in/ledger-presentation";
import type { LedgerSummaryRow } from "@/lib/move-in/ledger-types";
import { ledgerParamsFromTodayQuery, parseTodayTaskType, todayTaskTypesOf, todayTodoText } from "@/lib/move-in/today-workflow";
import { TRADE_FUNDING_FILTER_VALUES, summarizeTradeFunding, tradeFundingSummaryText, tradeFundingTodo } from "@/lib/move-in/trade-funding";

function parseTodayFilter(value: string | string[] | undefined): TodayFilter {
  return parseTodayQueueFilter(Array.isArray(value) ? value[0] : value);
}

const REASON_LABELS: Record<string, string> = {
  ABSENCE_STREAK: "장기 부재 3회 이상", VISIT_NEEDED: "방문상담 필요", REVISIT_NEEDED: "재방문 필요", VISIT_DONE: "방문 완료",
  D_GRADE_STALE: "D등급 재접촉", C_GRADE_STALE: "C등급 재접촉", NEXT_CONTACT_DUE: "다음 관리일 도래",
  C_GRADE_FUNDING: "C등급 자금관리", ABSENCE_RETRY: "부재 재접촉", SALE_TRACKING: "매도·임대 관리", VISIT_SCHEDULED: "방문 예정",
};
const TODAY_COLUMNS = ["동호수", "계약자", "전화번호", "현재등급", "입주의향", "관리사유", "오늘 할 일", "마지막 상담일", "다음 관리일", "담당자", "처리상태"] as const;
// 오늘 관리 공통 관리 필터(D등급 관리사유는 아래 전용 필터). 거래 자금유형은 매매·임대와 AND로 조합된다
const COMMON_AXES: [LedgerAxis, string][] = [["specialReason", "특별관리"], ["deal", "매매·임대"], ["tradeFunding", "거래 자금유형"], ["problemHousehold", "문제세대"]];

async function assigneeNames(projectId: string, rows: readonly LedgerSummaryRow[]) {
  const ids = new Set(rows.map((row) => row.assigneeId).filter((id): id is string => !!id));
  const names: Record<string, string> = {};
  if (!ids.size) return names;
  const members = await loadFieldMemberNames(projectId);
  if (!members.error) for (const member of members.members) if (ids.has(member.memberId) && member.displayName) names[member.memberId] = member.displayName;
  return names;
}

export default async function MoveInTodayPage({ params, searchParams }: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { projectId } = await params;
  const query = await searchParams;
  const filter = parseTodayFilter(query.filter);
  const dReasons = parseDGradeReasonParam(query.dReason);
  const rawNotice = Array.isArray(query.moveInNotice) ? query.moveInNotice[0] : query.moveInNotice;
  const returnTo = buildMoveInPathWithSearch(`/projects/${projectId}/move-in/today`, query, ["moveInNotice", "taskUnit", "taskNext"]);
  const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? null;
  // 상담 저장 후 완료 처리만 실패한 세대(재시도 안내). 세대 ID는 형식만 확인하고 권한은 완료 RPC가 다시 검증한다.
  const taskUnit = rawNotice === "taskPending" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(one(query.taskUnit) ?? "") ? one(query.taskUnit) : null;
  const taskNextRaw = one(query.taskNext);
  const taskNext = taskNextRaw && !Number.isNaN(Date.parse(taskNextRaw)) ? taskNextRaw : null;
  const now = new Date();
  const task = parseTodayTaskType(one(query.task));
  const [result, visitTargets, handled] = await Promise.all([
    loadMoveInTodayQueueRows(projectId, now),
    loadOpenMoveInVisitTargets(projectId),
    loadTodayHandled(projectId, now),
  ]);
  if (result.error || visitTargets.error) return <QueryError />;
  // 원장과 같은 행·같은 판정 함수로 표시·필터한다. 오늘 관리대상과 오늘 처리 세대만 읽는다(전체 851세대 아님)
  const queuedUnitIds = new Set(result.rows.map((row) => row.unitId));
  // 오늘 처리했지만 상태가 바뀌어 다시 관리대상이 된 세대는 미처리로만 보인다
  const handledRows = handled.rows.filter((row) => !queuedUnitIds.has(row.unitId));
  const ledger = await loadLedgerRowsForUnits(projectId, [...new Set([...queuedUnitIds, ...handledRows.map((row) => row.unitId)])], now);
  if (ledger.error) return <QueryError />;
  const ledgerById = new Map(ledger.rows.map((row) => [row.unitId, row]));
  const assignees = await assigneeNames(projectId, ledger.rows);
  const ledgerState = parseLedgerQuery(ledgerParamsFromTodayQuery(query));
  const ledgerMatched = new Set(applyLedgerQuery(ledger.rows, ledgerState, now).filteredSorted.map((row) => row.unitId));
  // 원장 행이 없는 세대(읽는 중 변경 등)는 원장 필터를 판정할 수 없으므로 필터가 없을 때만 보인다
  const anyLedgerFilter = ledgerParamsFromTodayQuery(query).toString() !== "";
  const matchesLedger = (unitId: string) => ledgerMatched.has(unitId) || (!anyLedgerFilter && !ledgerById.has(unitId));
  // 방문상담 대상도 오늘 관리대상에 든 세대만(다음 방문일까지 미룬 세대는 그날 다시 표시)
  const todayVisitTargets = visitTargets.rows.filter((row) => queuedUnitIds.has(row.unitId) && matchesLedger(row.unitId));
  // 기존 필터 AND (D등급 AND 선택 사유 OR) AND 원장 필터 AND 업무 유형
  const rows = filterTodayQueueRows(result.rows, filter)
    .filter((row) => matchesDGradeReasonFilter({ currentGrade: row.legacyGrade, dGradeReasons: row.dGradeReasons }, dReasons))
    .filter((row) => matchesLedger(row.unitId))
    .filter((row) => {
      if (!task) return true;
      const lr = ledgerById.get(row.unitId);
      return task !== "done" && todayTaskTypesOf(row.reasonCodes, { currentGrade: lr?.currentGrade ?? row.legacyGrade, effectiveIntent: lr?.effectiveIntent ?? null }).includes(task);
    });
  // 처리 완료 목록은 업무 필터·D등급 사유 필터가 없을 때(또는 처리 완료 선택 시)만 원장 필터와 함께 보여준다
  const doneRows = handled.error ? [] : handledRows.filter((row) => matchesLedger(row.unitId) && (!task || task === "done") && filter === "all" && !dReasons.length);
  const dSummary = summarizeDGradeReasons(result.rows.map((row) => ({ unitId: row.unitId, currentGrade: row.legacyGrade, dGradeReasons: row.dGradeReasons })));
  // C·D 거래 자금유형 집계는 오늘 관리대상(원장 행, 현재 등급 기준). 프로젝트 전체는 원장 링크로 연다
  const tradeSummary = summarizeTradeFunding(result.rows.flatMap((row) => { const lr = ledgerById.get(row.unitId); return lr ? [lr] : []; }));
  const tradeLedgerHref = `/projects/${projectId}/move-in/ledger?grade=C,D&tradeFunding=${TRADE_FUNDING_FILTER_VALUES.join(",")}`;
  const todoText = (row: (typeof rows)[number]) => {
    const lr = ledgerById.get(row.unitId);
    const trade = lr ? tradeFundingTodo(lr) : null;
    return [todayTodoText(row.reasonCodes), ...(trade ? [trade] : [])].join(" · ");
  };
  const reasonText = (row: (typeof rows)[number]) => [
    ...row.reasonCodes.map((code) => REASON_LABELS[code] ?? code),
    ...(row.legacyGrade === "D" ? [`D 사유: ${row.dGradeReasons?.length ? row.dGradeReasons.map((r) => D_GRADE_REASON_LABELS[r]).join("·") : "미확인"}`] : []),
  ].join(" · ");
  const unitHref = Object.fromEntries(todayVisitTargets
    .map((row) => [row.unitId, buildMoveInUnitDetailHref(projectId, row.unitId, returnTo)]));
  const axisOptions = COMMON_AXES.map(([axis, label]) => ({ axis, label, options: ledgerOptions(ledger.rows, axis, assignees).filter((o) => o.value !== LEDGER_BLANK) }));
  // 원장 표기(등급·의향·전화·담당자)와 같은 셀 함수를 쓴다
  const cell = (unitId: string, column: (typeof LEDGER_COLUMNS)[number]) => {
    const lr = ledgerById.get(unitId);
    return lr ? ledgerCells(lr, assignees)[LEDGER_COLUMNS.indexOf(column)] : "—";
  };
  const handledLabel = (row: (typeof handledRows)[number]) => row.action === "SNOOZE" && row.snoozedUntil
    ? `다음 관리일까지 미룸(${formatDateTime(row.snoozedUntil)})` : "오늘 완료";

  return <main className="p-8">
    <h1 className="mb-6 text-2xl font-semibold">오늘 관리대상</h1>
    <Suspense><TodayFilters projectId={projectId} axisOptions={axisOptions} /></Suspense>
    {ledgerState.issues.length ? <p role="status" className="mb-3 text-sm text-red-700">필터 주소를 해석하지 못해 원장 필터 결과가 비어 있습니다. 필터를 다시 선택해 주세요.</p> : null}
    {dSummary.dTotal ? <p className="mb-3 text-xs text-neutral-700" aria-label="오늘 관리대상 D등급 관리사유 집계">오늘 관리대상 D등급 {dSummary.dTotal}세대 · {D_GRADE_REASONS.map((r) => `${D_GRADE_REASON_LABELS[r]} ${dSummary.byReason[r]}`).join(" · ")} · 사유 미확인 {dSummary.unclassified} · 복수 사유 {dSummary.multiple}</p> : null}
    <p className="mb-3 text-xs text-neutral-700" aria-label="오늘 관리대상 C·D 거래 자금유형 집계">오늘 관리대상 C·D 거래 자금유형: {tradeFundingSummaryText(tradeSummary)} · <Link prefetch={false} className="underline" href={tradeLedgerHref}>원장에서 프로젝트 전체 C·D 보기</Link></p>
    {result.dGradeReasonUnavailable?.length ? <p role="status" className="mb-3 text-xs text-red-700">D등급 관리사유 중 {result.dGradeReasonUnavailable.map((r) => D_GRADE_REASON_LABELS[r]).join(" · ")} 근거를 불러오지 못해 해당 사유는 표시하지 않습니다.</p> : null}
    {handled.error ? <p role="status" className="mb-3 text-xs text-red-700">오늘 처리 기록을 불러오지 못해 처리 완료 목록은 표시하지 않습니다(미처리 목록은 정상).</p> : null}
    {rawNotice === "last" ? <p role="status" className="mb-3 text-sm text-neutral-700">현재 조건의 마지막 세대입니다.</p> : null}
    {taskUnit ? <div role="alert" className="mb-3 flex flex-wrap items-center gap-2 border border-red-300 p-2 text-sm text-red-800">{TODAY_TASK_PENDING_MESSAGE}<TodayTaskRetry projectId={projectId} unitId={taskUnit} nextAt={taskNext} doneHref={returnTo} /></div> : null}
    <p className="mb-3 text-sm text-neutral-700" aria-label="오늘 처리 현황">미처리 {task === "done" ? 0 : rows.length}세대 · 오늘 처리 {doneRows.length}세대</p>
    {task !== "done" && (filter === "visit" || todayVisitTargets.length > 0) ? <VisitTargetPanel projectId={projectId} rows={todayVisitTargets} unitHref={unitHref} /> : null}
    {task === "done" ? null : rows.length === 0 ? <EmptyState>오늘 관리할 세대가 없습니다.</EmptyState> : <>
      <div className="hidden overflow-x-auto md:block"><table className="w-full border-collapse text-left"><thead><tr className="border-b border-neutral-300">
        {TODAY_COLUMNS.map((label) => <th key={label} className="py-2 pr-3 font-medium whitespace-nowrap">{label}</th>)}
      </tr></thead><tbody>{rows.map((row) => {
        const presentation = getProblemUnitPresentation({ problemCategories: row.problemCategories, priority: row.priority, operationalIntent: row.operationalIntent });
        return <tr key={`${row.unitId}:${row.contractId}`} className={`border-b border-neutral-200 ${presentation.rowClassName}`}>
          <td className="border-l-4 py-2 pr-3 font-semibold" style={{ borderLeftColor: "currentColor" }}><span className={`mr-2 inline-block h-3 w-1 ${presentation.barClassName}`} aria-hidden="true"/><Link prefetch={false} className="underline" href={buildMoveInUnitDetailHref(projectId, row.unitId, returnTo)}>{formatUnitLabel(row.buildingNo ?? "—", row.unitNo ?? "—")}</Link></td>
          <td className="py-2 pr-3">{row.customerName ?? "—"}</td>
          <td className="py-2 pr-3 whitespace-nowrap">{cell(row.unitId, "전화번호")}</td>
          <td className="py-2 pr-3">{cell(row.unitId, "현재등급")}</td>
          <td className="py-2 pr-3">{cell(row.unitId, "입주의향")}</td>
          <td className="py-2 pr-3">{reasonText(row)}</td>
          <td className="py-2 pr-3">{todoText(row)}</td>
          <td className="py-2 pr-3">{formatDateTime(row.lastContactAt)}</td>
          <td className="py-2 pr-3">{formatDateTime(row.nextContactAt)}</td>
          <td className="py-2 pr-3">{cell(row.unitId, "담당자")}</td>
          <td className="py-2">미처리</td>
        </tr>;
      })}</tbody></table></div>
  
<ul className="flex flex-col gap-3 md:hidden">
  {rows.map((row) => (
    <li
      key={`${row.unitId}:${row.contractId}`}
      className="border border-neutral-300 p-4"
    >
      <Link
        prefetch={false}
        className="text-lg font-semibold underline"
        href={buildMoveInUnitDetailHref(projectId, row.unitId, returnTo)}
      >
        {formatUnitLabel(row.buildingNo ?? "—", row.unitNo ?? "—")}
      </Link>

      <p>계약자 {row.customerName ?? "—"} · {cell(row.unitId, "전화번호")}</p>
      <p>등급 {cell(row.unitId, "현재등급")} · 의향 {cell(row.unitId, "입주의향")}</p>
      <p>관리사유 {reasonText(row)}</p>
      <p>오늘 할 일 {todoText(row)}</p>
      <p>마지막 상담 {formatDateTime(row.lastContactAt)} · 다음 관리일 {formatDateTime(row.nextContactAt)}</p>
      <p>담당자 {cell(row.unitId, "담당자")} · 미처리</p>
    </li>
  ))}
</ul>

    </>}
    {doneRows.length ? <section className="mt-8" aria-labelledby="today-done-title">
      <h2 id="today-done-title" className="mb-2 text-lg font-semibold">오늘 처리 {doneRows.length}세대</h2>
      <ul className="flex flex-col gap-2">{doneRows.map((row) => {
        const lr = ledgerById.get(row.unitId);
        return <li key={row.unitId} className="border border-neutral-200 p-3 text-sm">
          {lr ? <Link prefetch={false} className="font-semibold underline" href={buildMoveInUnitDetailHref(projectId, row.unitId, returnTo)}>{formatUnitLabel(lr.buildingNo, lr.unitNo)}</Link> : "—"}
          {" "}{lr?.customerName ?? "—"} · {cell(row.unitId, "현재등급")} · 담당 {cell(row.unitId, "담당자")} · <strong>{handledLabel(row)}</strong> · 처리 {formatDateTime(row.handledAt)}
        </li>;
      })}</ul>
    </section> : task === "done" ? <EmptyState>오늘 처리한 세대가 없습니다.</EmptyState> : null}
  </main>;
}
