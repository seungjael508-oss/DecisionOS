"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { VisitTargetPanel } from "@/components/move-in/absence-visit-panels";
import { EmptyState } from "@/components/move-in/status-copy";
import type { MoveInVisitTargetView } from "@/lib/move-in/queries";
import { buildMoveInPathWithSearch, buildMoveInUnitDetailHref } from "@/lib/move-in/return-to";
import { parseTodayViewFilters, selectTodayViewRows, showTodayDoneRows, type TodayViewDoneRow, type TodayViewRow } from "@/lib/move-in/today-view";

const TODAY_COLUMNS = ["동호수", "계약자", "전화번호", "현재등급", "입주의향", "관리사유", "오늘 할 일", "마지막 상담일", "다음 관리일", "담당자", "처리상태"] as const;
const NOTICE_KEYS = ["moveInNotice", "taskUnit", "taskNext"];

/** 서버 알림(마지막 세대·완료 재시도)은 주소에 알림 값이 남아 있을 때만 보인다(화면 필터를 바꾸면 사라짐). */
export function TodayNoticeGate({ name, value, children }: { name: string; value: string; children: ReactNode }) {
  return useSearchParams().get(name) === value ? children : null;
}

/**
 * 오늘 관리대상 목록. 원장 필터는 서버가 적용해 행을 넘기고, 오늘 필터·업무 유형·D등급 사유는
 * 서버 재조회 없이 여기서 같은 판정 함수로 거른다(주소는 필터 버튼이 history로 바꾼다).
 */
export function TodayQueueView({ projectId, rows, doneRows, doneError, visitTargets }: {
  projectId: string;
  rows: TodayViewRow[];
  doneRows: TodayViewDoneRow[];
  doneError: boolean;
  visitTargets: MoveInVisitTargetView[];
}) {
  const searchParams = useSearchParams();
  const view = parseTodayViewFilters(searchParams);
  const query: Record<string, string[]> = {};
  for (const [key, value] of searchParams.entries()) (query[key] ??= []).push(value);
  const returnTo = buildMoveInPathWithSearch(`/projects/${projectId}/move-in/today`, query, NOTICE_KEYS);
  const unitHref = (unitId: string) => buildMoveInUnitDetailHref(projectId, unitId, returnTo);
  const visible = selectTodayViewRows(rows, view);
  const done = !doneError && showTodayDoneRows(view) ? doneRows : [];
  const { filter, task } = view;

  return <>
    <p className="mb-3 text-sm text-neutral-700" aria-label="오늘 처리 현황">미처리 {task === "done" ? 0 : visible.length}세대 · 오늘 처리 {done.length}세대</p>
    {task !== "done" && (filter === "visit" || visitTargets.length > 0)
      ? <VisitTargetPanel projectId={projectId} rows={visitTargets} unitHref={Object.fromEntries(visitTargets.map((row) => [row.unitId, unitHref(row.unitId)]))} />
      : null}
    {task === "done" ? null : visible.length === 0 ? <EmptyState>오늘 관리할 세대가 없습니다.</EmptyState> : <>
      <div className="hidden overflow-x-auto md:block"><table className="w-full border-collapse text-left"><thead><tr className="border-b border-neutral-300">
        {TODAY_COLUMNS.map((label) => <th key={label} className="py-2 pr-3 font-medium whitespace-nowrap">{label}</th>)}
      </tr></thead><tbody>{visible.map((row) => (
        <tr key={row.key} className={`border-b border-neutral-200 ${row.rowClassName}`}>
          <td className="border-l-4 py-2 pr-3 font-semibold" style={{ borderLeftColor: "currentColor" }}><span className={`mr-2 inline-block h-3 w-1 ${row.barClassName}`} aria-hidden="true"/><Link prefetch={false} className="underline" href={unitHref(row.unitId)}>{row.unitLabel}</Link></td>
          <td className="py-2 pr-3">{row.customerName ?? "—"}</td>
          <td className="py-2 pr-3 whitespace-nowrap">{row.phone}</td>
          <td className="py-2 pr-3">{row.grade}</td>
          <td className="py-2 pr-3">{row.intent}</td>
          <td className="py-2 pr-3">{row.reasonText}</td>
          <td className="py-2 pr-3">{row.todoText}</td>
          <td className="py-2 pr-3">{row.lastContact}</td>
          <td className="py-2 pr-3">{row.nextContact}</td>
          <td className="py-2 pr-3">{row.assignee}</td>
          <td className="py-2">미처리</td>
        </tr>
      ))}</tbody></table></div>

      <ul className="flex flex-col gap-3 md:hidden">
        {visible.map((row) => (
          // 카드 전체가 세대 상세 링크(현장 터치 영역 확보)
          <li key={row.key} className={row.rowClassName}>
            <Link prefetch={false} href={unitHref(row.unitId)} className="flex gap-3 border border-neutral-300 p-4 active:bg-neutral-100">
              <span className={`w-1 shrink-0 self-stretch ${row.barClassName}`} aria-hidden="true"/>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-lg font-semibold underline">{row.unitLabel}</span>
                  <span className="shrink-0 text-sm">등급 {row.grade}</span>
                </span>
                <span className="block">{row.customerName ?? "—"} · {row.phone}</span>
                <span className="mt-1 block text-sm font-medium">오늘 할 일 {row.todoText}</span>
                <span className="block text-sm text-neutral-700">관리사유 {row.reasonText}</span>
                <span className="block text-sm text-neutral-700">의향 {row.intent} · 다음 관리일 {row.nextContact}</span>
                <span className="block text-sm text-neutral-700">마지막 상담 {row.lastContact} · 담당 {row.assignee} · 미처리</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>}
    {done.length ? <section className="mt-8" aria-labelledby="today-done-title">
      <h2 id="today-done-title" className="mb-2 text-lg font-semibold">오늘 처리 {done.length}세대</h2>
      <ul className="flex flex-col gap-2">{done.map((row) => (
        <li key={row.unitId} className="border border-neutral-200 p-3 text-sm">
          {row.unitLabel ? <Link prefetch={false} className="font-semibold underline" href={unitHref(row.unitId)}>{row.unitLabel}</Link> : "—"}
          {" "}{row.customerName ?? "—"} · {row.grade} · 담당 {row.assignee} · <strong>{row.handledLabel}</strong> · 처리 {row.handledAt}
        </li>
      ))}</ul>
    </section> : task === "done" ? <EmptyState>오늘 처리한 세대가 없습니다.</EmptyState> : null}
  </>;
}
