"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { TodayFilter } from "@/lib/move-in/filters";
import { D_GRADE_REASONS, D_GRADE_REASON_LABELS, parseDGradeReasonParam, type DGradeReason } from "@/lib/move-in/d-grade-reasons";
import { parseLedgerQuery, patchLedgerQuery, type LedgerAxis } from "@/lib/move-in/ledger-filters";
import { QUICK_LEDGER_FILTER_ROWS } from "@/lib/move-in/ledger-presentation";
import { TODAY_ONLY_PARAM_KEYS, TODAY_TASK_TYPES, TODAY_TASK_TYPE_LABELS } from "@/lib/move-in/today-workflow";

const OPTIONS: { value: TodayFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "absence", label: "장기 부재 3회+" },
  { value: "visit", label: "방문상담" },
  { value: "delayed", label: "입주 지연" },
  { value: "funding", label: "자금 위험" },
];

const activeClass = "border border-neutral-900 bg-neutral-900 px-2 py-1 text-white";
const idleClass = "border border-neutral-400 px-2 py-1";

/** 오늘 관리 공통 관리 필터(특별관리·매매/임대·문제세대). 선택지는 서버가 원장과 같은 함수로 만든다. */
export type TodayAxisOptions = { axis: LedgerAxis; label: string; options: { value: string; label: string }[] }[];

export function TodayFilters({ projectId, axisOptions = [] }: { projectId: string; axisOptions?: TodayAxisOptions }) {
  const searchParams = useSearchParams();
  const current = (searchParams.get("filter") ?? "all") as TodayFilter;
  const dReasons = parseDGradeReasonParam(searchParams.getAll("dReason"));
  const task = searchParams.get("task");
  const base = `/projects/${projectId}/move-in/today`;
  const notice = new Set(["moveInNotice", "taskUnit", "taskNext"]);
  // 모든 필터는 서로의 선택을 유지한다(AND). 알림 파라미터만 지운다.
  const href = (edit: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of notice) params.delete(key);
    edit(params);
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  };
  const withFilter = (filter: string) => href((p) => { if (filter === "all") p.delete("filter"); else p.set("filter", filter); });
  const withReasons = (reasons: readonly DGradeReason[]) => href((p) => { if (reasons.length) p.set("dReason", reasons.join(",")); else p.delete("dReason"); });
  const withTask = (value: string | null) => href((p) => { if (value) p.set("task", value); else p.delete("task"); });
  const toggle = (reason: DGradeReason) =>
    D_GRADE_REASONS.filter((r) => (r === reason ? !dReasons.includes(r) : dReasons.includes(r)));
  // 원장 필터 키만 원장 함수로 바꾸고, 오늘 관리 전용 키는 그대로 둔다
  const ledgerOnly = new URLSearchParams([...searchParams.entries()].filter(([key]) => !(TODAY_ONLY_PARAM_KEYS as readonly string[]).includes(key)));
  const ledgerState = parseLedgerQuery(ledgerOnly);
  const axisHref = (axis: LedgerAxis, include: string[]) => {
    const next = patchLedgerQuery(ledgerOnly, { axes: { [axis]: { include, exclude: [] } } });
    for (const [key, value] of searchParams.entries()) if ((TODAY_ONLY_PARAM_KEYS as readonly string[]).includes(key) && !notice.has(key)) next.append(key, value);
    const qs = next.toString();
    return qs ? `${base}?${qs}` : base;
  };
  const selected = (axis: LedgerAxis) => ledgerState.axes[axis]?.include ?? [];

  return (
    <div className="mb-4 flex flex-col gap-2">
      <nav className="flex flex-wrap gap-2" aria-label="오늘 관리대상 필터">
        {OPTIONS.map((option) => {
          const active = current === option.value || (option.value === "all" && !searchParams.get("filter"));
          return (
            <Link prefetch={false} key={option.value} href={withFilter(option.value)} aria-current={active ? "page" : undefined}
              className={active ? activeClass : idleClass}>
              {option.label}
            </Link>
          );
        })}
      </nav>
      <nav className="flex flex-wrap items-center gap-2" aria-label="업무 유형 필터">
        <span className="text-sm text-neutral-700">업무 유형</span>
        <Link prefetch={false} href={withTask(null)} aria-current={task ? undefined : "page"} className={task ? idleClass : activeClass}>전체</Link>
        {TODAY_TASK_TYPES.map((value) => (
          <Link prefetch={false} key={value} href={withTask(task === value ? null : value)} aria-pressed={task === value} className={task === value ? activeClass : idleClass}>
            {TODAY_TASK_TYPE_LABELS[value]}
          </Link>
        ))}
      </nav>
      <nav className="flex flex-wrap items-center gap-2" aria-label="빠른필터">
        <span className="text-sm text-neutral-700">빠른필터</span>
        {QUICK_LEDGER_FILTER_ROWS.flat().map((preset) => {
          const [axis, selection] = Object.entries(preset.patch.axes ?? {})[0] as [LedgerAxis, { include: string[] }];
          const value = selection.include[0];
          const active = selected(axis).includes(value);
          return (
            <Link prefetch={false} key={preset.label} href={axisHref(axis, active ? selected(axis).filter((v) => v !== value) : [value])} aria-pressed={active}
              className={active ? activeClass : idleClass}>
              {preset.label}
            </Link>
          );
        })}
      </nav>
      {axisOptions.map(({ axis, label, options }) => (
        <nav key={axis} className="flex flex-wrap items-center gap-2" aria-label={`${label} 필터`}>
          <span className="text-sm text-neutral-700">{label}</span>
          {options.map((option) => {
            const active = selected(axis).includes(option.value);
            const next = active ? selected(axis).filter((v) => v !== option.value) : [...selected(axis), option.value];
            return (
              <Link prefetch={false} key={option.value} href={axisHref(axis, next)} aria-pressed={active} className={active ? activeClass : idleClass}>
                {option.label}
              </Link>
            );
          })}
        </nav>
      ))}
      <nav className="flex flex-wrap items-center gap-2" aria-label="D등급 관리사유 필터">
        <span className="text-sm text-neutral-700">D등급 관리사유</span>
        <Link prefetch={false} href={withReasons([])} aria-current={dReasons.length ? undefined : "page"} className={dReasons.length ? idleClass : activeClass}>
          선택 안 함
        </Link>
        {D_GRADE_REASONS.map((reason) => {
          const active = dReasons.includes(reason);
          return (
            <Link prefetch={false} key={reason} href={withReasons(toggle(reason))} aria-pressed={active} className={active ? activeClass : idleClass}>
              {D_GRADE_REASON_LABELS[reason]}
            </Link>
          );
        })}
        {dReasons.length ? <span className="text-xs text-neutral-600">D등급 중 선택 사유 하나 이상(복수 선택은 OR)</span> : null}
      </nav>
    </div>
  );
}
