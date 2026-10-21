import { Suspense } from "react";
import Link from "next/link";
import { TodayFilters } from "@/components/move-in/today-filters";
import { QueryError } from "@/components/move-in/status-copy";
import { TodayNoticeGate, TodayQueueView } from "@/components/move-in/today-queue-view";
import { formatDateTime, formatUnitLabel } from "@/lib/move-in/labels";
import { loadFieldMemberNames, loadMoveInTodayQueueRows, loadOpenMoveInVisitTargets } from "@/lib/move-in/queries";
import { getProblemUnitPresentation } from "@/lib/move-in/problem-unit-presentation";
import { buildMoveInPathWithSearch } from "@/lib/move-in/return-to";
import { D_GRADE_REASONS, D_GRADE_REASON_LABELS, summarizeDGradeReasons } from "@/lib/move-in/d-grade-reasons";
import { TodayTaskRetry } from "@/components/move-in/today-task-retry";
import { TODAY_TASK_PENDING_MESSAGE } from "@/lib/move-in/today-task";
import { loadTodayHandled } from "@/lib/move-in/today-task.server";
import { loadLedgerRowsForUnits } from "@/lib/move-in/ledger-queries.server";
import { LEDGER_BLANK, applyLedgerQuery, parseLedgerQuery, type LedgerAxis } from "@/lib/move-in/ledger-filters";
import { LEDGER_COLUMNS, ledgerCells, ledgerOptions } from "@/lib/move-in/ledger-presentation";
import type { LedgerSummaryRow } from "@/lib/move-in/ledger-types";
import { ledgerParamsFromTodayQuery, todayTaskTypesOf, todayTodoText } from "@/lib/move-in/today-workflow";
import type { TodayViewDoneRow, TodayViewRow } from "@/lib/move-in/today-view";
import { startPerfLog } from "@/lib/perf-log";
import { TRADE_FUNDING_FILTER_VALUES, summarizeTradeFunding, tradeFundingSummaryText, tradeFundingTodo } from "@/lib/move-in/trade-funding";

