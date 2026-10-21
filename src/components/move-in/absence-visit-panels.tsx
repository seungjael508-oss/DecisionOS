"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { recordVisitResult } from "@/app/projects/[projectId]/move-in/today/actions";
import { VISIT_TARGET_STATUS_LABELS } from "@/lib/move-in/absence-visit";
import { OCCUPANCY_INTENT_LABELS, OCCUPANCY_INTENT_VALUES, formatDateTime, formatUnitLabel } from "@/lib/move-in/labels";
import type { MoveInVisitTargetView } from "@/lib/move-in/queries";
import { TodayTaskRetry } from "@/components/move-in/today-task-retry";

// 날짜 입력(YYYY-MM-DD)을 KST 오전 9시 timestamptz로(상담 폼 다음 접촉일과 같은 규칙)
function dateToTimestamptz(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T09:00:00+09:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function gradeLabel(grade: string | null) {
  return grade ?? "미등록";
}

function VisitResultForm({ projectId, target }: { projectId: string; target: MoveInVisitTargetView }) {
  const router = useRouter();
  const busy = useRef(false);
  const [result, setResult] = useState<"VISITED" | "REVISIT_NEEDED">("VISITED");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; message: string; taskPending?: { unitId: string; nextAt: string | null } } | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const form = new FormData(event.currentTarget);
    busy.current = true;
    setPending(true);
    setNotice(null);
    const saved = await recordVisitResult({
      projectId,
      visitTargetId: target.visitTargetId,
      contractId: target.contractId,
      result,
      content: String(form.get("content") ?? ""),
      occupancyIntent: result === "VISITED" ? String(form.get("occupancy_intent") ?? "") || null : null,
      nextVisitAt: result === "REVISIT_NEEDED" ? dateToTimestamptz(String(form.get("next_visit_date") ?? "")) : null,
    });
    setNotice(saved);
    busy.current = false;
    setPending(false);
    if (saved.ok && !("taskPending" in saved && saved.taskPending)) router.refresh();
  }

  return <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
    <label className="flex flex-col text-sm">결과
      <select value={result} onChange={(event) => setResult(event.target.value as typeof result)} className="border border-neutral-400 px-2 py-1 max-md:min-h-11">
        <option value="VISITED">방문 완료(의향 확인)</option>
        <option value="REVISIT_NEEDED">재방문 필요(방문 부재)</option>
      </select>
    </label>
    {result === "VISITED" ? <label className="flex flex-col text-sm">확인한 의향
      <select name="occupancy_intent" defaultValue="" required className="border border-neutral-400 px-2 py-1 max-md:min-h-11">
        <option value="" disabled>선택</option>
        {OCCUPANCY_INTENT_VALUES.map((value) => <option key={value} value={value}>{OCCUPANCY_INTENT_LABELS[value]}</option>)}
      </select>
    </label> : <label className="flex flex-col text-sm">다음 방문일(선택)
      <input type="date" name="next_visit_date" className="border border-neutral-400 px-2 py-1 max-md:min-h-11" />
    </label>}
    <label className="flex min-w-48 flex-1 flex-col text-sm">방문 내용
      <input name="content" required className="border border-neutral-400 px-2 py-1 max-md:min-h-11" />
    </label>
    <button type="submit" disabled={pending} className="border border-neutral-900 bg-neutral-900 px-2 py-1 text-white disabled:opacity-50 max-md:min-h-11 max-md:w-full">{pending ? "저장 중…" : "저장"}</button>
    {notice ? <p role="status" className={`w-full text-sm ${notice.ok ? "text-neutral-800" : "text-red-700"}`}>{notice.message}</p> : null}
    {notice?.taskPending ? <TodayTaskRetry projectId={projectId} unitId={notice.taskPending.unitId} nextAt={notice.taskPending.nextAt} /> : null}
  </form>;
}

/** 진행 중 방문상담 대상. 방문 결과는 기본등급과 별도로 저장된다. */
export function VisitTargetPanel({ projectId, rows, unitHref }: {
  projectId: string;
  rows: MoveInVisitTargetView[];
  unitHref: Record<string, string>;
}) {
  return <section className="mb-8" aria-labelledby="visit-targets-title">
    <h2 id="visit-targets-title" className="mb-2 text-lg font-semibold">방문상담 대상 {rows.length}세대</h2>
    {rows.length === 0 ? <p className="text-sm text-neutral-600">진행 중인 방문상담 대상이 없습니다.</p> :
      <ul className="flex flex-col gap-3">{rows.map((row) => <li key={row.visitTargetId} className="border border-neutral-300 p-3">
        <p className="mb-2 text-sm">
          <Link prefetch={false} className="font-semibold underline" href={unitHref[row.unitId] ?? "#"}>{formatUnitLabel(row.buildingNo ?? "—", row.unitNo ?? "—")}</Link>
          {" "}{row.customerName ?? "—"} · <strong>{VISIT_TARGET_STATUS_LABELS[row.status]}</strong> · 지정 시 연속 부재 {row.absenceStreakAtOpen}회 · 지정 전 등급 {gradeLabel(row.gradeBefore)}
          {row.visitCount > 0 ? ` · 방문 ${row.visitCount}회(최근 ${formatDateTime(row.lastVisitedAt)})` : ""}
        </p>
        <VisitResultForm projectId={projectId} target={row} />
      </li>)}</ul>}
  </section>;
}