const REASON_LABELS: Record<string, string> = {
  ABSENCE_STREAK: "장기 부재 3회 이상", VISIT_NEEDED: "방문상담 필요", REVISIT_NEEDED: "재방문 필요", VISIT_DONE: "방문 완료",
  D_GRADE_STALE: "D등급 재접촉", C_GRADE_STALE: "C등급 재접촉", NEXT_CONTACT_DUE: "다음 관리일 도래",
  C_GRADE_FUNDING: "C등급 자금관리", ABSENCE_RETRY: "부재 재접촉", SALE_TRACKING: "매도·임대 관리", VISIT_SCHEDULED: "방문 예정",
};
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
  const rawNotice = Array.isArray(query.moveInNotice) ? query.moveInNotice[0] : query.moveInNotice;
  const returnTo = buildMoveInPathWithSearch(`/projects/${projectId}/move-in/today`, query, ["moveInNotice", "taskUnit", "taskNext"]);
  const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? null;
  // 상담 저장 후 완료 처리만 실패한 세대(재시도 안내). 세대 ID는 형식만 확인하고 권한은 완료 RPC가 다시 검증한다.
  const taskUnit = rawNotice === "taskPending" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(one(query.taskUnit) ?? "") ? one(query.taskUnit) : null;
  const taskNextRaw = one(query.taskNext);
  const taskNext = taskNextRaw && !Number.isNaN(Date.parse(taskNextRaw)) ? taskNextRaw : null;
  const now = new Date();
  const perf = startPerfLog("move-in/today-page");
  const [result, visitTargets, handled] = await Promise.all([
    loadMoveInTodayQueueRows(projectId, now),
    loadOpenMoveInVisitTargets(projectId),
    loadTodayHandled(projectId, now),
  ]);
  if (result.error || visitTargets.error) return <QueryError />;
  perf.step("queue");
  // 원장과 같은 행·같은 판정 함수로 표시·필터한다. 오늘 관리대상과 오늘 처리 세대만 읽는다(전체 851세대 아님)
  const queuedUnitIds = new Set(result.rows.map((row) => row.unitId));
  // 오늘 처리했지만 상태가 바뀌어 다시 관리대상이 된 세대는 미처리로만 보인다
  const handledRows = handled.rows.filter((row) => !queuedUnitIds.has(row.unitId));
  const ledger = await loadLedgerRowsForUnits(projectId, [...new Set([...queuedUnitIds, ...handledRows.map((row) => row.unitId)])], now);
  if (ledger.error) return <QueryError />;
  perf.step("ledger");
  const ledgerById = new Map(ledger.rows.map((row) => [row.unitId, row]));
  const assignees = await assigneeNames(projectId, ledger.rows);
  perf.step("assignees");
  const ledgerState = parseLedgerQuery(ledgerParamsFromTodayQuery(query));
  const ledgerMatched = new Set(applyLedgerQuery(ledger.rows, ledgerState, now).filteredSorted.map((row) => row.unitId));
  // 원장 행이 없는 세대(읽는 중 변경 등)는 원장 필터를 판정할 수 없으므로 필터가 없을 때만 보인다
  const anyLedgerFilter = ledgerParamsFromTodayQuery(query).toString() !== "";
  const matchesLedger = (unitId: string) => ledgerMatched.has(unitId) || (!anyLedgerFilter && !ledgerById.has(unitId));
  // 방문상담 대상도 오늘 관리대상에 든 세대만(다음 방문일까지 미룬 세대는 그날 다시 표시)
  const todayVisitTargets = visitTargets.rows.filter((row) => queuedUnitIds.has(row.unitId) && matchesLedger(row.unitId));
  // 서버는 원장 필터만 적용한다. 오늘 필터·D등급 사유·업무 유형은 TodayQueueView가 같은 판정으로 브라우저에서 거른다(재조회 없음)
  const rows = result.rows.filter((row) => matchesLedger(row.unitId));
  const doneRows = handledRows.filter((row) => matchesLedger(row.unitId));
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
  const axisOptions = COMMON_AXES.map(([axis, label]) => ({ axis, label, options: ledgerOptions(ledger.rows, axis, assignees).filter((o) => o.value !== LEDGER_BLANK) }));
  // 원장 표기(등급·의향·전화·담당자)와 같은 셀 함수를 쓴다
  const cell = (unitId: string, column: (typeof LEDGER_COLUMNS)[number]) => {
    const lr = ledgerById.get(unitId);
    return lr ? ledgerCells(lr, assignees)[LEDGER_COLUMNS.indexOf(column)] : "—";
  };
  const handledLabel = (row: (typeof handledRows)[number]) => row.action === "SNOOZE" && row.snoozedUntil
    ? `다음 관리일까지 미룸(${formatDateTime(row.snoozedUntil)})` : "오늘 완료";
  const viewRows: TodayViewRow[] = rows.map((row) => {
    const lr = ledgerById.get(row.unitId);
    const presentation = getProblemUnitPresentation({ problemCategories: row.problemCategories, priority: row.priority, operationalIntent: row.operationalIntent });
    return {
      key: `${row.unitId}:${row.contractId}`, unitId: row.unitId, unitLabel: formatUnitLabel(row.buildingNo ?? "—", row.unitNo ?? "—"),
      customerName: row.customerName ?? null, phone: cell(row.unitId, "전화번호"), grade: cell(row.unitId, "현재등급"),
      intent: cell(row.unitId, "입주의향"), assignee: cell(row.unitId, "담당자"), reasonText: reasonText(row), todoText: todoText(row),
      lastContact: formatDateTime(row.lastContactAt), nextContact: formatDateTime(row.nextContactAt),
      rowClassName: presentation.rowClassName, barClassName: presentation.barClassName,
      reasonCodes: row.reasonCodes, moveInStatus: row.moveInStatus ?? null, legacyGrade: row.legacyGrade ?? null, dGradeReasons: row.dGradeReasons ?? [],
      taskTypes: todayTaskTypesOf(row.reasonCodes, { currentGrade: lr?.currentGrade ?? row.legacyGrade, effectiveIntent: lr?.effectiveIntent ?? null }),
    };
  });
  const viewDoneRows: TodayViewDoneRow[] = doneRows.map((row) => {
    const lr = ledgerById.get(row.unitId);
    return { unitId: row.unitId, unitLabel: lr ? formatUnitLabel(lr.buildingNo, lr.unitNo) : null, customerName: lr?.customerName ?? null,
      grade: cell(row.unitId, "현재등급"), assignee: cell(row.unitId, "담당자"), handledLabel: handledLabel(row), handledAt: formatDateTime(row.handledAt) };
  });
  perf.end({ rows: rows.length });

  return <main className="p-8">
    <h1 className="mb-6 text-2xl font-semibold">오늘 관리대상</h1>
    <Suspense><TodayFilters projectId={projectId} axisOptions={axisOptions} /></Suspense>
    {ledgerState.issues.length ? <p role="status" className="mb-3 text-sm text-red-700">필터 주소를 해석하지 못해 원장 필터 결과가 비어 있습니다. 필터를 다시 선택해 주세요.</p> : null}
    {dSummary.dTotal ? <p className="mb-3 text-xs text-neutral-700" aria-label="오늘 관리대상 D등급 관리사유 집계">오늘 관리대상 D등급 {dSummary.dTotal}세대 · {D_GRADE_REASONS.map((r) => `${D_GRADE_REASON_LABELS[r]} ${dSummary.byReason[r]}`).join(" · ")} · 사유 미확인 {dSummary.unclassified} · 복수 사유 {dSummary.multiple}</p> : null}
    <p className="mb-3 text-xs text-neutral-700" aria-label="오늘 관리대상 C·D 거래 자금유형 집계">오늘 관리대상 C·D 거래 자금유형: {tradeFundingSummaryText(tradeSummary)} · <Link prefetch={false} className="underline" href={tradeLedgerHref}>원장에서 프로젝트 전체 C·D 보기</Link></p>
    {result.dGradeReasonUnavailable?.length ? <p role="status" className="mb-3 text-xs text-red-700">D등급 관리사유 중 {result.dGradeReasonUnavailable.map((r) => D_GRADE_REASON_LABELS[r]).join(" · ")} 근거를 불러오지 못해 해당 사유는 표시하지 않습니다.</p> : null}
    {handled.error ? <p role="status" className="mb-3 text-xs text-red-700">오늘 처리 기록을 불러오지 못해 처리 완료 목록은 표시하지 않습니다(미처리 목록은 정상).</p> : null}
    <Suspense>
      <TodayNoticeGate name="moveInNotice" value="last"><p role="status" className="mb-3 text-sm text-neutral-700">현재 조건의 마지막 세대입니다.</p></TodayNoticeGate>
      {taskUnit ? <TodayNoticeGate name="moveInNotice" value="taskPending"><div role="alert" className="mb-3 flex flex-wrap items-center gap-2 border border-red-300 p-2 text-sm text-red-800">{TODAY_TASK_PENDING_MESSAGE}<TodayTaskRetry projectId={projectId} unitId={taskUnit} nextAt={taskNext} doneHref={returnTo} /></div></TodayNoticeGate> : null}
      <TodayQueueView projectId={projectId} rows={viewRows} doneRows={viewDoneRows} doneError={handled.error} visitTargets={todayVisitTargets} />
    </Suspense>
  </main>;
}
